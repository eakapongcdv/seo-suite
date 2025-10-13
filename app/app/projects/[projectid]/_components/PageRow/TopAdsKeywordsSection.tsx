// app/app/projects/[projectid]/_components/PageRow/TopAdsKeywordsSection.tsx
"use client";

import SubmitButton from "@/app/components/SubmitButton";
import { RefreshCw } from "lucide-react";
import { PageRowProps } from "./types";
import { readTopKeywordJson } from "./utils"; 
import { refreshTopKeywordVolumesFormAction } from "../../actions";

type Props = { projectId: string; page: PageRowProps["page"] };

export default function TopAdsKeywordsSection({ projectId, page }: Props) {
  const data = readTopKeywordJson(page.topKeywordVolumesJson);
  const fetchedAt = page.topKeywordFetchedAt
    ? new Date(page.topKeywordFetchedAt as any).toLocaleString()
    : null;
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-3">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-sm font-medium text-gray-900">Top Keywords (Google Ads)</div>
          <form action={refreshTopKeywordVolumesFormAction}>
            <input type="hidden" name="pageId" value={page.id} />
            <input type="hidden" name="projectId" value={projectId} />
            <SubmitButton
              aria-label="Refresh Top Keywords"
              title="Refresh Top Keywords"
              className="inline-flex h-9 items-center justify-center rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-700 hover:bg-gray-50"
            >
              <RefreshCw className="mr-1 h-4 w-4" />
              Refresh
            </SubmitButton>
          </form>
        </div>

        {Array.isArray(data) ? (
          data.length === 0 ? (
            <p className="text-sm text-gray-500">ยังไม่มีข้อมูล — กด “Refresh” เพื่อดึงจาก Google Ads</p>
          ) : (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                {data.slice(0, 3).map((kv) => (
                  <span
                    key={kv.keyword}
                    className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs"
                  >
                    <span className="font-medium">{kv.keyword}</span>
                    <span className="text-gray-500">•</span>
                    <span className="text-gray-700">
                      avg {kv.avgMonthlySearches.toLocaleString()}
                    </span>
                  </span>
                ))}
              </div>
              {fetchedAt && <div className="text-xs text-gray-500">Last fetched: {fetchedAt}</div>}
            </div>
          )
        ) : (
          <div className="rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">
            ดึงข้อมูลไม่สำเร็จ: {(data as any).error || "Unknown error"}
          </div>
        )}
      </div>
    );
  }