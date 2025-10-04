// app/app/projects/[projectid]/page.tsx
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  ArrowLeft,
  Plus,
  Save as SaveIcon,
  Trash2,
  RefreshCw,
  Sparkles,
  ChevronDown,
  CheckCircle2,
  XCircle,
  X,
  ExternalLink,
} from "lucide-react";
import ModalToggleButton from "@/app/components/ModalToggleButton";

import {
  createPageAction,
  updatePageAction,
  deletePageAction,
  syncFigmaAction,
  recommendSeoKeywordsAction,
} from "./actions";

export const dynamic = "force-dynamic";

type Params = { projectid: string };

async function ensureOwner(projectId: string) {
  const session = await auth();
  if (!session?.user?.id) return null;
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, ownerId: true, siteName: true, siteUrl: true },
  });
  if (!project || project.ownerId !== session.user.id) return null;
  return project;
}

function avg(nums: number[]) {
  const valid = nums.filter((n) => typeof n === "number" && !Number.isNaN(n));
  if (valid.length === 0) return 0;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}

function Circular({ value, label }: { value: number; label: string }) {
  const r = 18;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  const dash = (1 - clamped / 100) * c;

  return (
    <div className="flex items-center gap-3">
      <svg viewBox="0 0 48 48" className="h-12 w-12">
        <circle cx="24" cy="24" r={r} strokeWidth="6" className="fill-none stroke-gray-200" />
        <circle
          cx="24"
          cy="24"
          r={r}
          strokeWidth="6"
          className="fill-none stroke-indigo-600 transition-all"
          strokeDasharray={c}
          strokeDashoffset={dash}
          strokeLinecap="round"
          transform="rotate(-90 24 24)"
        />
        <text x="50%" y="52%" textAnchor="middle" dominantBaseline="middle" className="text-[10px] fill-gray-800">
          {clamped}%
        </text>
      </svg>
      <div className="text-xs text-gray-600">{label}</div>
    </div>
  );
}

async function getData(projectId: string) {
  return prisma.project.findUnique({
    where: { id: projectId },
    include: {
      pages: {
        orderBy: [{ sortNumber: "asc" }, { updatedAt: "desc" }],
        select: {
          id: true,
          sortNumber: true,
          pageName: true,
          pageUrl: true,
          pageSeoKeywords: true,
          pageContentKeywords: true,
          pageMetaDescription: true,
          figmaNodeId: true,
          figmaCaptureUrl: true,
          figmaCapturedAt: true,
          figmaTextContent: true,
          lighthouseSeo: true,
          updatedAt: true,
        },
      },
    },
  });
}

export default async function ProjectEditor({ params }: { params: Params }) {
  const { projectid: projectId } = params;

  const project = await ensureOwner(projectId);
  if (!project) {
    return (
      <div className="space-y-4 p-6">
        <h1 className="text-xl font-semibold">Project not found</h1>
        <p className="text-sm text-gray-600">You may not have access to this project.</p>
        <Link
          aria-label="Back to Projects"
          href="/app/projects"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          title="Back"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="sr-only">Back to Projects</span>
        </Link>
      </div>
    );
  }

  const data = await getData(projectId);
  if (!data) return <div className="p-6">Project not found.</div>;

  // Project-level metrics
  const totalPages = data.pages.length;
  const checklistDone = data.pages.filter((pg) => (pg.pageSeoKeywords?.length ?? 0) > 0).length;
  const checklistPct = totalPages > 0 ? (checklistDone / totalPages) * 100 : 0;
  const seoScores = data.pages
    .map((pg) => (typeof pg.lighthouseSeo === "number" ? pg.lighthouseSeo : NaN))
    .filter((n) => !Number.isNaN(n));
  const seoAvg = Math.round(avg(seoScores));

  return (
    <div className="w-full space-y-6 px-4 py-6 sm:px-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <h1 className="truncate text-3xl font-bold text-gray-900">{project.siteName}</h1>
          <div className="mt-1 flex items-center gap-2 text-sm text-gray-500">
            <span className="truncate">{project.siteUrl}</span>
            <Link
              href={project.siteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
              title="Open site"
              aria-label="Open site"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        <Link
          aria-label="Back to Projects"
          href="/app/projects"
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gray-300 bg-white text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          title="Back to Projects"
        >
          <ArrowLeft className="h-5 w-5" />
          <span className="sr-only">Back to Projects</span>
        </Link>
      </div>

      {/* Project metrics (full width) */}
      <div className="grid grid-cols-1 gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:grid-cols-3">
        <div className="text-sm text-gray-700">
          <div className="text-xs text-gray-500">Pages</div>
          <div className="text-base font-semibold">{totalPages}</div>
        </div>
        <div>
          <Circular value={totalPages > 0 ? checklistPct : 0} label={`${checklistDone}/${totalPages} pages with SEO keywords`} />
        </div>
        <div>
          <Circular value={seoAvg} label={`Avg SEO score: ${seoAvg}/100`} />
        </div>
      </div>

      {/* Add new page: icon button + modal */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Pages</h2>
        <details className="relative">
          <summary
            className="list-none inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-gray-300 bg-white text-gray-700 shadow-sm hover:bg-gray-50"
            aria-label="Add Page"
            title="Add Page"
          >
            <Plus className="h-5 w-5" />
          </summary>

          <div className="absolute right-0 z-20 mt-2 w-[560px] rounded-2xl border border-gray-200 bg-white p-5 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-base font-semibold">Add New Page</div>
              <ModalToggleButton
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </ModalToggleButton>
            </div>

            <form action={createPageAction} className="space-y-3">
              <input type="hidden" name="projectId" value={data.id} />
              <div className="grid gap-3 md:grid-cols-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">Sort Number</label>
                  <input
                    name="sortNumber"
                    type="number"
                    defaultValue={0}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-gray-700">Page Name</label>
                  <input
                    name="pageName"
                    placeholder="e.g., About Us"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">Page URL</label>
                  <input
                    name="pageUrl"
                    placeholder="e.g., /about"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-gray-700">Figma Node ID (optional)</label>
                  <input
                    name="figmaNodeId"
                    placeholder="e.g., 1:23"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <ModalToggleButton className="inline-flex h-9 items-center justify-center rounded-lg border border-gray-300 bg-white px-4 text-sm hover:bg-gray-50">
                  Cancel
                </ModalToggleButton>
                <button
                  type="submit"
                  className="inline-flex h-9 items-center justify-center rounded-lg bg-indigo-600 px-4 text-sm font-medium text-white hover:bg-indigo-700"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </details>
      </div>

      {/* List & inline edit */}
      <div className="grid gap-3">
        {data.pages.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
            <p className="text-gray-500">No pages yet. Add your first page to get started.</p>
          </div>
        ) : (
          data.pages.map((pg) => {
            // Checklist ต่อหน้า
            const checks = [
              { ok: !!pg.pageMetaDescription?.trim(), label: "Meta description" },
              { ok: (pg.pageSeoKeywords?.length ?? 0) > 0, label: "SEO keywords" },
              { ok: !!pg.figmaCaptureUrl, label: "Figma capture" },
              { ok: !!pg.figmaTextContent?.trim(), label: "Figma text extracted" },
            ];
            const checksDone = checks.filter((c) => c.ok).length;
            const checksPct = Math.round((checksDone / checks.length) * 100);

            return (
              <div key={pg.id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                {/* Inline edit row (UPDATE + DELETE forms แยกกัน) */}
                <div className="grid grid-cols-1 items-end gap-3 md:grid-cols-12">
                  <form action={updatePageAction} className="contents">
                    <input type="hidden" name="id" value={pg.id} />
                    <input type="hidden" name="projectId" value={data.id} />

                    <div className="md:col-span-2">
                      <label className="mb-1 block text-xs font-medium text-gray-700">Sort Number</label>
                      <input
                        name="sortNumber"
                        type="number"
                        defaultValue={pg.sortNumber ?? 0}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                      />
                    </div>

                    <div className="md:col-span-4">
                      <label className="mb-1 block text-xs font-medium text-gray-700">Page Name</label>
                      <input
                        name="pageName"
                        defaultValue={pg.pageName}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                      />
                    </div>

                    <div className="md:col-span-4">
                      <label className="mb-1 block text-xs font-medium text-gray-700">Page URL</label>
                      <input
                        name="pageUrl"
                        defaultValue={pg.pageUrl}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                      />
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

                  <div className="md:col-span-1 flex justify-end">
                    <form action={deletePageAction}>
                      <input type="hidden" name="id" value={pg.id} />
                      <input type="hidden" name="projectId" value={data.id} />
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
                      {pg.figmaCapturedAt
                        ? `Last synced: ${new Date(pg.figmaCapturedAt as any).toLocaleString()}`
                        : "Not synced yet"}
                    </span>
                  </summary>

                  <div className="grid grid-cols-1 gap-3 p-3 md:grid-cols-12">
                    {/* แถวบน: สองฟอร์มเป็นพี่น้องกัน */}
                    <div className="md:col-span-12 grid grid-cols-1 items-end gap-2 md:grid-cols-12">
                      {/* SYNC FORM */}
                      <form action={syncFigmaAction} className="md:col-span-8 flex gap-2">
                        <input type="hidden" name="pageId" value={pg.id} />
                        <input type="hidden" name="projectId" value={data.id} />
                        <input
                          name="figmaNodeId"
                          defaultValue={pg.figmaNodeId ?? ""}
                          placeholder="e.g., 1:23"
                          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                        />
                        <button
                          type="submit"
                          aria-label="Sync Figma"
                          title="Sync Figma"
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          <RefreshCw className="h-4 w-4" />
                          <span className="sr-only">Sync Figma</span>
                        </button>
                      </form>

                      {/* AI FORM */}
                      <form action={recommendSeoKeywordsAction} className="md:col-span-4 flex justify-end">
                        <input type="hidden" name="pageId" value={pg.id} />
                        <input type="hidden" name="projectId" value={data.id} />
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

                    {/* Preview + Keywords */}
                    <div className="md:col-span-6">
                      <div className="mb-1 text-sm font-medium text-gray-800">Capture Preview</div>
                      {pg.figmaCaptureUrl ? (
                        <div className="max-h-[500px] overflow-auto rounded-md border">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={pg.figmaCaptureUrl}
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
                          {pg.pageContentKeywords?.length ? (
                            <div className="flex flex-wrap gap-1.5">
                              {pg.pageContentKeywords.map((k) => (
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
                          {pg.pageSeoKeywords?.length ? (
                            <div className="flex flex-wrap gap-1.5">
                              {pg.pageSeoKeywords.map((k) => (
                                <span
                                  key={k}
                                  className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-xs text-indigo-700"
                                >
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

                    {/* SEO Checklist (ใต้ Figma & SEO) */}
                    <div className="md:col-span-12">
                      <div className="mt-2 rounded-lg border border-gray-200 bg-white p-3">
                        <div className="mb-2 flex items-center justify-between">
                          <div className="text-sm font-medium text-gray-900">SEO Checklist</div>
                          <Circular value={checksPct} label={`${checksDone}/${checks.length}`} />
                        </div>
                        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          {checks.map((c) => (
                            <li key={c.label} className="flex items-center gap-2 text-sm">
                              {c.ok ? (
                                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                              ) : (
                                <XCircle className="h-4 w-4 text-gray-300" />
                              )}
                              <span className={c.ok ? "text-gray-800" : "text-gray-500"}>{c.label}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </details>

                <div className="mt-2 text-xs text-gray-500">Updated: {pg.updatedAt.toLocaleString()}</div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
