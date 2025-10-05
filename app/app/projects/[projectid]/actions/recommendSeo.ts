"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { ensureOwner } from "./_shared";
import OpenAI from "openai";
import { extractKeywordsSimple } from "@/lib/figma";

export async function recommendSeoKeywordsAction(formData: FormData) {
  const pageId = String(formData.get("pageId"));
  const projectId = String(formData.get("projectId"));
  const ok = await ensureOwner(projectId);
  if (!ok) throw new Error("Unauthorized");

  const page = await prisma.page.findUnique({
    where: { id: pageId },
    select: { pageName: true, pageUrl: true, figmaTextContent: true, pageContentKeywords: true },
  });
  if (!page) throw new Error("Page not found");

  const baseText = (page.figmaTextContent || "").slice(0, 8000);
  const seed = (page.pageContentKeywords || []).slice(0, 50);

  if (!baseText && seed.length === 0) {
    await prisma.page.update({
      where: { id: pageId },
      data: { pageDescriptionSummary: null, pageMetaDescription: null, pageSeoKeywords: [] },
    });
    revalidatePath(`/app/projects/${projectId}`);
    return;
  }

  let summary = "", meta = "", keywords: string[] = [];
  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
    const prompt = [
      "You are an SEO expert. Using the provided page text and seed keywords, produce JSON for meta autofill.",
      'Return ONLY JSON: {"summary": string, "metaDescription": string, "keywords": string[] }',
      `Page name: ${page.pageName ?? ""}`,
      `Page URL: ${page.pageUrl ?? ""}`,
      `Seed keywords: ${seed.join(", ") || "(none)"}`,
      "",
      "Page text:", baseText,
    ].join("\n");

    const chat = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.35,
      messages: [
        { role: "system", content: "Return only valid JSON. No extra commentary." },
        { role: "user", content: prompt },
      ],
    });

    const raw = chat.choices?.[0]?.message?.content?.trim() || "{}";
    const s = raw.indexOf("{"), e = raw.lastIndexOf("}");
    const parsed = JSON.parse(s >= 0 && e >= 0 ? raw.slice(s, e + 1) : "{}");
    summary = String(parsed.summary || "").trim();
    meta = String(parsed.metaDescription || "").trim();
    keywords = Array.isArray(parsed.keywords)
      ? parsed.keywords.map((k: any) => String(k).trim().toLowerCase()).filter(Boolean)
      : [];

    if (meta.length > 165) meta = meta.slice(0, 162).replace(/\s+\S*$/, "") + "…";
    keywords = Array.from(new Set(keywords)).slice(0, 20);
    if (!summary) summary = baseText.split(/\.\s+/).slice(0, 2).join(". ").slice(0, 240);
    if (!meta) {
      const base = summary || baseText.slice(0, 220);
      meta = base.slice(0, 155).replace(/\s+\S*$/, "");
      if (meta.length >= 150) meta += "…";
    }
    if (keywords.length === 0) {
      const extra = extractKeywordsSimple(baseText, 12);
      keywords = Array.from(new Set([...(seed.slice(0, 8)), ...extra])).slice(0, 15);
    }
  } catch {
    const extra = extractKeywordsSimple(baseText, 12);
    summary = baseText.split(/\.\s+/).slice(0, 2).join(". ").slice(0, 240);
    let tmp = summary || baseText.slice(0, 220);
    meta = tmp.slice(0, 155).replace(/\s+\S*$/, "");
    if (meta.length >= 150) meta += "…";
    keywords = Array.from(new Set([...(seed.slice(0, 8)), ...extra])).slice(0, 15);
  }

  await prisma.page.update({
    where: { id: pageId },
    data: { pageDescriptionSummary: summary || null, pageMetaDescription: meta || null, pageSeoKeywords: keywords },
  });

  revalidatePath(`/app/projects/${projectId}`);
}
