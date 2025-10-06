"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { PageRowProps, RankChip } from "./types";
import { pickTargetAbsoluteUrl } from "./utils";
import { getTop3LongTailKeywordsAction, checkGoogleRankAction } from "../../actions";

type Props = {
  projectId: string;
  page: PageRowProps["page"];
  projectTargetLocale?: string | null;
};

export default function RankTrackingSection({ projectId, page, projectTargetLocale }: Props) {
  const [rankChips, setRankChips] = useState<RankChip[] | null>(null);
  const [rankError, setRankError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingId, setIsCheckingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const targetUrlForRanking = useMemo(
    () => pickTargetAbsoluteUrl(page.pageUrl, page.realCaptureUrl),
    [page.pageUrl, page.realCaptureUrl]
  );

  async function loadKeywords() {
    setIsLoading(true);
    setRankError(null);
    try {
      const res = await getTop3LongTailKeywordsAction({
        projectId,
        pageId: page.id,
        searchEngine: "google",
        minWordCount: 3,
      });
      if (!res?.ok) {
        setRankChips([]);
        setRankError(res?.error || "Failed to load keywords.");
      } else {
        setRankChips(res.items as RankChip[]);
      }
    } catch (e: any) {
      setRankChips([]);
      setRankError(e?.message || "Failed to load keywords.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadKeywords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, page.id]);

  const onCheck = (rk: RankChip) => {
    if (!targetUrlForRanking) return;
    setIsCheckingId(rk.id);
    startTransition(async () => {
      try {
        const res = await checkGoogleRankAction({
          projectId,
          pageId: page.id,
          rankKeywordId: rk.id,
          siteUrl: targetUrlForRanking,
          locale: projectTargetLocale || undefined,
        });
        if (res?.ok) {
          setRankChips((prev) =>
            (prev || []).map((x) =>
              x.id === rk.id
                ? { ...x, lastPosition: res.position ?? null, lastCheckedAt: new Date().toISOString() }
                : x
            )
          );
        } else {
          setRankError(res?.error || "Check ranking failed.");
        }
      } catch (e: any) {
        setRankError(e?.message || "Check ranking failed.");
      } finally {
        setIsCheckingId(null);
      }
    });
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-sm font-semibold text-gray-900">
          Rank Tracking (Google) • Top 3 long-tail
        </div>
        <button
          type="button"
          onClick={loadKeywords}
          className="inline-flex h-9 items-center justify-center rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          disabled={isLoading}
          title="Reload long-tail keywords"
        >
          <RefreshCw className={`mr-1 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          Reload
        </button>
      </div>

      {rankError && (
        <div className="rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">
          {rankError}
        </div>
      )}

      {rankChips === null ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : rankChips.length === 0 ? (
        <p className="text-sm text-gray-500">No long-tail keywords (≥ 3 words) yet.</p>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          {rankChips.map((k) => {
            const checking = isPending && isCheckingId === k.id;
            return (
              <div key={k.id} className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs" title={k.keyword}>
                <span className="truncate max-w-[220px] font-medium">{k.keyword}</span>
                <span className="rounded bg-gray-100 px-2 py-0.5">
                  {typeof k.lastPosition === "number" ? `#${k.lastPosition}` : "—"}
                </span>
                <button
                  type="button"
                  onClick={() => onCheck(k)}
                  disabled={!targetUrlForRanking || checking}
                  className="rounded-full border px-2 py-0.5 hover:bg-gray-50 disabled:opacity-50"
                  title={
                    targetUrlForRanking
                      ? "Check ranking (crawl up to 10 pages)"
                      : "Need absolute URL (pageUrl or live capture) to check"
                  }
                >
                  {checking ? "Checking…" : "Check"}
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-2 text-xs text-gray-500">
        {targetUrlForRanking
          ? `Target: ${targetUrlForRanking}`
          : "Target: — (provide absolute page URL or live capture first)"}
      </div>
    </div>
  );
}
