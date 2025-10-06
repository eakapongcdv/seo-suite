"use server";

import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { getGoogleRank } from "../_server/googleRank";

const CheckSchema = z.object({
  projectId: z.string().min(1),
  pageId: z.string().min(1),
  rankKeywordId: z.string().min(1),
  siteUrl: z.string().url(),        // ควรเป็น absolute URL
  locale: z.string().optional(),    // เช่น "th-TH"
  countryCode: z.string().optional()
});

export async function checkGoogleRankAction(input: unknown): Promise<{
  ok: boolean;
  position: number | null;
  pageIndex: number | null;
  foundUrl: string | null;
  error?: string;
}> {
  // validate
  const parsed = CheckSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      position: null,
      pageIndex: null,
      foundUrl: null,
      error: parsed.error.issues[0]?.message || "Invalid input",
    };
  }
  const { projectId, pageId, rankKeywordId, siteUrl, locale, countryCode } = parsed.data;

  // auth
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, position: null, pageIndex: null, foundUrl: null, error: "Unauthorized" };
  }

  // ensure owner
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, ownerId: true, targetLocale: true },
  });
  if (!project || project.ownerId !== session.user.id) {
    return { ok: false, position: null, pageIndex: null, foundUrl: null, error: "Forbidden" };
  }

  // fetch keyword
  const rk = await prisma.rankKeyword.findUnique({
    where: { id: rankKeywordId },
    select: { id: true, keyword: true, searchEngine: true, locale: true },
  });
  if (!rk) {
    return { ok: false, position: null, pageIndex: null, foundUrl: null, error: "Keyword not found" };
  }
  if (rk.searchEngine !== "google") {
    return { ok: false, position: null, pageIndex: null, foundUrl: null, error: "Only Google supported here" };
  }

  // crawl (สูงสุด 10 หน้า)
  const res = await getGoogleRank({
    keyword: rk.keyword,
    targetUrl: siteUrl,
    locale: locale || rk.locale || project.targetLocale || "th-TH",
    countryCode: countryCode || undefined,
    maxPages: 10,
  });

  const now = new Date();

  // write snapshot + mirror fields (atomic)
  try {
    await prisma.$transaction([
      prisma.rankSnapshot.create({
        data: {
          rankKeywordId: rk.id,
          position: res.position ?? null,
          url: res.foundUrl ?? null,
          raw: { source: "google-scrape", pageIndex: res.pageIndex, checkedAt: now, siteUrl },
        },
      }),
      prisma.rankKeyword.update({
        where: { id: rk.id },
        data: { lastPosition: res.position ?? null, lastCheckedAt: now },
      }),
      prisma.page.update({
        where: { id: pageId },
        data: { lastRankPosition: res.position ?? null, lastRankCheckedAt: now },
      }),
    ]);
  } catch (e: any) {
    return {
      ok: false,
      position: res.position ?? null,
      pageIndex: res.pageIndex ?? null,
      foundUrl: res.foundUrl ?? null,
      error: e?.message || "Failed to save snapshot",
    };
  }

  return {
    ok: true,
    position: res.position ?? null,
    pageIndex: res.pageIndex ?? null,
    foundUrl: res.foundUrl ?? null,
  };
}
