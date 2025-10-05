"use server";

import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { fetchAvgMonthlySearches } from "@/lib/googleAds";

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

/** Refresh top-3 keyword volumes via Google Ads API and cache on Page */
export async function refreshTopKeywordVolumesAction(formData: FormData) {
  const projectId = String(formData.get("projectId") || "");
  const pageId = String(formData.get("pageId") || "");
  if (!projectId || !pageId) throw new Error("Missing projectId or pageId");

  const project = await ensureOwner(projectId);
  if (!project) throw new Error("Unauthorized");

  const page = await prisma.page.findUnique({
    where: { id: pageId },
    select: { pageSeoKeywords: true },
  });
  if (!page) throw new Error("Page not found");

  const keywords = (page.pageSeoKeywords ?? []).map((s) => String(s)).filter(Boolean);
  if (keywords.length === 0) {
    // clear cache if no keywords
    await prisma.page.update({
      where: { id: pageId },
      data: { topKeywordVolumesJson: JSON.stringify([]), topKeywordFetchedAt: new Date() },
    });
    revalidatePath(`/app/projects/${projectId}`);
    return;
  }

  // pick language from targetLocale
  const lang = (project.targetLocale === "th" ? "th" : project.targetLocale === "zh-CN" ? "zh" : "en") as
    | "th"
    | "zh"
    | "en";

  try {
    const volumes = await fetchAvgMonthlySearches(projectId, keywords, {
      language_code: lang,
      // ถ้าต้องปรับประเทศ เปลี่ยน geo_target_constants ได้ (default: Thailand)
      // geo_target_constants: ["geoTargetConstants/2392"]
    });

    const top3 = volumes.slice(0, 3);
    await prisma.page.update({
      where: { id: pageId },
      data: {
        topKeywordVolumesJson: JSON.stringify(top3),
        topKeywordFetchedAt: new Date(),
      },
    });
  } catch (e: any) {
    // เซฟ error ไว้ใน JSON เพื่อแสดงได้ที่หน้า
    await prisma.page.update({
      where: { id: pageId },
      data: {
        topKeywordVolumesJson: JSON.stringify({ error: e?.message || String(e) }),
        topKeywordFetchedAt: new Date(),
      },
    });
  }

  revalidatePath(`/app/projects/${projectId}`);
}
