// app/app/projects/[projectid]/_components/PageRow.tsx
import { Save as SaveIcon, Trash2, RefreshCw, Sparkles, ChevronDown } from "lucide-react";
import { updatePageAction, deletePageAction, syncFigmaAction, recommendSeoKeywordsAction } from "../actions";
import SeoChecklist, { ChecklistItem } from "./SeoChecklist";

type Page = {
  id: string;
  sortNumber: number | null;
  pageName: string;
  pageUrl: string;
  pageSeoKeywords: string[] | null;
  pageContentKeywords: string[] | null;
  pageMetaDescription: string | null;
  figmaNodeId: string | null;
  figmaCaptureUrl: string | null;
  figmaCapturedAt: Date | string | null;
  figmaTextContent: string | null;
  lighthouseSeo: number | null;
  updatedAt: Date | string;
};

export default function PageRow({ pg, projectId }: { pg: Page; projectId: string }) {
  const checks: ChecklistItem[] = [
    { ok: !!pg.pageMetaDescription?.trim(), label: "Meta description" },
    { ok: (pg.pageSeoKeywords?.length ?? 0) > 0, label: "SEO keywords" },
    { ok: !!pg.figmaCaptureUrl, label: "Figma capture" },
    { ok: !!pg.figmaTextContent?.trim(), label: "Figma text extracted" },
  ];

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      {/* UPDATE + DELETE (siblings, no nested form) */}
      <div className="grid grid-cols-1 items-end gap-3 md:grid-cols-12">
        <form action={updatePageAction} className="contents">
          <input type="hidden" name="id" value={pg.id} />
          <input type="hidden" name="projectId" value={projectId} />

          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-medium text-gray-700">Sort Number</label>
            <input
              name="sortNumber" type="number" defaultValue={pg.sortNumber ?? 0}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>

          <div className="md:col-span-4">
            <label className="mb-1 block text-xs font-medium text-gray-700">Page Name</label>
            <input
              name="pageName" defaultValue={pg.pageName}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>

          <div className="md:col-span-4">
            <label className="mb-1 block text-xs font-medium text-gray-700">Page URL</label>
            <input
              name="pageUrl" defaultValue={pg.pageUrl}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>

          <div className="md:col-span-1">
            <button
              type="submit" aria-label="Save" title="Save"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <SaveIcon className="h-4 w-4" />
              <span className="sr-only">Save</span>
            </button>
          </div>
        </form>

        <div className="md:col-span-1 flex justify-end">
          <form action={deletePageAction}>
            <input type="hidden" name="id" value={pg.id} />
            <input type="hidden" name="projectId" value={projectId} />
            <button
              type="submit" aria-label="Delete" title="Delete"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-transparent bg-red-100 text-red-700 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <Trash2 className="h-4 w-4" />
              <span className="sr-only">Delete</span>
            </button>
          </form>
        </div>
      </div>

      {/* Expand Figma & SEO */}
      <details className="mt-3 rounded-xl border border-gray-200 bg-gray-50 p-0 open:shadow-inner">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-xl p-3 text-sm font-medium text-gray-800 hover:bg-gray-100">
          <span className="inline-flex items-center gap-2">
            <ChevronDown className="h-4 w-4 transition-transform duration-200" />
            Figma & SEO
          </span>
          <span className="text-xs text-gray-500">
            {pg.figmaCapturedAt ? `Last synced: ${new Date(pg.figmaCapturedAt as any).toLocaleString()}` : "Not synced yet"}
          </span>
        </summary>

        <div className="grid grid-cols-1 gap-3 p-3 md:grid-cols-12">
          {/* sibling forms */}
          <div className="md:col-span-12 grid grid-cols-1 items-end gap-2 md:grid-cols-12">
            <form action={syncFigmaAction} className="md:col-span-8 flex gap-2">
              <input type="hidden" name="pageId" value={pg.id} />
              <input type="hidden" name="projectId" value={projectId} />
              <input
                name="figmaNodeId"
                defaultValue={pg.figmaNodeId ?? ""}
                placeholder="e.g., 1:23"
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
              <button
                type="submit" aria-label="Sync Figma" title="Sync Figma"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <RefreshCw className="h-4 w-4" />
                <span className="sr-only">Sync Figma</span>
              </button>
            </form>

            <form action={recommendSeoKeywordsAction} className="md:col-span-4 flex justify-end">
              <input type="hidden" name="pageId" value={pg.id} />
              <input type="hidden" name="projectId" value={projectId} />
              <button
                type="submit" aria-label="AI: SEO Keyword Recommend" title="AI: SEO Keyword Recommend"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-transparent bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <Sparkles className="h-4 w-4" />
                <span className="sr-only">AI: SEO Keyword Recommend</span>
              </button>
            </form>
          </div>

          {/* preview + keywords */}
          <div className="md:col-span-6">
            <div className="mb-1 text-sm font-medium text-gray-800">Capture Preview</div>
            {pg.figmaCaptureUrl ? (
              <div className="max-h-[500px] overflow-auto rounded-md border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={pg.figmaCaptureUrl} alt="Figma capture" className="block h-auto w-full" />
              </div>
            ) : (
              <div className="rounded-md border p-4 text-center text-sm text-gray-400">No capture yet</div>
            )}
          </div>

          <div className="space-y-3 md:col-span-6">
            <div>
              <div className="mb-1 text-sm font-medium text-gray-800">Content Keywords (from Figma)</div>
              <div className="min-h-[56px] rounded-md border bg-white p-3 text-sm text-gray-700">
                {pg.pageContentKeywords?.length ? (
                  <div className="flex flex-wrap gap-1.5">
                    {pg.pageContentKeywords.map((k) => (
                      <span key={k} className="inline-flex items-center rounded-full border bg-gray-100 px-2 py-0.5 text-xs text-gray-800">
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
                {pg.pageSeoKeywords?.length ? (
                  <div className="flex flex-wrap gap-1.5">
                    {pg.pageSeoKeywords.map((k) => (
                      <span key={k} className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-xs text-indigo-700">
                        {k}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-gray-400">No SEO keywords yet (use AI button).</span>
                )}
              </div>
            </div>

            {pg.figmaTextContent ? (
              <div>
                <div className="mb-1 text-xs text-gray-500">Extracted Text (raw)</div>
                <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded-md border bg-white p-3 text-xs text-gray-700">
                  {pg.figmaTextContent}
                </pre>
              </div>
            ) : null}
          </div>

          <div className="md:col-span-12">
           <SeoChecklist page={pg as any} />
          </div>
        </div>
      </details>

      <div className="mt-2 text-xs text-gray-500">Updated: {new Date(pg.updatedAt as any).toLocaleString()}</div>
    </div>
  );
}
