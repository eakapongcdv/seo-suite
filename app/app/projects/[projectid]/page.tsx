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
} from "lucide-react";

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

async function getData(projectId: string) {
  return prisma.project.findUnique({
    where: { id: projectId },
    include: {
      pages: {
        orderBy: [{ sortNumber: "asc" }, { updatedAt: "desc" }],
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

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{project.siteName}</h1>
          <div className="mt-1 text-sm text-gray-500">{project.siteUrl}</div>
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

      {/* Create new page */}
      <form
        action={createPageAction}
        className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
      >
        <input type="hidden" name="projectId" value={data.id} />
        <div className="mb-3 text-base font-semibold text-gray-900">Add New Page</div>

        <div className="grid grid-cols-1 items-end gap-3 md:grid-cols-12">
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-medium text-gray-700">Sort Number</label>
            <input
              name="sortNumber"
              type="number"
              defaultValue={0}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
          <div className="md:col-span-4">
            <label className="mb-1 block text-xs font-medium text-gray-700">Page Name</label>
            <input
              name="pageName"
              placeholder="e.g., About Us"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
          <div className="md:col-span-4">
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

          <div className="md:col-span-12 flex justify-end">
            <button
              type="submit"
              aria-label="Add Page"
              title="Add Page"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-transparent bg-indigo-600 text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <Plus className="h-4 w-4" />
              <span className="sr-only">Add Page</span>
            </button>
          </div>
        </div>
      </form>

      {/* List & inline edit */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Pages</h2>
          <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-800">
            {data.pages.length} {data.pages.length === 1 ? "page" : "pages"}
          </span>
        </div>

        {data.pages.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
            <p className="text-gray-500">No pages yet. Add your first page to get started.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {data.pages.map((pg) => (
              <div key={pg.id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                {/* Inline edit row (ฟอร์ม update + ฟอร์ม delete เป็นพี่น้องกัน ไม่ซ้อน) */}
                <div className="grid grid-cols-1 items-end gap-3 md:grid-cols-12">
                  {/* UPDATE FORM */}
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

                  {/* DELETE FORM (พี่น้อง แยกต่างหาก) */}
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

                {/* Expand/Collapse: Figma + SEO (ไม่มีฟอร์มซ้อนกัน) */}
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
                  </div>
                </details>

                <div className="mt-2 text-xs text-gray-500">Updated: {pg.updatedAt.toLocaleString()}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
