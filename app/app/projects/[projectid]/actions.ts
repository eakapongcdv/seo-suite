// app/app/projects/[projectid]/actions.ts
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import {
  figmaGetImages,
  getFigmaNodeDocument,
  collectTextFromNode,
  extractKeywordsSimple,
  FIGMA_FILE_KEY,
} from "@/lib/figma";
import OpenAI from "openai";

// helper ใช้ซ้ำ
async function ensureOwner(projectId: string) {
  const session = await auth();
  if (!session?.user?.id) return null;
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, ownerId: true },
  });
  if (!project || project.ownerId !== session.user.id) return null;
  return project;
}

export async function createPageAction(formData: FormData) {
  "use server";
  const projectId = String(formData.get("projectId"));
  const ok = await ensureOwner(projectId);
  if (!ok) throw new Error("Unauthorized");

  const pageName = String(formData.get("pageName") || "Untitled").trim();
  const pageUrl = String(formData.get("pageUrl") || "/").trim();
  const figmaNodeId = (formData.get("figmaNodeId") as string | null)?.toString().trim() || null;
  const sortNumber = Number(formData.get("sortNumber") ?? 0) || 0;

  await prisma.page.create({
    data: { projectId, pageName, pageUrl, figmaNodeId: figmaNodeId || undefined, sortNumber },
  });

  revalidatePath(`/app/projects/${projectId}`);
}

export async function updatePageAction(formData: FormData) {
  "use server";
  const id = String(formData.get("id"));
  const projectId = String(formData.get("projectId"));
  const ok = await ensureOwner(projectId);
  if (!ok) throw new Error("Unauthorized");

  const pageName = (formData.get("pageName") as string | null)?.toString().trim();
  const pageUrl = (formData.get("pageUrl") as string | null)?.toString().trim();
  const sortRaw = formData.get("sortNumber");
  const sortNumber = sortRaw !== null ? (Number(sortRaw) || 0) : undefined;

  await prisma.page.update({
    where: { id },
    data: {
      ...(pageName !== undefined ? { pageName } : {}),
      ...(pageUrl !== undefined ? { pageUrl } : {}),
      ...(sortNumber !== undefined ? { sortNumber } : {}),
    },
  });

  revalidatePath(`/app/projects/${projectId}`);
}

export async function deletePageAction(formData: FormData) {
  "use server";
  const id = String(formData.get("id"));
  const projectId = String(formData.get("projectId"));
  const ok = await ensureOwner(projectId);
  if (!ok) throw new Error("Unauthorized");

  await prisma.page.delete({ where: { id } });

  revalidatePath(`/app/projects/${projectId}`);
}

export async function syncFigmaAction(formData: FormData) {
  "use server";
  const pageId = String(formData.get("pageId"));
  const projectId = String(formData.get("projectId"));
  const figmaNodeIdRaw = String(formData.get("figmaNodeId") || "").trim();
  if (!figmaNodeIdRaw) throw new Error("Missing figmaNodeId");

  const ok = await ensureOwner(projectId);
  if (!ok) throw new Error("Unauthorized");

  const nodeIds = figmaNodeIdRaw.split(",").map((s) => s.trim()).filter(Boolean);
  const primaryId = nodeIds[0];
  const normalizedPrimaryId =
    primaryId.includes("-") && !primaryId.includes(":") ? primaryId.replace("-", ":") : primaryId;

  const imagesMap = await figmaGetImages(FIGMA_FILE_KEY, nodeIds);
  const dashedPrimaryId = normalizedPrimaryId.replace(":", "-");
  const captureUrl =
    imagesMap[normalizedPrimaryId] || imagesMap[dashedPrimaryId] || imagesMap[primaryId] || "";

  const doc = await getFigmaNodeDocument(primaryId);
  const text = doc ? collectTextFromNode(doc) : "";
  const keywords = text ? extractKeywordsSimple(text, 30) : [];

  await prisma.page.update({
    where: { id: pageId },
    data: {
      figmaNodeId: figmaNodeIdRaw,
      figmaCaptureUrl: captureUrl || undefined,
      figmaCapturedAt: new Date(),
      figmaTextContent: text || undefined,
      pageContentKeywords: keywords,
    },
  });

  revalidatePath(`/app/projects/${projectId}`);
}

/**
 * AI: แนะนำคีย์เวิร์ด SEO จาก figmaTextContent + pageContentKeywords
 * - อัปเดตกลับลง field pageSeoKeywords
 */
export async function recommendSeoKeywordsAction(formData: FormData) {
  "use server";
  const pageId = String(formData.get("pageId"));
  const projectId = String(formData.get("projectId"));
  const ok = await ensureOwner(projectId);
  if (!ok) throw new Error("Unauthorized");

  const page = await prisma.page.findUnique({
    where: { id: pageId },
    select: { figmaTextContent: true, pageContentKeywords: true, pageName: true, pageUrl: true },
  });
  if (!page) throw new Error("Page not found");

  // เตรียม context
  const baseText = (page.figmaTextContent || "").slice(0, 6000);
  const seed = (page.pageContentKeywords || []).slice(0, 50);

  // ถ้าไม่มีข้อความเลย ให้ fallback เป็น seed -> แยกกรองเล็กน้อย
  if (!baseText && seed.length === 0) {
    await prisma.page.update({
      where: { id: pageId },
      data: { pageSeoKeywords: [] },
    });
    revalidatePath(`/app/projects/${projectId}`);
    return;
  }

  // เรียก OpenAI (ต้องตั้ง OPENAI_API_KEY ใน .env)
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

  const prompt = [
    "You are an SEO expert. From the provided page text and seed keywords, produce a concise list of 10-20 SEO keywords/phrases.",
    "Rules:",
    "- Output JSON array of strings only.",
    "- No duplicates. Lowercase. No quotes inside items. No hashtags.",
    "- Prefer 2-4 word phrases mixing head + long-tail.",
    "",
    `Page name: ${page.pageName ?? ""}`,
    `Page URL: ${page.pageUrl ?? ""}`,
    `Seed keywords: ${seed.join(", ")}`,
    "",
    "Page text:",
    baseText,
  ].join("\n");

  let recs: string[] = [];
  try {
    const chat = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Return only valid JSON." },
        { role: "user", content: prompt },
      ],
      temperature: 0.3,
    });

    const raw = chat.choices?.[0]?.message?.content || "[]";
    // ป้องกันเผลอมี text อื่นปน
    const jsonStart = raw.indexOf("[");
    const jsonEnd = raw.lastIndexOf("]");
    const jsonSafe = jsonStart >= 0 && jsonEnd >= 0 ? raw.slice(jsonStart, jsonEnd + 1) : "[]";
    const parsed = JSON.parse(jsonSafe);
    recs = Array.isArray(parsed) ? parsed.map((s: any) => String(s).trim().toLowerCase()).filter(Boolean) : [];
  } catch (e) {
    // fallback: ถ้าพัง ใช้ seed + คำเด่นจากข้อความ
    const fromSeed = seed.slice(0, 10);
    const extra = extractKeywordsSimple(baseText, 10);
    recs = Array.from(new Set([...fromSeed, ...extra])).slice(0, 20);
  }

  await prisma.page.update({
    where: { id: pageId },
    data: { pageSeoKeywords: recs },
  });

  revalidatePath(`/app/projects/${projectId}`);
}
