// app/app/projects/[projectid]/actions/topKeywords.ts
"use server";

import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { fetchAvgMonthlySearches } from "@/lib/googleAds";
import type { Prisma } from "@prisma/client";

async function ensureOwner(projectId: string) {
  const session = await auth();
  if (!session?.user?.id) return null;
  const p = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, ownerId: true, targetLocale: true },
  });
  if (!p || p.ownerId !== session.user.id) return null;
  return p;
}

/** Normalize ให้เหลือเฉพาะฟิลด์ที่ UI ใช้ เพื่อเก็บลง JSON อย่างสะอาด */
function normalizeVolumes(
  arr: unknown
): Array<{ keyword: string; avgMonthlySearches: number }> {
  if (!Array.isArray(arr)) return [];
  return arr
    .map((x) => {
      if (!x || typeof x !== "object") return null;
      const kw = (x as any).keyword;
      const vol = (x as any).avgMonthlySearches;
      if (typeof kw !== "string") return null;
      const n = Number(vol);
      if (!Number.isFinite(n)) return null;
      return { keyword: kw, avgMonthlySearches: n };
    })
    .filter(Boolean) as Array<{ keyword: string; avgMonthlySearches: number }>;
}

/** Refresh top-3 keyword volumes via Google Ads API and cache on Page (✅ JSON field) */
export async function refreshTopKeywordVolumesAction(formData: FormData): Promise<
  | { ok: true }
  | { ok: false; error: string }
> {
  const projectId = String(formData.get("projectId") || "");
  const pageId = String(formData.get("pageId") || "");
  if (!projectId || !pageId) return { ok: false, error: "Missing projectId or pageId" };

  const project = await ensureOwner(projectId);
  if (!project) return { ok: false, error: "Unauthorized" };

  const page = await prisma.page.findUnique({
    where: { id: pageId },
    select: { pageSeoKeywords: true },
  });
  if (!page) return { ok: false, error: "Page not found" };

  const keywords = (page.pageSeoKeywords ?? []).map(String).filter(Boolean);

  // ไม่มีคีย์เวิร์ด -> เคลียร์แคชเป็นอาเรย์ว่าง (JSON)
  if (keywords.length === 0) {
    await prisma.page.update({
      where: { id: pageId },
      data: {
        topKeywordVolumesJson: [] as Prisma.InputJsonValue,
        topKeywordFetchedAt: new Date(),
      },
    });
    revalidatePath(`/app/projects/${projectId}`);
    return { ok: true };
  }

  const lang =
    (project.targetLocale === "th" ? "th" : project.targetLocale === "zh-CN" ? "zh" : "en") as
      | "th"
      | "zh"
      | "en";

  try {
    const volumes = await fetchAvgMonthlySearches(projectId, keywords, {
      language_code: lang,
      // geo_target_constants: ["geoTargetConstants/2764"],
    });

    const top3 = normalizeVolumes(volumes).slice(0, 3);

    await prisma.page.update({
      where: { id: pageId },
      data: {
        // ✅ เก็บเป็น JSON ตรง ๆ
        topKeywordVolumesJson: top3 as Prisma.InputJsonValue,
        topKeywordFetchedAt: new Date(),
      },
    });

    revalidatePath(`/app/projects/${projectId}`);
    return { ok: true };
  } catch (e: any) {
    await prisma.page.update({
      where: { id: pageId },
      data: {
        topKeywordVolumesJson: {                  
          error: e?.message || String(e),
        } as Prisma.InputJsonValue,
        topKeywordFetchedAt: new Date(),
      },
    });
    revalidatePath(`/app/projects/${projectId}`);
    return { ok: false, error: e?.message || "Failed to fetch keyword volumes" };
  }
}

/** ใช้กับ <form action> เพื่อให้ type ตรง Promise<void> */
export async function refreshTopKeywordVolumesFormAction(formData: FormData): Promise<void> {
  await refreshTopKeywordVolumesAction(formData);
}

/** Top-3 long-tail keywords ของหน้า (Google + active) */
export async function getTop3LongTailKeywordsAction(input: {
  projectId?: string;
  pageId?: string;
  searchEngine?: "google" | "bing" | "baidu";
  minWordCount?: number; // default 3
}): Promise<
  | { ok: true; items: Array<{ id: string; keyword: string; lastPosition: number | null; lastCheckedAt: Date | null }> }
  | { ok: false; error: string }
> {
  const projectId = String(input?.projectId || "");
  const pageId = String(input?.pageId || "");
  const searchEngine = input?.searchEngine ?? "google";
  const minWordCount = Math.min(Math.max(input?.minWordCount ?? 3, 2), 10);

  if (!projectId || !pageId) return { ok: false, error: "Missing projectId or pageId" };

  const project = await ensureOwner(projectId);
  if (!project) return { ok: false, error: "Unauthorized" };

  try {
    const rows = await prisma.rankKeyword.findMany({
      where: { projectId, pageId, searchEngine, active: true },
      select: {
        id: true,
        keyword: true,
        lastPosition: true,
        lastCheckedAt: true,
        updatedAt: true,
      },
      orderBy: [{ updatedAt: "desc" }, { lastCheckedAt: "desc" }],
    });

    const enriched = rows
      .map((r) => ({
        ...r,
        _wc: r.keyword.trim().split(/\s+/).filter(Boolean).length,
      }))
      .filter((r) => r._wc >= minWordCount)
      .sort((a, b) => {
        if (b._wc !== a._wc) return b._wc - a._wc; // คำมากก่อน
        return (b.updatedAt?.getTime?.() || 0) - (a.updatedAt?.getTime?.() || 0);
      });

    const top3 = enriched.slice(0, 3).map((r) => ({
      id: r.id,
      keyword: r.keyword,
      lastPosition: r.lastPosition ?? null,
      lastCheckedAt: r.lastCheckedAt ?? null,
    }));

    return { ok: true, items: top3 };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Failed to load long-tail keywords" };
  }
}
