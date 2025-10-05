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
import PendingSpinnerIcon from "@/app/components/PendingSpinnerIcon";

import SeoChecklist from "./SeoChecklist";
import Circular from "./Circular";

import {
  updatePageAction,
  deletePageAction,
  syncFigmaAction,
  recommendSeoKeywordsAction,
  refreshLighthouseAction,
  scrapeRealPageAction,
  aiSeoInsightAction,
} from "../actions";

import MarkdownProse from "@/app/components/MarkdownProse";

type PageRowProps = {
  projectId: string;
  page: {
    id: string;
    sortNumber: number | null;
    pageName: string;
    pageUrl: string;

    // language per page (optional in schema; safe optional here)
    pageLanguage?: "th" | "en" | "zh" | null;

    pageDescriptionSummary: string | null;
    pageMetaDescription: string | null;
    pageSeoKeywords: string[] | null;

    figmaNodeId: string | null;
    figmaCaptureUrl: string | null;
    figmaCapturedAt: Date | string | null;
    figmaTextContent: string | null;

    // live site (optional) – screenshot URL from scraping action
    realCaptureUrl?: string | null;

    // scraped details (optional)
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

    // scraped metrics (optional)
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

    // tools connectivity flags (optional)
    gscConnected?: boolean | null;
    baiduConnected?: boolean | null;

    // AI result (optional)
    aiSeoInsight?: string | null;

    updatedAt: Date | string;
  };
};

function langLabel(v?: string | null) {
  if (v === "th") return "ไทย";
  if (v === "zh") return "中文";
  return "English";
}

export default function PageRow({ projectId, page }: PageRowProps) {
  const language = (page.pageLanguage ?? "th") as "th" | "en" | "zh";

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      {/* Top row: inline edit + delete */}
      <div className="grid grid-cols-1 items-end gap-3 md:grid-cols-12">
        {/* UPDATE (sort/name/url/lang) */}
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

          <div className="md:col-span-3">
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
                  href={page.pageUrl}
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

          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-medium text-gray-700">Language</label>
            <select
              name="pageLanguage"
              defaultValue={language}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
              aria-label="Page language"
              title="Page language"
            >
              <option value="th">ไทย</option>
              <option value="en">English</option>
              <option value="zh">中文</option>
            </select>
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
            Figma & SEO <span className="text-gray-500">({langLabel(language)})</span>
          </span>
          <span className="text-xs text-gray-500">
            {page.figmaCapturedAt
              ? `Last synced: ${new Date(page.figmaCapturedAt as any).toLocaleString()}`
              : "Not synced yet"}
          </span>
        </summary>

        {/* 50 / 50 layout */}
        <div className="grid grid-cols-1 gap-4 p-3 md:grid-cols-12">
          {/* LEFT 50% — Figma, Extracted text, Meta, SEO Keywords */}
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

              {/* AI Recommend SEO Keywords (autofill meta + keywords; pass language) */}
              <form action={recommendSeoKeywordsAction} className="md:col-span-4 flex justify-end">
                <input type="hidden" name="pageId" value={page.id} />
                <input type="hidden" name="projectId" value={projectId} />
                <input type="hidden" name="preferredLanguage" value={language} />
                <SubmitButton
                  aria-label="AI: SEO Keyword Recommend"
                  title="AI: SEO Keyword Recommend"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-transparent bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <Sparkles className="h-4 w-4" />
                </SubmitButton>
              </form>
            </div>

            {/* Capture Preview + Extracted Text (raw) */}
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

            {/* Meta Tags (Save on top-right) */}
            <div className="rounded-xl border border-gray-200 bg-white p-3">
              <div className="mb-2 flex items-center justify-between">
                <div className="text-sm font-medium text-gray-900">Meta Tags</div>
                <button
                  form="meta-form"
                  aria-label="Save Meta"
                  title="Save Meta"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 shadow-sm hover:bg-gray-50"
                >
                  <SaveIcon className="h-4 w-4" />
                </button>
              </div>

              <form id="meta-form" action={updatePageAction} className="grid grid-cols-1 gap-3">
                <input type="hidden" name="id" value={page.id} />
                <input type="hidden" name="projectId" value={projectId} />
                <input type="hidden" name="pageLanguage" value={language} />

                <textarea
                  name="pageDescriptionSummary"
                  defaultValue={page.pageDescriptionSummary ?? ""}
                  rows={2}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                  placeholder="Short content summary"
                />
                <textarea
                  name="pageMetaDescription"
                  defaultValue={page.pageMetaDescription ?? ""}
                  rows={3}
                  placeholder="Ideal 150–160 chars with primary keywords"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
                {/* Hidden field for SEO keywords (kept for AI autofill pipeline) */}
                <input type="hidden" name="pageSeoKeywords" defaultValue={(page.pageSeoKeywords ?? []).join(", ")} />
              </form>
            </div>

            {/* SEO Keywords — tags + editor */}
            <div className="rounded-xl border border-gray-200 bg-white p-3">
              <div className="mb-2 text-sm font-medium text-gray-900">SEO Keywords</div>

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

              <form action={updatePageAction} className="mt-2 flex items-end gap-2">
                <input type="hidden" name="id" value={page.id} />
                <input type="hidden" name="projectId" value={projectId} />
                <input type="hidden" name="pageLanguage" value={language} />
                <div className="flex-1">
                  <label className="mb-1 block text-xs font-medium text-gray-700">
                    Edit keywords (separate with commas)
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

          {/* RIGHT 50% — Live page + Lighthouse */}
          <div className="md:col-span-6 space-y-3">
            {/* Live Page (scraped) with screenshot + details */}
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
                <div className="aspect-[4/3] overflow-hidden rounded-md border bg-gray-50">
                  {/* Fallback ไป API screenshot ถ้าไม่มี realCaptureUrl และเป็น absolute URL */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={
                      page.realCaptureUrl
                        ? page.realCaptureUrl
                        : !page.pageUrl.startsWith("/")
                          ? `/api/screenshot?url=${encodeURIComponent(page.pageUrl)}`
                          : "" // relative URL แล้วไม่รู้ domain → เว้นไว้
                    }
                    alt="Live page capture"
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </div>
              </div>

              {/* SEO-related live details */}
              <div className="mt-3 grid grid-cols-1 gap-3">
                <div className="rounded-md border bg-gray-50 p-3">
                  <div className="mb-1 text-xs font-semibold text-gray-700">Page Title</div>
                  <div className="text-sm text-gray-800">
                    {page.scrapedTitle ?? (page.seoTitlePresent ? "(present)" : "—")}
                  </div>
                </div>

                <div className="rounded-md border bg-gray-50 p-3">
                  <div className="mb-1 text-xs font-semibold text-gray-700">Meta Description</div>
                  <div className="text-sm text-gray-800">
                    {page.scrapedDescription ?? page.pageMetaDescription ?? "—"}
                  </div>
                </div>

                <div className="rounded-md border bg-gray-50 p-3">
                  <div className="mb-1 text-xs font-semibold text-gray-700">Canonical</div>
                  <div className="text-sm text-gray-800">
                    {page.scrapedCanonical ?? (page.seoCanonicalPresent ? "(present)" : "—")}
                  </div>
                </div>

                <div className="rounded-md border bg-gray-50 p-3">
                  <div className="mb-1 text-xs font-semibold text-gray-700">Robots</div>
                  <div className="text-sm text-gray-800">
                    {page.scrapedRobots ?? (page.seoRobotsNoindex ? "noindex" : "index")}
                  </div>
                </div>

                {(page.scrapedOgTitle || page.scrapedOgDescription) && (
                  <div className="rounded-md border bg-gray-50 p-3">
                    <div className="mb-1 text-xs font-semibold text-gray-700">Open Graph</div>
                    <div className="text-sm text-gray-800">
                      <div><span className="font-medium">og:title:</span> {page.scrapedOgTitle ?? "—"}</div>
                      <div><span className="font-medium">og:description:</span> {page.scrapedOgDescription ?? "—"}</div>
                    </div>
                  </div>
                )}

                {page.scrapedH1?.length ? (
                  <div className="rounded-md border bg-gray-50 p-3">
                    <div className="mb-1 text-xs font-semibold text-gray-700">H1</div>
                    <ul className="list-disc pl-5 text-sm text-gray-800">
                      {page.scrapedH1.map((h, i) => <li key={i}>{h}</li>)}
                    </ul>
                  </div>
                ) : null}

                {/* quick metrics */}
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

            {/* Lighthouse */}
            <div className="rounded-xl border border-gray-200 bg-white p-3">
              <div className="mb-2 flex items-center justify-between">
                <div className="text-sm font-medium text-gray-900">Lighthouse Scores</div>
                <form action={refreshLighthouseAction}>
                  <input type="hidden" name="pageId" value={page.id} />
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

          {/* FOOTER: AI SEO Insight (Medium-like prose) + SEO Checklist */}
          <div className="md:col-span-12 space-y-3">
            {/* AI SEO Insight */}
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-sm font-semibold text-gray-900">
                  AI SEO Insight <span className="ml-1 text-xs text-gray-500">({langLabel(language)})</span>
                </div>
                <form action={aiSeoInsightAction}>
                  <input type="hidden" name="pageId" value={page.id} />
                  <input type="hidden" name="projectId" value={projectId} />
                  <input type="hidden" name="preferredLanguage" value={language} />
                  <SubmitButton
                    aria-label="Re-run analysis"
                    title="Re-run analysis"
                    className="inline-flex h-9 items-center justify-center rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Sparkles className="mr-1 h-4 w-4" />
                    วิเคราะห์ใหม่
                  </SubmitButton>
                </form>
              </div>

              {/* ใช้ prose ให้เหมือน Medium */}
               {page.aiSeoInsight ? (
                <MarkdownProse markdown={page.aiSeoInsight} />
              ) : (
                <p className="text-sm text-gray-500">ยังไม่มี Insight — กด “วิเคราะห์ใหม่” เพื่อให้ AI สรุปคำแนะนำ</p>
              )}
            </div>

            {/* SEO Checklist — now includes tool connectivity if available */}
            <SeoChecklist
              items={[
                // content/tech basics (derive rough booleans from page)
                { ok: !!page.pageName?.trim(), label: "Page name set" },
                { ok: !!page.pageUrl && (page.pageUrl.startsWith("/") || page.pageUrl.startsWith("http")), label: "Valid page URL" },
                { ok: !!page.pageMetaDescription?.trim(), label: "Meta description present" },
                { ok: (page.pageSeoKeywords?.length ?? 0) > 0, label: "SEO keywords set" },
                { ok: !!page.figmaCaptureUrl, label: "Figma capture synced" },
                { ok: !!page.figmaTextContent?.trim(), label: "Figma text extracted" },
                { ok: typeof page.lighthousePerf === "number", label: "Lighthouse: Performance recorded" },
                { ok: typeof page.lighthouseSeo === "number", label: "Lighthouse: SEO recorded" },
                { ok: typeof page.lighthouseAccessibility === "number", label: "Lighthouse: Accessibility recorded" },
                // tool connectivity
                { ok: !!page.gscConnected, label: "Connected: Google Search Console" },
                { ok: !!page.baiduConnected, label: "Connected: Baidu Webmaster" },
              ]}
              title="SEO Checklist"
            />
          </div>
        </div>
      </details>

      <div className="mt-2 text-xs text-gray-500">
        Updated: {new Date(page.updatedAt as any).toLocaleString()}
      </div>
    </div>
  );
}
