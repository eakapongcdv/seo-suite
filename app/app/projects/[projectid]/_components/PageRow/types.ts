// app/app/projects/[projectid]/_components/PageRow/types.ts
import type { Prisma } from "@prisma/client";

export type TargetLocale = "en" | "th" | "zh-CN";

export type RankChip = {
  id: string;
  keyword: string;
  lastPosition: number | null;
  lastCheckedAt: Date | string | null;
};

export type PageRowProps = {
  projectId: string;
  projectTargetLocale?: string | null;
  projectGscConnected?: boolean;
  projectBaiduConnected?: boolean;
  page: {
    id: string;
    sortNumber: number | null;
    pageName: string;
    pageUrl: string;

    pageDescriptionSummary: string | null;
    pageMetaDescription: string | null;
    pageSeoKeywords: string[] | null;
    pageContentKeywords?: string[] | null;

    figmaNodeId: string | null;
    figmaCaptureUrl: string | null;
    figmaCapturedAt: Date | string | null;
    figmaTextContent: string | null;

    realCaptureUrl?: string | null;

    scrapedTitle?: string | null;
    scrapedDescription?: string | null;
    scrapedCanonical?: string | null;
    scrapedRobots?: string | null;
    scrapedOgTitle?: string | null;
    scrapedOgDescription?: string | null;
    scrapedH1?: string[] | null;

    lighthousePerf: number | null;
    lighthouseSeo: number | null;
    lighthouseAccessibility: number | null;

    seoTitlePresent?: boolean | null;
    seoTitleLengthOk?: boolean | null;
    seoH1Present?: boolean | null;
    seoCanonicalPresent?: boolean | null;
    seoCanonicalSelfReferential?: boolean | null;
    seoRobotsNoindex?: boolean | null;
    seoWordCount?: number | null;
    seoAltTextCoveragePct?: number | null;
    seoInternalLinks?: number | null;
    seoExternalLinks?: number | null;

    gscConnected?: boolean | null;
    baiduConnected?: boolean | null;

    aiSeoInsight?: string | null;
    // ✅ รับ JSON จาก Prisma แทน string
    topKeywordVolumesJson?: Prisma.JsonValue | null;
    topKeywordFetchedAt?: Date | string | null;

    updatedAt: Date | string;
  };
};
