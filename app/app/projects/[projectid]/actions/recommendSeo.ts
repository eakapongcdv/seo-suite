// app/app/projects/[projectid]/actions/recommendSeo.ts
"use server";

import { prisma } from "@/lib/db";
import { ensureOwner } from "./_shared";
import OpenAI from "openai";
import { extractKeywordsSimple } from "@/lib/figma";
import { z } from "zod";

const OutSchema = z.object({
  recommendedTitle: z.string().max(70).optional().default(""),
  pageDescriptionSummary: z.string().max(400).optional().default(""),
  pageMetaDescription: z.string().max(170).optional().default(""),
  longTailKeywords: z.array(z.string()).max(30).optional().default([]),
});

type OkPayload = z.infer<typeof OutSchema>;

function langFromLocale(locale?: string | null): "en" | "th" | "zh" {
  if (locale === "th") return "th";
  if (locale === "zh-CN") return "zh";
  return "en";
}

function trimAtWord(s: string, max: number, suffix = "…") {
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const sp = cut.lastIndexOf(" ");
  return (sp > 40 ? cut.slice(0, sp) : cut) + suffix;
}

function uniqueNonEmpty(arr: string[], limit: number) {
  return Array.from(new Set(arr.map((s) => s.trim()).filter(Boolean))).slice(0, limit);
}

function ensureLongTail(kws: string[], minWords = 3) {
  return kws.filter((k) => k.split(/\s+/).filter(Boolean).length >= minWords);
}

export async function recommendSeoKeywordsAction(formData: FormData): Promise<
  | { ok: true; data: OkPayload }
  | { ok: false; error: string }
> {
  try {
    const pageId = String(formData.get("pageId") || "");
    const projectId = String(formData.get("projectId") || "");
    if (!pageId || !projectId) return { ok: false, error: "Missing projectId or pageId" };

    const ok = await ensureOwner(projectId);
    if (!ok) return { ok: false, error: "Unauthorized" };

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { targetLocale: true, siteName: true, siteUrl: true },
    });
    if (!project) return { ok: false, error: "Project not found" };

    const preferredKeywordsLanguage =
      (String(formData.get("preferredKeywordsLanguage") || "") as "en" | "th" | "zh") ||
      langFromLocale(project.targetLocale);

    const preferredOutputLanguage =
      (String(formData.get("preferredOutputLanguage") || "") as "en" | "th" | "zh") ||
      langFromLocale(project.targetLocale);

    // ⬇️ เลือกเฉพาะฟิลด์ที่มีจริงใน schema
    const page = await prisma.page.findUnique({
      where: { id: pageId },
      select: {
        pageName: true,
        pageUrl: true,
        pageDescriptionSummary: true,
        pageMetaDescription: true,
        pageSeoKeywords: true,
        pageContentKeywords: true,
        figmaTextContent: true,
      },
    });
    if (!page) return { ok: false, error: "Page not found" };

    const baseText = (page.figmaTextContent || "").slice(0, 6000);
    const seeds = uniqueNonEmpty([...(page.pageSeoKeywords ?? []), ...(page.pageContentKeywords ?? [])], 50);
    const baseTitle = page.pageName || ""; // เดิมเคย fallback ที่ scrapedTitle/H1
    const baseSummary = page.pageDescriptionSummary || ""; // เดิมเคย fallback scrapedDescription

    const noContext = !baseText && seeds.length === 0 && !baseTitle && !baseSummary;

    let out: OkPayload | null = null;

    if (!noContext && process.env.OPENAI_API_KEY) {
      try {
        const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const sys = [
          "You are an SEO assistant.",
          "Return ONLY valid JSON matching this exact TypeScript-like schema:",
          `{"recommendedTitle": string(<=70), "pageDescriptionSummary": string(<=400), "pageMetaDescription": string(140-160 ideal, <=170 hard), "longTailKeywords": string[]}`,
          "Rules:",
          "- Output language must be exactly the requested output language.",
          "- Keywords language must match the requested keywords language.",
          "- Long-tail keywords must each have at least 3 words and reflect searcher intent.",
          "- No extra commentary. JSON only.",
        ].join("\n");

        const user = [
          `Output language: ${preferredOutputLanguage}`,
          `Keywords language: ${preferredKeywordsLanguage}`,
          `Site: ${project.siteName} (${project.siteUrl})`,
          `Page URL: ${page.pageUrl || "-"}`,
          `Base title: ${trimAtWord(baseTitle, 90) || "-"}`,
          `Base summary: ${trimAtWord(baseSummary, 500) || "-"}`,
          `Seed keywords: ${seeds.join(", ") || "-"}`,
          "",
          "Extracted page text (truncated):",
          baseText || "-",
        ].join("\n");

        const res = await client.chat.completions.create({
          model: "gpt-4o-mini",
          temperature: 0.4,
          response_format: { type: "json_object" } as any,
          messages: [
            { role: "system", content: sys },
            { role: "user", content: user },
          ],
        });

        const raw = res.choices?.[0]?.message?.content?.trim() || "{}";
        const parsed = JSON.parse(raw);
        const safe = OutSchema.safeParse(parsed);
        if (safe.success) out = safe.data;
      } catch {
        // ใช้ fallback ด้านล่าง
      }
    }

    if (!out) {
      const primary =
        seeds[0] || baseTitle || (preferredOutputLanguage === "th" ? "หน้าเว็บไซต์" : preferredOutputLanguage === "zh" ? "页面" : "Webpage");

      const recommendedTitle =
        (preferredOutputLanguage === "th"
          ? `${trimAtWord(primary, 48)} | คู่มือฉบับย่อ`
          : preferredOutputLanguage === "zh"
          ? `${trimAtWord(primary, 48)} | 快速指南`
          : `${trimAtWord(primary, 48)} | Quick Guide`) || "";

      const summary =
        baseSummary ||
        trimAtWord((baseText || "").split(/\.\s+/).slice(0, 2).join(". "), 240) ||
        (preferredOutputLanguage === "th"
          ? "สรุปเนื้อหาหลักของหน้านี้ในรูปแบบเข้าใจง่าย เหมาะสำหรับผู้อ่านใหม่และผู้ที่ต้องการภาพรวมอย่างรวดเร็ว"
          : preferredOutputLanguage === "zh"
          ? "该页面内容的概要，便于新读者或需要快速了解的人掌握重点。"
          : "A concise overview of this page for newcomers and readers who want a quick summary.");

      const metaSeed =
        preferredOutputLanguage === "th"
          ? "อ่านสรุปประเด็นสำคัญ แนวทางปฏิบัติ และเคล็ดลับเชิงลึก ครบถ้วน กระชับ คลิกเพื่อเรียนรู้เพิ่มเติม"
          : preferredOutputLanguage === "zh"
          ? "了解要点、实操建议与深度技巧，内容全面精炼，点击查看更多。"
          : "Key takeaways, practical tips, and deep insights—comprehensive yet concise. Learn more.";

      let pageMetaDescription = trimAtWord(`${primary ? `${primary} — ` : ""}${metaSeed}`, 160);
      if (pageMetaDescription.length > 170) pageMetaDescription = trimAtWord(pageMetaDescription, 170);

      const mined = extractKeywordsSimple(baseText || "", 12);
      let kws = uniqueNonEmpty([...seeds.slice(0, 8), ...mined], 30);
      kws = ensureLongTail(kws, 3);
      if (kws.length === 0 && primary) {
        const mods =
          preferredOutputLanguage === "th"
            ? ["คืออะไร", "ราคา", "ดีอย่างไร", "เปรียบเทียบ", "วิธีใช้งาน", "รีวิว", "สำหรับมือใหม่"]
            : preferredOutputLanguage === "zh"
            ? ["是什么", "价格", "优点", "对比", "怎么用", "测评", "新手入门"]
            : ["what is", "price", "benefits", "comparison", "how to use", "review", "for beginners"];
        kws = mods.map((m) => `${primary} ${m}`).filter((s) => s.split(/\s+/).length >= 3).slice(0, 12);
      }

      out = {
        recommendedTitle,
        pageDescriptionSummary: summary,
        pageMetaDescription,
        longTailKeywords: kws.slice(0, 12),
      };
    }

    const clean = OutSchema.parse({
      ...out,
      recommendedTitle: trimAtWord(out.recommendedTitle || "", 70, ""),
      pageDescriptionSummary: trimAtWord(out.pageDescriptionSummary || "", 400, ""),
      pageMetaDescription: trimAtWord(out.pageMetaDescription || "", 170, ""),
      longTailKeywords: uniqueNonEmpty(ensureLongTail(out.longTailKeywords || [], 3), 30),
    });

    return { ok: true, data: clean };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Failed to generate recommendations" };
  }
}
