"use client";

import { ChevronDown } from "lucide-react";
import SeoChecklist from "./../SeoChecklist";
import { PageRowProps } from "./types";
import { mapLocaleToKeywordLang, keywordLangLabel } from "./utils";

import HeaderBar from "./HeaderBar";
import FigmaSeoSection from "./FigmaSeoSection";
import LivePageSection from "./LivePageSection";
import LighthouseSection from "./LighthouseSection";
import RankTrackingSection from "./RankTrackingSection";
import TopAdsKeywordsSection from "./TopAdsKeywordsSection";
import AiInsightSection from "./AiInsightSection";
import FooterUpdated from "./FooterUpdated";

export default function PageRow({
  projectId,
  projectTargetLocale,
  projectGscConnected = false,
  projectBaiduConnected = false,
  page,
}: PageRowProps) {
  const kLang = mapLocaleToKeywordLang(projectTargetLocale);
  const kLabel = keywordLangLabel(kLang);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      {/* Header */}
      <HeaderBar projectId={projectId} page={page} />

      {/* Expand/Collapse */}
      <details className="mt-3 rounded-xl border border-gray-200 bg-gray-50 p-0 open:shadow-inner">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-xl p-3 text-sm font-medium text-gray-800 hover:bg-gray-100">
          <span className="inline-flex items-center gap-2">
            <ChevronDown className="h-4 w-4 transition-transform duration-200" />
            Figma & SEO <span className="text-gray-500">({kLabel})</span>
          </span>
          <span className="text-xs text-gray-500">
            {page.figmaCapturedAt ? `Last synced: ${new Date(page.figmaCapturedAt as any).toLocaleString()}` : "Not synced yet"}
          </span>
        </summary>

        <div className="grid grid-cols-1 gap-4 p-3 md:grid-cols-12">
          {/* LEFT column */}
          <div className="md:col-span-6">
            <FigmaSeoSection projectId={projectId} page={page} keywordLang={kLang} />
          </div>

          {/* RIGHT column */}
          <div className="md:col-span-6 space-y-3">
            <LivePageSection projectId={projectId} page={page} />
            <LighthouseSection projectId={projectId} page={page} />
            <RankTrackingSection projectId={projectId} page={page} projectTargetLocale={projectTargetLocale} />
          </div>

          {/* FOOTER row */}
          <div className="md:col-span-12 space-y-3">
            <TopAdsKeywordsSection projectId={projectId} page={page} />
            <AiInsightSection projectId={projectId} projectTargetLocale={projectTargetLocale} page={page} />
            <SeoChecklist
              page={{
                ...page,
                pageContentKeywords: page.pageContentKeywords ?? [],
                gscConnected: !!projectGscConnected,
                baiduConnected: !!projectBaiduConnected,
              }}
              title="SEO Checklist"
            />
          </div>
        </div>
      </details>

      <FooterUpdated updatedAt={page.updatedAt} />
    </div>
  );
}
