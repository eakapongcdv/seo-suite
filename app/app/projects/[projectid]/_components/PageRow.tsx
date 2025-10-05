// app/app/projects/[projectid]/_components/PageRow.tsx
import Link from "next/link";
import {
  Save as SaveIcon,
  Trash2,
  Sparkles,
  ChevronDown,
  ExternalLink,
} from "lucide-react";
import SeoChecklist from "./SeoChecklist";
import Circular from "./Circular";
import PendingSpinnerIcon from "@/app/components/PendingSpinnerIcon";

import {
  updatePageAction,
  deletePageAction,
  syncFigmaAction,
  recommendSeoKeywordsAction,
  refreshLighthouseAction
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
    pageContentKeywords: string[] | null;

    figmaNodeId: string | null;
    figmaCaptureUrl: string | null;
    figmaCapturedAt: Date | string | null;
    figmaTextContent: string | null;

    lighthousePerf: number | null;
    lighthouseSeo: number | null;
    lighthouseAccessibility: number | null;

    updatedAt: Date | string;
  };
};

export default function PageRow({ projectId, page }: PageRowProps) {
  const checks = [
    { ok: !!page?.pageMetaDescription?.trim(), label: "Meta description" },
    { ok: (page?.pageSeoKeywords?.length ?? 0) > 0, label: "SEO keywords" },
    { ok: !!page?.figmaCaptureUrl, label: "Figma capture" },
    { ok: !!page?.figmaTextContent?.trim(), label: "Figma text extracted" },
    { ok: page?.pageUrl?.startsWith("/") || page?.pageUrl?.startsWith("http"), label: "Valid URL" },
    { ok: typeof page?.lighthouseSeo === "number", label: "Lighthouse: SEO" },
    { ok: typeof page?.lighthousePerf === "number", label: "Lighthouse: Performance" },
    { ok: typeof page?.lighthouseAccessibility === "number", label: "Lighthouse: Accessibility" },
  ];
  const checksDone = checks.filter((c) => c.ok).length;
  const checksPct = Math.round((checksDone / checks.length) * 100);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      {/* แถวบน: ฟอร์มแก้ไขหลัก + ลบ (พี่น้องกัน ไม่ซ้อนกัน) */}
      <div className="grid grid-cols-1 items-end gap-3 md:grid-cols-12">
        {/* UPDATE: ชื่อ/URL/ลำดับ */}
        <form action={updatePageAction} className="contents">
          <input type="hidden" name="id" value={page?.id} />
          <input type="hidden" name="projectId" value={projectId} />

          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-medium text-gray-700">Sort Number</label>
            <input
              name="sortNumber"
              type="number"
              defaultValue={page?.sortNumber ?? 0}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>

          <div className="md:col-span-4">
            <label className="mb-1 block text-xs font-medium text-gray-700">Page Name</label>
            <input
              name="pageName"
              defaultValue={page?.pageName}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>

          <div className="md:col-span-4">
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <label className="mb-1 block text-xs font-medium text-gray-700">Page URL</label>
                <input
                  name="pageUrl"
                  defaultValue={page?.pageUrl}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
              {page?.pageUrl ? (
                <Link
                  href={page?.pageUrl.startsWith("/") ? page?.pageUrl : page?.pageUrl}
                  target={page?.pageUrl.startsWith("/") ? "_self" : "_blank"}
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
            <input type="hidden" name="id" value={page?.id} />
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

      {/* Expand/Collapse: Figma & SEO + Checklist */}
      <details className="mt-3 rounded-xl border border-gray-200 bg-gray-50 p-0 open:shadow-inner">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-xl p-3 text-sm font-medium text-gray-800 hover:bg-gray-100">
          <span className="inline-flex items-center gap-2">
            <ChevronDown className="h-4 w-4 transition-transform duration-200" />
            Figma & SEO
          </span>
          <span className="text-xs text-gray-500">
            {page?.figmaCapturedAt
              ? `Last synced: ${new Date(page?.figmaCapturedAt as any).toLocaleString()}`
              : "Not synced yet"}
          </span>
        </summary>

        <div className="grid grid-cols-1 gap-3 p-3 md:grid-cols-12">
          {/* ============ บรรทัด 1: Figma Sync + AI Recommend (ฟอร์มพี่น้อง) ============ */}
          <div className="md:col-span-12 grid grid-cols-1 items-end gap-2 md:grid-cols-12">
            {/* SYNC FIGMA */}
            <form action={syncFigmaAction} className="md:col-span-8 flex gap-2">
              <input type="hidden" name="pageId" value={page?.id} />
              <input type="hidden" name="projectId" value={projectId} />
              <input
                name="figmaNodeId"
                defaultValue={page?.figmaNodeId ?? ""}
                placeholder="e.g., 1:23"
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
              <button
                type="submit"
                aria-label="Sync Figma"
                title="Sync Figma"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <PendingSpinnerIcon />
                <span className="sr-only">Sync Figma</span>
              </button>
            </form>

            {/* AI Recommend SEO Keywords */}
            <form action={recommendSeoKeywordsAction} className="md:col-span-4 flex justify-end">
              <input type="hidden" name="pageId" value={page?.id} />
              <input type="hidden" name="projectId" value={projectId} />
              <button
                type="submit"
                aria-label="AI: SEO Keyword Recommend"
                title="AI: SEO Keyword Recommend"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-transparent bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <Sparkles className="h-4 w-4" />
                <span className="sr-only">AI: SEO Keyword Recommend</span>
              </button>
            </form>
          </div>

          {/* ============ บรรทัด 2: Preview + Keywords ============ */}
          <div className="md:col-span-6">
            <div className="mb-1 text-sm font-medium text-gray-800">Capture Preview</div>
            {page?.figmaCaptureUrl ? (
              <div className="max-h-[500px] overflow-auto rounded-md border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={page?.figmaCaptureUrl}
                  alt="Figma capture"
                  className="block h-auto w-full"
                />
              </div>
            ) : (
              <div className="rounded-md border p-4 text-center text-sm text-gray-400">
                No capture yet
              </div>
            )}
          </div>

          <div className="space-y-3 md:col-span-6">
            <div>
              <div className="mb-1 text-sm font-medium text-gray-800">Content Keywords (from Figma)</div>
              <div className="min-h-[56px] rounded-md border bg-white p-3 text-sm text-gray-700">
                {page?.pageContentKeywords?.length ? (
                  <div className="flex flex-wrap gap-1.5">
                    {page?.pageContentKeywords.map((k) => (
                      <span
                        key={k}
                        className="inline-flex items-center rounded-full border bg-gray-100 px-2 py-0.5 text-xs text-gray-800"
                      >
                        {k}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-gray-400">No keywords yet</span>
                )}
              </div>
            </div>

            <div>
              <div className="mb-1 text-sm font-medium text-gray-800">SEO Keywords</div>
              <div className="min-h-[56px] rounded-md border bg-white p-3 text-sm text-gray-700">
                {page?.pageSeoKeywords?.length ? (
                  <div className="flex flex-wrap gap-1.5">
                    {page?.pageSeoKeywords.map((k) => (
                      <span
                        key={k}
                        className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-xs text-indigo-700"
                      >
                        {k}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-gray-400">No SEO keywords yet (use AI button or form below).</span>
                )}
              </div>
            </div>

            {page?.figmaTextContent ? (
              <div>
                <div className="mb-1 text-xs text-gray-500">Extracted Text (raw)</div>
                <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded-md border bg-white p-3 text-xs text-gray-700">
                  {page?.figmaTextContent}
                </pre>
              </div>
            ) : null}
          </div>

          {/* ============ บรรทัด 3: Meta Tags Form ============ */}
          <div className="md:col-span-6">
            <div className="rounded-xl border border-gray-200 bg-white p-3">
              <div className="mb-2 text-sm font-medium text-gray-900">Meta Tags</div>
              <form action={updatePageAction} className="grid grid-cols-1 gap-3">
                <input type="hidden" name="id" value={page?.id} />
                <input type="hidden" name="projectId" value={projectId} />

                {/* สรุป/คำอธิบายย่อของคอนเทนต์ (optional) */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">
                    Content Summary (pageDescriptionSummary)
                  </label>
                  <textarea
                    name="pageDescriptionSummary"
                    defaultValue={page?.pageDescriptionSummary ?? ""}
                    placeholder="Short content summary for internal reference"
                    rows={2}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>

                {/* Meta description ที่ใช้จริง */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">Meta Description</label>
                  <textarea
                    name="pageMetaDescription"
                    defaultValue={page?.pageMetaDescription ?? ""}
                    placeholder="Ideal 150–160 chars with primary keywords"
                    rows={3}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>

                {/* SEO Keywords (comma separated) */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">
                    SEO Keywords (comma separated)
                  </label>
                  <input
                    name="pageSeoKeywords"
                    defaultValue={(page?.pageSeoKeywords ?? []).join(", ")}
                    placeholder="e.g., pricing, subscription, SaaS billing"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    aria-label="Save Meta"
                    title="Save Meta"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <SaveIcon className="h-4 w-4" />
                    <span className="sr-only">Save Meta</span>
                  </button>
                </div>
              </form>
            </div>
          </div>

       
          {/* ============ บรรทัด 3: Lighthouse Form ============ */}
          <div className="md:col-span-6">
            <div className="rounded-xl border border-gray-200 bg-white p-3">
              <div className="mb-2 flex items-center justify-between">
                <div className="text-sm font-medium text-gray-900">Lighthouse Scores</div>

                {/* ⚡️ ปุ่ม Refresh Lighthouse (ฟอร์มพี่น้อง แยกจากฟอร์มอัปเดตค่าด้านล่าง) */}
                <form action={refreshLighthouseAction}>
                  <input type="hidden" name="pageId" value={page?.id} />
                  <input type="hidden" name="projectId" value={projectId} />
                  <button
                    type="submit"
                    aria-label="Refresh Lighthouse"
                    title="Refresh Lighthouse"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                  >
                    <PendingSpinnerIcon />
                  </button>
                </form>
              </div>

              <div className="mb-2 flex gap-3">
                <Circular value={Number(page?.lighthouseSeo ?? 0)} label="SEO" />
                <Circular value={Number(page?.lighthousePerf ?? 0)} label="Perf" />
                <Circular value={Number(page?.lighthouseAccessibility ?? 0)} label="A11y" />
              </div>

            </div>
          </div>


          {/* ============ เช็กลิสต์รวม ============ */}
          <div className="md:col-span-12">
            <SeoChecklist page={page as any} />
          </div>
        </div>
      </details>

      <div className="mt-2 text-xs text-gray-500">Updated: {new Date(page?.updatedAt as any).toLocaleString()}</div>
    </div>
  );
}
