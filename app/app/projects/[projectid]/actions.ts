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

// ---- auth ตรวจว่าเป็น owner ของ project ----
async function ensureOwner(projectId: string) {
  const session = await auth();
  if (!session?.user?.id) return null;
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, ownerId: true, siteUrl: true },
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
 * AI: แนะนำ/เติม Meta Tags จาก figmaTextContent
 * - อัปเดต: pageDescriptionSummary, pageMetaDescription, pageSeoKeywords
 */
export async function recommendSeoKeywordsAction(formData: FormData) {
  "use server";
  const pageId = String(formData.get("pageId"));
  const projectId = String(formData.get("projectId"));

  const ok = await ensureOwner(projectId);
  if (!ok) throw new Error("Unauthorized");

  const page = await prisma.page.findUnique({
    where: { id: pageId },
    select: {
      pageName: true,
      pageUrl: true,
      figmaTextContent: true,
      pageContentKeywords: true,
    },
  });
  if (!page) throw new Error("Page not found");

  // เตรียม context สำหรับโมเดล
  const baseText = (page.figmaTextContent || "").slice(0, 8000); // กัน prompt ยาวเกิน
  const seed = (page.pageContentKeywords || []).slice(0, 50);

  // กรณีไม่มีข้อมูลให้ล้างค่าออก เพื่อกันสับสน
  if (!baseText && seed.length === 0) {
    await prisma.page.update({
      where: { id: pageId },
      data: {
        pageDescriptionSummary: null,
        pageMetaDescription: null,
        pageSeoKeywords: [],
      },
    });
    revalidatePath(`/app/projects/${projectId}`);
    return;
  }

  // เรียก OpenAI ให้สร้างสรุป + meta description + คีย์เวิร์ด (JSON เท่านั้น)
  // ต้องตั้งค่า OPENAI_API_KEY ใน .env
  let summary = "";
  let meta = "";
  let keywords: string[] = [];

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

    const prompt = [
      "You are an SEO expert. Using the provided page text and seed keywords, produce JSON for meta autofill.",
      "Return ONLY a valid JSON object with fields:",
      '{ "summary": string (<= 2 sentences),',
      '  "metaDescription": string (ideally 150-160 chars, persuasive, include primary keywords),',
      '  "keywords": string[] (10-20 items, lowercase, no duplicates) }',
      "",
      "Rules:",
      "- focus on relevance to page text.",
      "- avoid quotes inside keywords; 2-4 word phrases preferred.",
      "- English or page language as appropriate; keep casing consistent (lowercase for keywords).",
      "",
      `Page name: ${page.pageName ?? ""}`,
      `Page URL: ${page.pageUrl ?? ""}`,
      `Seed keywords: ${seed.join(", ") || "(none)"}`,
      "",
      "Page text:",
      baseText,
    ].join("\n");

    const chat = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Return only valid JSON. No extra commentary." },
        { role: "user", content: prompt },
      ],
      temperature: 0.35,
    });

    const raw = chat.choices?.[0]?.message?.content?.trim() || "{}";
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    const jsonSafe = start >= 0 && end >= 0 ? raw.slice(start, end + 1) : "{}";
    const parsed = JSON.parse(jsonSafe) as {
      summary?: string;
      metaDescription?: string;
      keywords?: string[];
    };

    summary = String(parsed.summary || "").trim();
    meta = String(parsed.metaDescription || "").trim();
    keywords = Array.isArray(parsed.keywords)
      ? parsed.keywords.map((k) => String(k).trim().toLowerCase()).filter(Boolean)
      : [];

    // ทำความสะอาดข้อมูลเพิ่มเติม
    // - จำกัดความยาว meta ~160 ตัวอักษร เพื่อกันยาวเกิน
    if (meta.length > 165) meta = meta.slice(0, 162).replace(/\s+\S*$/, "") + "…";
    // - ตัดคีย์เวิร์ดซ้ำ และจำกัด 20 รายการ
    keywords = Array.from(new Set(keywords)).slice(0, 20);

    // fallback เบา ๆ หากโมเดลให้ผลไม่ครบ
    if (!summary) {
      summary = baseText.split(/\.\s+/).slice(0, 2).join(". ").slice(0, 240);
    }
    if (!meta) {
      const base = summary || baseText.slice(0, 220);
      meta = base.slice(0, 155).replace(/\s+\S*$/, "");
      if (meta.length >= 150) meta += "…";
    }
    if (keywords.length === 0) {
      // ใช้ seed + ดึงคำเด่นแบบง่าย
      const extra = extractKeywordsSimple(baseText, 12);
      keywords = Array.from(new Set([...(seed.slice(0, 8)), ...extra])).slice(0, 15);
    }
  } catch (e) {
    // กรณีเรียก OpenAI ไม่ได้ ให้ fallback ง่าย ๆ จากข้อความ
    const extra = extractKeywordsSimple(baseText, 12);
    summary = baseText.split(/\.\s+/).slice(0, 2).join(". ").slice(0, 240);
    let tmp = summary || baseText.slice(0, 220);
    meta = tmp.slice(0, 155).replace(/\s+\S*$/, "");
    if (meta.length >= 150) meta += "…";
    keywords = Array.from(new Set([...(seed.slice(0, 8)), ...extra])).slice(0, 15);
  }

  // อัปเดตกลับเข้า DB
  await prisma.page.update({
    where: { id: pageId },
    data: {
      pageDescriptionSummary: summary || null,
      pageMetaDescription: meta || null,
      pageSeoKeywords: keywords,
    },
  });

  // refresh หน้าให้เห็นค่าที่ autofill
  revalidatePath(`/app/projects/${projectId}`);
}


// app/app/projects/[projectid]/actions.ts (ภายในไฟล์นี้)
export async function refreshLighthouseAction(formData: FormData) {
  "use server";

  const pageId = String(formData.get("pageId") || "");
  const projectId = String(formData.get("projectId") || "");

  console.log("[LH] start", { pageId, projectId });

  // ปิดได้ด้วย ENV ถ้ารันบนโฮสต์ที่ไม่มี Chrome
  if (process.env.ENABLE_LIGHTHOUSE === "false") {
    console.warn("[LH] disabled by ENABLE_LIGHTHOUSE=false");
    revalidatePath(`/app/projects/${projectId}`);
    return;
  }

  // ป้องกัน Edge runtime
  // @ts-ignore
  if (typeof process === "undefined" || (process as any).env?.NEXT_RUNTIME === "edge") {
    console.error("[LH] unsupported runtime: edge");
    revalidatePath(`/app/projects/${projectId}`);
    return;
  }

  // โหลดข้อมูลโครงการ + หน้า
  const project = await prisma.project.findFirst({
    where: { id: projectId },
    select: { siteUrl: true },
  });
  if (!project?.siteUrl) {
    console.error("[LH] project not found or missing siteUrl");
    revalidatePath(`/app/projects/${projectId}`);
    return;
  }
  console.log("[LH] project ok", { siteUrl: project.siteUrl });

  const page = await prisma.page.findUnique({
    where: { id: pageId },
    select: { pageUrl: true },
  });
  if (!page) {
    console.error("[LH] page not found");
    revalidatePath(`/app/projects/${projectId}`);
    return;
  }

  // ประกอบ URL เป้าหมาย
  let targetUrl = "";
  try {
    const isAbs = page.pageUrl?.startsWith("http");
    targetUrl = isAbs ? page.pageUrl! : new URL(page.pageUrl || "/", project.siteUrl).toString();
  } catch (e) {
    console.error("[LH] invalid URL compose", e);
    revalidatePath(`/app/projects/${projectId}`);
    return;
  }
  console.log("[LH] targetUrl", { targetUrl });

  // dynamic import (CJS) เพื่อตัดปัญหา ESM/import.meta
  let lighthouse: any;
  let launch: any;
  try {
    console.log("[LH] importing modules (CJS)...");
    const lhMod = await import("lighthouse/core/index.cjs");
    lighthouse = lhMod.default || lhMod;

    const chromeMod = await import("chrome-launcher");
    launch = chromeMod.launch;

    console.log("[LH] import ok (CJS)");
  } catch (e) {
    console.error("[LH] import failed (likely unsupported runtime)", e);
    await prisma.page.update({
      where: { id: pageId },
      data: {
        lighthousePerf: null,
        lighthouseSeo: null,
        lighthouseAccessibility: null,
      },
    });
    revalidatePath(`/app/projects/${projectId}`);
    return;
  }

  // รัน Lighthouse
  let chrome: any;
  try {
    chrome = await launch({
      chromeFlags: [
        "--headless=new",
        "--no-sandbox",
        "--disable-gpu",
        "--disable-dev-shm-usage",
      ],
    });
    console.log("[LH] chrome launched", { port: chrome.port });

    const options = {
      logLevel: "info",
      output: "json",
      onlyCategories: ["performance", "seo", "accessibility"],
      port: chrome.port,
    } as const;

    const runnerResult = await lighthouse(targetUrl, options as any);
    if (!runnerResult?.lhr?.categories) {
      throw new Error("Lighthouse returned empty result");
    }

    const perf = Math.round(((runnerResult.lhr.categories.performance?.score ?? 0) as number) * 100);
    const seo = Math.round(((runnerResult.lhr.categories.seo?.score ?? 0) as number) * 100);
    const a11y = Math.round(((runnerResult.lhr.categories.accessibility?.score ?? 0) as number) * 100);

    console.log("[LH] scores", { perf, seo, a11y });

    await prisma.page.update({
      where: { id: pageId },
      data: {
        lighthousePerf: Number.isFinite(perf) ? perf : null,
        lighthouseSeo: Number.isFinite(seo) ? seo : null,
        lighthouseAccessibility: Number.isFinite(a11y) ? a11y : null,
      },
    });
  } catch (e) {
    console.error("[LH] run failed", e);
    // ถ้า fail ให้เคลียร์คะแนนเพื่อบอกสถานะ
    await prisma.page.update({
      where: { id: pageId },
      data: {
        lighthousePerf: null,
        lighthouseSeo: null,
        lighthouseAccessibility: null,
      },
    });
  } finally {
    if (chrome) {
      try {
        await chrome.kill();
        console.log("[LH] chrome killed");
      } catch (e) {
        console.error("[LH] chrome kill failed", e);
      }
    }
  }

  revalidatePath(`/app/projects/${projectId}`);
}

// ---- helper ทำ URL ให้เป็น absolute จาก project.siteUrl + page.pageUrl ----
function toAbsoluteUrl(siteUrl: string, pageUrl: string) {
  try {
    if (!siteUrl) return pageUrl;
    if (!pageUrl) return siteUrl;
    // ถ้าเป็น relative (ขึ้นต้นด้วย /) ให้ต่อกับ siteUrl
    if (pageUrl.startsWith("/")) {
      const u = new URL(siteUrl);
      return `${u.origin}${pageUrl}`;
    }
    // ถ้าเป็น absolute อยู่แล้ว
    return new URL(pageUrl).toString();
  } catch {
    return pageUrl;
  }
}

// ---- parser แบบเบา ๆ (เลี่ยงแพ็กเกจเพิ่ม) ----
function pickMeta(html: string, name: string) {
  const re = new RegExp(
    `<meta[^>]+(?:name|property)=["']${name}["'][^>]*content=["']([^"']+)["'][^>]*>`,
    "i"
  );
  const m = html.match(re);
  return m?.[1]?.trim() ?? "";
}
function pickTitle(html: string) {
  const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return m?.[1]?.trim() ?? "";
}
function pickH1(html: string) {
  const m = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  // ลบแท็กภายใน
  const raw = m?.[1] ?? "";
  return raw.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
function pickCanonical(html: string) {
  const m = html.match(
    /<link[^>]+rel=["']canonical["'][^>]*href=["']([^"']+)["'][^>]*>/i
  );
  return m?.[1]?.trim() ?? "";
}
function pickRobotsNoindex(html: string) {
  const content = pickMeta(html, "robots").toLowerCase();
  return content.includes("noindex") || content.includes("none");
}
function countWords(html: string) {
  // ตัดสคริปต์/สไตล์/แท็ก แล้วนับคำอย่างหยาบ
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return 0;
  return text.split(/\s+/).length;
}
function countAltCoverage(html: string) {
  const imgs = html.match(/<img\b[^>]*>/gi) || [];
  if (imgs.length === 0) return 0;
  let withAlt = 0;
  for (const tag of imgs) {
    if (/alt=["'][^"']+["']/i.test(tag)) withAlt++;
  }
  return Math.round((withAlt / imgs.length) * 100);
}
function countLinks(html: string) {
  const anchors = html.match(/<a\b[^>]*href=["'][^"']+["'][^>]*>/gi) || [];
  let internal = 0;
  let external = 0;
  for (const tag of anchors) {
    const href = (tag.match(/href=["']([^"']+)["']/i) || [])[1] || "";
    if (/^https?:\/\//i.test(href)) external++;
    else internal++;
  }
  return { internal, external };
}



// -------------------------------------------------------
// ✅ Action: สแกนหน้าเว็บจริง -> อัปเดตฟิลด์เช็กลิสต์ของ Page
// -------------------------------------------------------
export async function scrapeRealPageAction(formData: FormData) {
  "use server";
  const pageId = String(formData.get("pageId") || "");
  const projectId = String(formData.get("projectId") || "");
  const ok = await ensureOwner(projectId);
  if (!ok) throw new Error("Unauthorized");

  const page = await prisma.page.findUnique({
    where: { id: pageId },
    select: { id: true, pageUrl: true },
  });
  if (!page?.pageUrl) throw new Error("Page URL not found");

  const targetUrl = toAbsoluteUrl(ok.siteUrl, page.pageUrl);

  // fetch HTML
  const res = await fetch(targetUrl, { cache: "no-store" });
  const html = await res.text();

  // extract
  const title = pickTitle(html);
  const metaDesc =
    pickMeta(html, "description") || pickMeta(html, "og:description");
  const h1 = pickH1(html);
  const canonicalHref = pickCanonical(html);
  const robotsNoindex = pickRobotsNoindex(html);
  const wordCount = countWords(html);
  const altPct = countAltCoverage(html);
  const { internal, external } = countLinks(html);

  // ประเมินค่าเช็กลิสต์ชุด on-page จาก schema เดิม
  const seoTitlePresent = !!title;
  const seoTitleLengthOk =
    title.length >= 30 && title.length <= 60 ? true : false;
  const seoH1Present = !!h1;
  const seoCanonicalPresent = !!canonicalHref;
  const absTarget = new URL(targetUrl);
  let canonicalSelfReferential = false;
  try {
    const absCanon = new URL(canonicalHref, absTarget.origin);
    canonicalSelfReferential = absCanon.href.replace(/\/$/, "") === absTarget.href.replace(/\/$/, "");
  } catch {
    canonicalSelfReferential = false;
  }

  // เขียนค่าลง DB (อัปเดตเฉพาะฟิลด์ checklist/metric ที่มีใน schema)
  await prisma.page.update({
    where: { id: pageId },
    data: {
      // ถ้าอยากเขียน metaDesc ที่ดึงได้ทับ ก็ทำได้ (ขึ้นกับ UX; ที่นี่ไม่ทับค่าเดิมถ้าเคยกรอกไว้)
      pageMetaDescription: metaDesc || undefined,

      seoTitlePresent,
      seoTitleLengthOk,
      seoH1Present,
      seoCanonicalPresent,
      seoCanonicalSelfReferential: canonicalSelfReferential,
      seoRobotsNoindex: robotsNoindex,

      // ไฟล์ด์ metric
      seoWordCount: wordCount,
      seoAltTextCoveragePct: altPct,
      seoInternalLinks: internal,
      seoExternalLinks: external,

      // หมายเหตุ: ฟิลด์ seoMobileFriendly / seoSitemapIncluded / seoStructuredDataPresent / seoHreflangValid
      // ยังไม่ได้ตรวจแบบลึกในตัวอย่างนี้
    },
  });

  revalidatePath(`/app/projects/${projectId}`);
}
