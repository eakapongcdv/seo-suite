"use client";

import SubmitButton from "@/app/components/SubmitButton";
import { RefreshCw } from "lucide-react";
import { PageRowProps } from "./types";
import { scrapeRealPageAction } from "../../actions";

type Props = { projectId: string; page: PageRowProps["page"] };

export default function LivePageSection({ projectId, page }: Props) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-sm font-medium text-gray-900">Live Page (scraped)</div>
        <form action={scrapeRealPageAction}>
          <input type="hidden" name="pageId" value={page.id} />
          <input type="hidden" name="projectId" value={projectId} />
          <SubmitButton
            aria-label="Scrape URL"
            title="Scrape URL"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4" />
          </SubmitButton>
        </form>
      </div>

      <div>
        <div className="mb-1 text-xs font-medium text-gray-700">Live Capture</div>
        <div className="max-h-[500px] overflow-auto rounded-md border bg-gray-50">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={
              page.realCaptureUrl
                ? page.realCaptureUrl
                : !page.pageUrl.startsWith("/")
                  ? `/api/screenshot?url=${encodeURIComponent(page.pageUrl)}`
                  : ""
            }
            alt="Live page capture"
            className="block h-auto w-full object-top"
            loading="lazy"
          />
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3">
        <ul className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
          <li>Title present: {page.seoTitlePresent ? "yes" : "no"}</li>
          <li>Title length ok: {page.seoTitleLengthOk ? "yes" : "no"}</li>
          <li>H1 present: {page.seoH1Present ? "yes" : "no"}</li>
          <li>Canonical tag: {page.seoCanonicalPresent ? "yes" : "no"}</li>
          <li>Self-referential canonical: {page.seoCanonicalSelfReferential ? "yes" : "no"}</li>
          <li>Noindex: {page.seoRobotsNoindex ? "yes" : "no"}</li>
          <li>Word count: {page.seoWordCount ?? "-"}</li>
          <li>ALT coverage: {page.seoAltTextCoveragePct ?? 0}%</li>
          <li>Internal links: {page.seoInternalLinks ?? 0}</li>
          <li>External links: {page.seoExternalLinks ?? 0}</li>
        </ul>
      </div>
    </div>
  );
}
