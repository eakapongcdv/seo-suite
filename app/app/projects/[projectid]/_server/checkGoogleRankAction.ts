// app/app/projects/[projectid]/_server/checkGoogleRankAction.ts
"use server";

import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { getGoogleRank } from "./googleRank";

type CheckArgs = {
  projectId: string;
  pageId: string;
  rankKeywordId: string;
  siteUrl: string;           // base url ของโปรเจกต์
  locale?: string;           // เช่น "th-TH"
  countryCode?: string;      // เช่น "TH"
};

export async function checkGoogleRankAction(args: CheckArgs) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  // ตรวจว่าเป็นเจ้าของโปรเจกต์
  const project = await prisma.project.findUnique({
    where: { id: args.projectId },
    select: { id: true, ownerId: true, targetLocale: true },
  });
  if (!project || project.ownerId !== session.user.id) {
    throw new Error("Forbidden");
  }

  const rk = await prisma.rankKeyword.findUnique({
    where: { id: args.rankKeywordId },
    select: { id: true, keyword: true, searchEngine: true, locale: true },
  });
  if (!rk || rk.searchEngine !== "google") {
    throw new Error("Keyword not found or not Google.");
  }

  const { position, pageIndex, foundUrl } = await getGoogleRank({
    keyword: rk.keyword,
    targetUrl: args.siteUrl,
    locale: args.locale || rk.locale || project.targetLocale || "th-TH",
    countryCode: args.countryCode || undefined,
    maxPages: 10,
  });

  // บันทึก snapshot + update lastPosition/lastCheckedAt
  const now = new Date();
  await prisma.$transaction([
    prisma.rankSnapshot.create({
      data: {
        rankKeywordId: rk.id,
        position: position ?? null,
        url: foundUrl ?? null,
        raw: { source: "google-scrape", pageIndex, checkedAt: now, siteUrl: args.siteUrl },
      },
    }),
    prisma.rankKeyword.update({
      where: { id: rk.id },
      data: { lastPosition: position ?? null, lastCheckedAt: now },
    }),
    // (ออปชั่น) อัปเดต page mirror
    prisma.page.update({
      where: { id: args.pageId },
      data: { lastRankPosition: position ?? null, lastRankCheckedAt: now },
    }),
  ]);

  return { ok: true, position, pageIndex, foundUrl };
}
