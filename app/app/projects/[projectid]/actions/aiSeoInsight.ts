"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { ensureOwner } from "./_shared";
import OpenAI from "openai";

export async function aiSeoInsightAction(formData: FormData) {
  const pageId = String(formData.get("pageId") || "");
  const projectId = String(formData.get("projectId") || "");
  if (!pageId || !projectId) throw new Error("Missing pageId or projectId");

  const ok = await ensureOwner(projectId);
  if (!ok) throw new Error("Unauthorized");

  const [project, page] = await Promise.all([
    prisma.project.findUnique({
      where: { id: projectId },
      select: { siteName: true, siteUrl: true, targetLocale: true },
    }),
    prisma.page.findUnique({
      where: { id: pageId },
      select: {
        pageName: true, pageUrl: true,
        pageDescriptionSummary: true, pageMetaDescription: true, pageSeoKeywords: true,
        figmaTextContent: true,
        seoTitlePresent: true, seoTitleLengthOk: true, seoH1Present: true,
        seoCanonicalPresent: true, seoCanonicalSelfReferential: true, seoRobotsNoindex: true,
        seoWordCount: true, seoAltTextCoveragePct: true, seoInternalLinks: true, seoExternalLinks: true,
        lighthousePerf: true, lighthouseSeo: true, lighthouseAccessibility: true,
        realCaptureUrl: true,
      },
    }),
  ]);

  if (!project || !page) throw new Error("Project or Page not found");

  const figmaText = (page.figmaTextContent || "").slice(0, 8000);
  const summary = (page.pageDescriptionSummary || "").slice(0, 1000);
  const metaDesc = (page.pageMetaDescription || "").slice(0, 600);
  const kw = (page.pageSeoKeywords || []).slice(0, 40);

  if (!process.env.OPENAI_API_KEY) {
    await prisma.page.update({
      where: { id: pageId },
      data: { aiSeoInsight: "ไม่พบ OPENAI_API_KEY ในสภาพแวดล้อม จึงไม่สามารถวิเคราะห์ด้วย AI ได้ในตอนนี้" },
    });
    revalidatePath(`/app/projects/${projectId}`);
    return;
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const prompt = [
    "คุณเป็นผู้เชี่ยวชาญ SEO ของ Google (ตอบเป็นภาษาไทย กระชับแต่ชัดเจน พร้อมเช็กลิสต์ที่ลงมือทำได้ทันที).",
    `ไซต์: ${project.siteName || "-"} | ${project.siteUrl || "-"}`,
    `โลเคล: ${project.targetLocale || "-"}`,
    `Page name: ${page.pageName} | URL: ${page.pageUrl}`,
    `Summary: ${summary || "(ไม่มี)"}`,
    `Meta: ${metaDesc || "(ไม่มี)"}`,
    `Keywords: ${kw.join(", ") || "(ยังไม่ได้ตั้ง)"}`,
    "",
    "Figma text:", figmaText || "(ไม่มีข้อมูล)",
    "",
    "Metrics:",
    `Title: ${page.seoTitlePresent ? "yes" : "no"}, lenOK: ${page.seoTitleLengthOk ? "yes" : "no"}, H1: ${page.seoH1Present ? "yes" : "no"}`,
    `Canonical: ${page.seoCanonicalPresent ? "yes" : "no"}, self: ${page.seoCanonicalSelfReferential ? "yes" : "no"}, robots noindex: ${page.seoRobotsNoindex ? "yes" : "no"}`,
    `Words: ${page.seoWordCount ?? "-"}, ALT: ${typeof page.seoAltTextCoveragePct === "number" ? page.seoAltTextCoveragePct + "%" : "-"}`,
    `Internal: ${page.seoInternalLinks ?? 0}, External: ${page.seoExternalLinks ?? 0}`,
    `LH SEO/Perf/A11y: ${typeof page.lighthouseSeo === "number" ? page.lighthouseSeo : "-"} / ${typeof page.lighthousePerf === "number" ? page.lighthousePerf : "-"} / ${typeof page.lighthouseAccessibility === "number" ? page.lighthouseAccessibility : "-"}`,
    "",
    "รูปแบบคำตอบ:",
    "1) คีย์เวิร์ดหลัก (เหตุผลสั้น)",
    "2) ปัญหา/ความเสี่ยง",
    "3) Quick wins",
    "4) เทคนิค",
    "5) ตัวอย่าง Meta Description (หากควรปรับ)",
  ].join("\n");

  try {
    const chat = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.3,
      messages: [
        { role: "system", content: "คุณเป็นผู้ช่วย SEO เชิงปฏิบัติที่ให้คำตอบภาษาไทย อ่านง่าย ทำตามได้จริง" },
        { role: "user", content: prompt },
      ],
    });

    const content = chat.choices?.[0]?.message?.content?.trim() || "";
    await prisma.page.update({
      where: { id: pageId },
      data: { aiSeoInsight: content || "ไม่สามารถสร้างคำแนะนำได้ในขณะนี้" },
    });
  } catch (err: any) {
    await prisma.page.update({
      where: { id: pageId },
      data: { aiSeoInsight: "เกิดข้อผิดพลาดระหว่างวิเคราะห์ด้วย AI: " + (err?.message || String(err)) },
    });
  }

  revalidatePath(`/app/projects/${projectId}`);
}
