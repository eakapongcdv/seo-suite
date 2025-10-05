// app/api/projects/[id]/clone/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { targetLocale } = (await req.json()) as { targetLocale?: string };
  if (!targetLocale) return NextResponse.json({ error: "targetLocale required" }, { status: 400 });

  const src = await prisma.project.findFirst({
    where: { id: params.id, ownerId: session.user.id },
    include: { pages: true },
  });
  if (!src) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // กัน duplicate per user: siteName + targetLocale ซ้ำ
  const duplicate = await prisma.project.findFirst({
    where: {
      ownerId: session.user.id,
      siteName: src.siteName,
      targetLocale: targetLocale,
    },
  });
  if (duplicate) {
    return NextResponse.json({ error: "Project with the same siteName and targetLocale already exists." }, { status: 400 });
  }

  // สร้างโปรเจกต์ใหม่
  const newProject = await prisma.project.create({
    data: {
      ownerId: src.ownerId,
      siteName: src.siteName,
      siteUrl: src.siteUrl,
      targetLocale: targetLocale,
      includeBaidu: src.includeBaidu,
      figmaFileKey: src.figmaFileKey ?? null,
      figmaAccessToken: src.figmaAccessToken ?? null,
    },
  });

  // คัดลอก pages ทั้งหมด
  if (src.pages.length > 0) {
    await prisma.page.createMany({
      data: src.pages.map((p) => ({
        projectId: newProject.id,
        pageName: p.pageName,
        pageUrl: p.pageUrl,
        pageDescriptionSummary: p.pageDescriptionSummary ?? null,
        pageContentKeywords: p.pageContentKeywords ?? [],
        pageMetaDescription: p.pageMetaDescription ?? null,
        pageSeoKeywords: p.pageSeoKeywords ?? [],
        sortNumber: p.sortNumber ?? 0,

        figmaNodeId: p.figmaNodeId ?? null,
        figmaCaptureUrl: p.figmaCaptureUrl ?? null,
        figmaCapturedAt: p.figmaCapturedAt ?? null,
        figmaTextContent: p.figmaTextContent ?? null,

        realCaptureUrl: p.realCaptureUrl ?? null,

        lighthousePerf: p.lighthousePerf ?? null,
        lighthouseSeo: p.lighthouseSeo ?? null,
        lighthouseAccessibility: p.lighthouseAccessibility ?? null,

        aiSeoInsight: p.aiSeoInsight ?? null,

        seoTitlePresent: p.seoTitlePresent ?? false,
        seoTitleLengthOk: p.seoTitleLengthOk ?? false,
        seoH1Present: p.seoH1Present ?? false,
        seoCanonicalPresent: p.seoCanonicalPresent ?? false,
        seoCanonicalSelfReferential: p.seoCanonicalSelfReferential ?? false,
        seoRobotsNoindex: p.seoRobotsNoindex ?? false,
        seoSitemapIncluded: p.seoSitemapIncluded ?? false,
        seoStructuredDataPresent: p.seoStructuredDataPresent ?? false,
        seoHreflangValid: p.seoHreflangValid ?? false,
        seoMobileFriendly: p.seoMobileFriendly ?? false,

        seoWordCount: p.seoWordCount ?? null,
        seoAltTextCoveragePct: p.seoAltTextCoveragePct ?? null,
        seoInternalLinks: p.seoInternalLinks ?? null,
        seoExternalLinks: p.seoExternalLinks ?? null,

        cwvLcpMs: p.cwvLcpMs ?? null,
        cwvCls: p.cwvCls ?? null,
        cwvInpMs: p.cwvInpMs ?? null,

        indexStatus: p.indexStatus ?? null,
        lastCrawledAt: p.lastCrawledAt ?? null,
        gscImpressions: p.gscImpressions ?? null,
        gscClicks: p.gscClicks ?? null,
        gscCtrPct: p.gscCtrPct ?? null,
        gscAvgPosition: p.gscAvgPosition ?? null,

        lastRankPosition: p.lastRankPosition ?? null,
        lastRankCheckedAt: p.lastRankCheckedAt ?? null,
      })),
      skipDuplicates: true,
    });
  }

  return NextResponse.json({ ok: true, id: newProject.id });
}
