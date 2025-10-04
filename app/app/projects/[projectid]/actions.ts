// app/app/projects/[projectid]/actions.ts
"use server";

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

  // ----- Basic fields
  const pageName = formData.get("pageName");
  const pageUrl = formData.get("pageUrl");
  const sortRaw = formData.get("sortNumber");

  // ----- Meta / Summary
  const pageDescriptionSummary = formData.get("pageDescriptionSummary");
  const pageMetaDescription = formData.get("pageMetaDescription");

  // ----- SEO keywords (comma/newline separated)
  const pageSeoKeywordsRaw = formData.get("pageSeoKeywords");

  // ----- Lighthouse scores (0–100)
  const lighthouseSeo = formData.get("lighthouseSeo");
  const lighthousePerf = formData.get("lighthousePerf");
  const lighthouseAccessibility = formData.get("lighthouseAccessibility");

  // สร้าง payload แบบเลือกเติมเฉพาะฟิลด์ที่ถูกส่งมา
  const data: any = {};

  if (pageName !== null) data.pageName = String(pageName).trim();
  if (pageUrl !== null) data.pageUrl = String(pageUrl).trim();

  if (sortRaw !== null) {
    data.sortNumber = Number(sortRaw);
    if (Number.isNaN(data.sortNumber)) data.sortNumber = 0;
  }

  if (pageDescriptionSummary !== null) {
    const v = String(pageDescriptionSummary).trim();
    data.pageDescriptionSummary = v || null;
  }

  if (pageMetaDescription !== null) {
    const v = String(pageMetaDescription).trim();
    data.pageMetaDescription = v || null;
  }

  if (pageSeoKeywordsRaw !== null) {
    const raw = String(pageSeoKeywordsRaw);
    const arr = raw
      .split(/[,;\n]/g)
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    // unique
    data.pageSeoKeywords = Array.from(new Set(arr));
  }

  // helper clamp
  const clamp100 = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

  if (lighthouseSeo !== null) {
    const n = Number(lighthouseSeo);
    data.lighthouseSeo = Number.isNaN(n) ? null : clamp100(n);
  }
  if (lighthousePerf !== null) {
    const n = Number(lighthousePerf);
    data.lighthousePerf = Number.isNaN(n) ? null : clamp100(n);
  }
  if (lighthouseAccessibility !== null) {
    const n = Number(lighthouseAccessibility);
    data.lighthouseAccessibility = Number.isNaN(n) ? null : clamp100(n);
  }

  await prisma.page.update({ where: { id }, data });
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

  // รองรับหลาย node คั่น comma (ใช้ node แรกเป็นหลักสำหรับ text/keywords)
  const nodeIds = figmaNodeIdRaw.split(",").map((s) => s.trim()).filter(Boolean);
  const primaryId = nodeIds[0];

  // normalize/dash ทั้งสองแบบเผื่อ response key ไม่ตรง
  const normalizedPrimaryId =
    primaryId.includes("-") && !primaryId.includes(":") ? primaryId.replace("-", ":") : primaryId;

  const imagesMap = await figmaGetImages(FIGMA_FILE_KEY, nodeIds);
  const dashedPrimaryId = normalizedPrimaryId.replace(":", "-");
  const captureUrl =
    imagesMap[normalizedPrimaryId] || imagesMap[dashedPrimaryId] || imagesMap[primaryId] || "";

  // เพิ่ม log ตามที่ขอ
  console.log("[SYNC] Figma imagesMap:", imagesMap);
  console.log("[SYNC] captureUrl selected:", captureUrl);

  // TEXT & keywords ใช้ node แรก
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

  const baseText = (page.figmaTextContent || "").slice(0, 6000);
  const seed = (page.pageContentKeywords || []).slice(0, 50);

  if (!baseText && seed.length === 0) {
    await prisma.page.update({
      where: { id: pageId },
      data: { pageSeoKeywords: [] },
    });
    revalidatePath(`/app/projects/${projectId}`);
    return;
  }

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
    const jsonStart = raw.indexOf("[");
    const jsonEnd = raw.lastIndexOf("]");
    const jsonSafe = jsonStart >= 0 && jsonEnd >= 0 ? raw.slice(jsonStart, jsonEnd + 1) : "[]";
    const parsed = JSON.parse(jsonSafe);
    recs = Array.isArray(parsed)
      ? parsed.map((s: any) => String(s).trim().toLowerCase()).filter(Boolean)
      : [];
  } catch {
    // fallback: seed + คำเด่นจากข้อความ
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
