// app/app/projects/[projectid]/_components/PageRow.tsx
import Link from "next/link";
import {
  Save as SaveIcon,
  Trash2,
  Sparkles,
  ChevronDown,
  ExternalLink,
  RefreshCw,
} from "lucide-react";

import SubmitButton from "@/app/components/SubmitButton";

import SeoChecklist from "./SeoChecklist";
import Circular from "./Circular";
import PendingSpinnerIcon from "@/app/components/PendingSpinnerIcon";

import {
  updatePageAction,
  deletePageAction,
  syncFigmaAction,
  recommendSeoKeywordsAction,
  refreshLighthouseAction,
  scrapeRealPageAction,
} from "../actions";

type PageRowProps = {
  projectId: string;
  page: {
    id: string;
    sortNumber: number | null;
    pageName: string;
    pageUrl: string;

    pageDescriptionSummary: string | null;
    pageMetaDescription: string | null;
    pageSeoKeywords: string[] | null;

    figmaNodeId: string | null;
    figmaCaptureUrl: string | null;
    figmaCapturedAt: Date | string | null;
    figmaTextContent: string | null;

    // live site (optional) – screenshot URL from scraping action
    realCaptureUrl?: string | null;

    lighthousePerf: number | null;
    lighthouseSeo: number | null;
    lighthouseAccessibility: number | null;

    // optional scraped metrics (schema has these; keep them optional in props)
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

    updatedAt: Date | string;
  };
};

export default function PageRow({ projectId, page }: PageRowProps) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      {/* Top row: inline edit + delete */}
      <div className="grid grid-cols-1 items-end gap-3 md:grid-cols-12">
        {/* UPDATE (sort/name/url) */}
        <form action={updatePageAction} className="contents">
          <input type="hidden" name="id" value={page.id} />
          <input type="hidden" name="projectId" value={projectId} />

          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-medium text-gray-700">Sort Number</label>
            <input
              name="sortNumber"
              type="number"
              defaultValue={page.sortNumber ?? 0}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>

          <div className="md:col-span-4">
            <label className="mb-1 block text-xs font-medium text-gray-700">Page Name</label>
            <input
              name="pageName"
              defaultValue={page.pageName}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>

          <div className="md:col-span-4">
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <label className="mb-1 block text-xs font-medium text-gray-700">Page URL</label>
                <input
                  name="pageUrl"
                  defaultValue={page.pageUrl}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
              {page.pageUrl ? (
                <Link
                  href={page.pageUrl.startsWith("/") ? page.pageUrl : page.pageUrl}
                  target={page.pageUrl.startsWith("/") ? "_self" : "_blank"}
                  rel="noopener noreferrer"
                  className="mb-1 inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                  title="Open page"
                  aria-label="Open page"
                >
                  <ExternalLink className="h-4 w-4" />
                </Link>
              ) : null}
            </div>
          </div>

          <div className="md:col-span-1">
            <button
              type="submit"
              aria-label="Save"
              title="Save"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <SaveIcon className="h-4 w-4" />
              <span className="sr-only">Save</span>
            </button>
          </div>
        </form>

        {/* DELETE */}
        <div className="md:col-span-1 flex justify-end">
          <form action={deletePageAction}>
            <input type="hidden" name="id" value={page.id} />
            <input type="hidden" name="projectId" value={projectId} />
            <button
              type="submit"
              aria-label="Delete"
              title="Delete"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-transparent bg-red-100 text-red-700 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <Trash2 className="h-4 w-4" />
              <span className="sr-only">Delete</span>
            </button>
          </form>
        </div>
      </div>

      {/* Expand/Collapse */}
      <details className="mt-3 rounded-xl border border-gray-200 bg-gray-50 p-0 open:shadow-inner">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-xl p-3 text-sm font-medium text-gray-800 hover:bg-gray-100">
          <span className="inline-flex items-center gap-2">
            <ChevronDown className="h-4 w-4 transition-transform duration-200" />
            Figma & SEO
          </span>
          <span className="text-xs text-gray-500">
            {page.figmaCapturedAt
              ? `Last synced: ${new Date(page.figmaCapturedAt as any).toLocaleString()}`
              : "Not synced yet"}
          </span>
        </summary>

        {/* 50 / 50 layout */}
        <div className="grid grid-cols-1 gap-4 p-3 md:grid-cols-12">
          {/* LEFT 50% — Figma, Extracted text, Meta, SEO Keywords (editable tags UI) */}
          <div className="md:col-span-6 space-y-3">
            {/* Figma Sync + AI Recommend */}
            <div className="grid grid-cols-1 items-end gap-2 md:grid-cols-12">
              {/* SYNC FIGMA */}
              <form action={syncFigmaAction} className="md:col-span-8 flex gap-2">
                <input type="hidden" name="pageId" value={page.id} />
                <input type="hidden" name="projectId" value={projectId} />
                <input
                  name="figmaNodeId"
                  defaultValue={page.figmaNodeId ?? ""}
                  placeholder="e.g., 1:23"
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
                <button
                  type="submit"
                  aria-label="Sync Figma"
                  title="Sync Figma"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 shadow-sm hover:bg-gray-50"
                >
                  <PendingSpinnerIcon />
                </button>
              </form>

              {/* AI Recommend SEO Keywords */}
             <form action={recommendSeoKeywordsAction} className="md:col-span-4 flex justify-end">
                <input type="hidden" name="pageId" value={page?.id} />
                <input type="hidden" name="projectId" value={projectId} />
                <SubmitButton
                  aria-label="AI: SEO Keyword Recommend"
                  title="AI: SEO Keyword Recommend"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-transparent bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <Sparkles className="h-4 w-4" />
                </SubmitButton>
              </form>
            </div>

            {/* Capture Preview + Extracted Text (raw) under it */}
            <div>
              <div className="mb-1 text-sm font-medium text-gray-800">Capture Preview (Figma)</div>
              {page.figmaCaptureUrl ? (
                <div className="max-h-[500px] overflow-auto rounded-md border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={page.figmaCaptureUrl} alt="Figma capture" className="block h-auto w-full" />
                </div>
              ) : (
                <div className="rounded-md border p-4 text-center text-sm text-gray-400">No capture yet</div>
              )}

              {page.figmaTextContent ? (
                <div className="mt-2">
                  <div className="mb-1 text-xs text-gray-500">Extracted Text (raw)</div>
                  <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded-md border bg-white p-3 text-xs text-gray-700">
                    {page.figmaTextContent}
                  </pre>
                </div>
              ) : null}
            </div>

            {/* Meta Tags */}
            <div className="rounded-xl border border-gray-200 bg-white p-3">
              <div className="mb-2 text-sm font-medium text-gray-900">Meta Tags</div>
              <form action={updatePageAction} className="grid grid-cols-1 gap-3">
                <input type="hidden" name="id" value={page.id} />
                <input type="hidden" name="projectId" value={projectId} />

                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">Content Summary</label>
                  <textarea
                    name="pageDescriptionSummary"
                    defaultValue={page.pageDescriptionSummary ?? ""}
                    rows={2}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">Meta Description</label>
                  <textarea
                    name="pageMetaDescription"
                    defaultValue={page.pageMetaDescription ?? ""}
                    rows={3}
                    placeholder="Ideal 150–160 chars with primary keywords"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    aria-label="Save Meta"
                    title="Save Meta"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 shadow-sm hover:bg-gray-50"
                  >
                    <SaveIcon className="h-4 w-4" />
                    <span className="sr-only">Save Meta</span>
                  </button>
                </div>
              </form>
            </div>

            {/* SEO Keywords — editable while showing tags */}
            <div className="rounded-xl border border-gray-200 bg-white p-3">
              <div className="mb-2 text-sm font-medium text-gray-900">SEO Keywords</div>

              {/* Tags (readable) */}
              <div className="min-h-[44px] rounded-md border bg-gray-50 p-2">
                {page.pageSeoKeywords?.length ? (
                  <div className="flex flex-wrap gap-1.5">
                    {page.pageSeoKeywords.map((k) => (
                      <span
                        key={k}
                        className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-xs text-indigo-700"
                      >
                        {k}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-gray-400">No SEO keywords yet.</span>
                )}
              </div>

              {/* Editor: a single input that holds the list (no “comma” label shown) */}
              <form action={updatePageAction} className="mt-2 flex items-end gap-2">
                <input type="hidden" name="id" value={page.id} />
                <input type="hidden" name="projectId" value={projectId} />
                <div className="flex-1">
                  <label className="mb-1 block text-xs font-medium text-gray-700">
                    Edit keywords (you can type and separate with commas)
                  </label>
                  <input
                    name="pageSeoKeywords"
                    defaultValue={(page.pageSeoKeywords ?? []).join(", ")}
                    placeholder="Add or edit keywords…"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>
                <button
                  type="submit"
                  aria-label="Save Keywords"
                  title="Save Keywords"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                >
                  <SaveIcon className="h-4 w-4" />
                </button>
              </form>
            </div>
          </div>

          {/* RIGHT 50% — Live page (screenshot), Lighthouse */}
          <div className="md:col-span-6 space-y-3">
            {/* Live Page (scraped) with screenshot */}
            <div className="rounded-xl border border-gray-200 bg-white p-3">
              <div className="mb-2 flex items-center justify-between">
                <div className="text-sm font-medium text-gray-900">Live Page (scraped)</div>
                <form action={scrapeRealPageAction}>
                  <input type="hidden" name="pageId" value={page.id} />
                  <input type="hidden" name="projectId" value={projectId} />
                  <button
                    type="submit"
                    aria-label="Scrape URL"
                    title="Scrape URL"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                  >
                    <PendingSpinnerIcon />
                  </button>
                </form>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {/* Live capture */}
                <div>
                  <div className="mb-1 text-xs font-medium text-gray-700">Live Capture</div>
                  <div className="aspect-[4/3] overflow-hidden rounded-md border bg-gray-50">
                    {page.realCaptureUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={page.realCaptureUrl}
                        alt="Live page capture"
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">
                        No live capture yet
                      </div>
                    )}
                  </div>
                </div>

                {/* Figma capture for side-by-side comparison */}
                <div>
                  <div className="mb-1 text-xs font-medium text-gray-700">Figma Capture</div>
                  <div className="aspect-[4/3] overflow-hidden rounded-md border bg-gray-50">
                    {page.figmaCaptureUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={page.figmaCaptureUrl}
                        alt="Figma capture"
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">
                        No capture
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Some quick scraped metrics if available */}
              <ul className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                <li>
                  Meta description:{" "}
                  {page.pageMetaDescription ? (
                    <span className="text-gray-800">present</span>
                  ) : (
                    <span className="text-gray-500">missing</span>
                  )}
                </li>
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

            {/* Lighthouse */}
            <div className="rounded-xl border border-gray-200 bg-white p-3">
              <div className="mb-2 flex items-center justify-between">
                <div className="text-sm font-medium text-gray-900">Lighthouse Scores</div>
                <form action={refreshLighthouseAction}>
                <input type="hidden" name="pageId" value={page?.id} />
                <input type="hidden" name="projectId" value={projectId} />
                <SubmitButton
                  aria-label="Refresh Lighthouse"
                  title="Refresh Lighthouse"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                >
                  <RefreshCw className="h-4 w-4" />
                </SubmitButton>
              </form>
              </div>

              <div className="mb-2 flex gap-3">
                <Circular value={Number(page.lighthouseSeo ?? 0)} label="SEO" />
                <Circular value={Number(page.lighthousePerf ?? 0)} label="Perf" />
                <Circular value={Number(page.lighthouseAccessibility ?? 0)} label="A11y" />
              </div>
            </div>
          </div>

          {/* FOOTER: SEO Checklist (100% width) */}
          <div className="md:col-span-12">
            <SeoChecklist page={page as any} />
          </div>
        </div>
      </details>

      <div className="mt-2 text-xs text-gray-500">
        Updated: {new Date(page.updatedAt as any).toLocaleString()}
      </div>
    </div>
  );
}
