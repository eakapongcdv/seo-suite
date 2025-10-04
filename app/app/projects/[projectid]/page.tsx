// app/app/projects/[projectid]/page.tsx
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import SyncButton from "@/app/components/SyncButton";

import {
  createPageAction,
  updatePageAction,
  deletePageAction,
  syncFigmaAction,
  recommendSeoKeywordsAction, // ⬅️ ใช้ปุ่ม AI
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
        orderBy: [{ sortNumber: "asc" }, { updatedAt: "desc" }], // ⬅️ sort ตาม sortNumber ก่อน
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
        <Link href="/app/projects" className="text-sm underline text-blue-600 hover:text-blue-800">
          Back to Projects
        </Link>
      </div>
    );
  }

  const data = await getData(projectId);
  if (!data) return <div className="p-6">Project not found.</div>;

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{project.siteName}</h1>
          <div className="text-sm text-gray-500 mt-1">{project.siteUrl}</div>
        </div>
        <Link
          href="/app/projects"
          className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          Back to Projects
        </Link>
      </div>

      {/* Create new page */}
      <form action={createPageAction} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <input type="hidden" name="projectId" value={data.id} />
        <div className="font-semibold text-gray-900 mb-4">Add New Page</div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Page Name</label>
            <input
              name="pageName"
              placeholder="e.g., About Us"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Page URL</label>
            <input
              name="pageUrl"
              placeholder="e.g., /about"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Figma Node ID (optional)</label>
            <input
              name="figmaNodeId"
              placeholder="e.g., 1:23"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sort Number</label>
            <input
              name="sortNumber"
              type="number"
              defaultValue={0}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
        </div>
        <div className="mt-4">
          <button
            type="submit"
            className="inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            Add Page
          </button>
        </div>
      </form>

      {/* List & inline edit */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Pages</h2>
          <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-800">
            {data.pages.length} {data.pages.length === 1 ? "page" : "pages"}
          </span>
        </div>

        {data.pages.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
            <p className="text-gray-500">No pages yet. Add your first page to get started.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {data.pages.map((pg) => (
              <div key={pg.id} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-12 items-end">
                  <form action={updatePageAction} className="contents">
                    <input type="hidden" name="id" value={pg.id} />
                    <input type="hidden" name="projectId" value={data.id} />

                    <div className="md:col-span-3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Page Name</label>
                      <input
                        name="pageName"
                        defaultValue={pg.pageName}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="md:col-span-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Page URL</label>
                      <input
                        name="pageUrl"
                        defaultValue={pg.pageUrl}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Sort Number</label>
                      <input
                        name="sortNumber"
                        type="number"
                        defaultValue={pg.sortNumber ?? 0}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="md:col-span-3 flex gap-2">
                      <button
                        type="submit"
                        className="flex-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        Save
                      </button>
                    </div>
                  </form>

                  <form action={deletePageAction} className="md:col-span-12 md:col-start-10 md:col-end-13 mt-4 md:mt-0">
                    <input type="hidden" name="id" value={pg.id} />
                    <input type="hidden" name="projectId" value={data.id} />
                    <button
                      type="submit"
                      className="w-full md:w-auto rounded-md border border-transparent bg-red-100 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      Delete
                    </button>
                  </form>
                </div>

                {/* Figma Sync + SEO section */}
                <div className="mt-4 rounded-lg border border-gray-200 p-4 bg-gray-50">
                  <form action={syncFigmaAction} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                    <input type="hidden" name="pageId" value={pg.id} />
                    <input type="hidden" name="projectId" value={data.id} />

                    <div className="md:col-span-5">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Figma Node ID</label>
                      <input
                        name="figmaNodeId"
                        defaultValue={pg.figmaNodeId ?? ""}
                        placeholder="e.g., 1:23"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      />
                      <p className="mt-1 text-[11px] text-gray-500">ใช้ Figma Images API เพื่อดึง PNG (URL มีอายุชั่วคราว)</p>
                    </div>

                    <div className="md:col-span-3">
                      <SyncButton />
                    </div>

                    <div className="md:col-span-4 text-xs text-gray-500">
                      {pg.figmaCapturedAt ? (
                        <div>Last synced: {new Date(pg.figmaCapturedAt as any).toLocaleString()}</div>
                      ) : (
                        <div>Not synced yet</div>
                      )}
                    </div>
                  </form>

                  <div className="mt-4 grid grid-cols-1 md:grid-cols-12 gap-4">
                    <div className="md:col-span-5">
                      <div className="text-sm font-medium text-gray-800 mb-1">Capture Preview</div>
                      {pg.figmaCaptureUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={pg.figmaCaptureUrl} alt="Figma capture" className="w-full h-auto rounded-md border" />
                      ) : (
                        <div className="text-gray-400 text-sm border rounded-md p-4 text-center">No capture yet</div>
                      )}
                    </div>

                    <div className="md:col-span-7 space-y-3">
                      {/* Content Keywords (จาก Figma) */}
                      <div>
                        <div className="text-sm font-medium text-gray-800 mb-1">Content Keywords (from Figma)</div>
                        <div className="rounded-md border bg-white p-3 text-sm text-gray-700 min-h-[56px]">
                          {pg.pageContentKeywords?.length ? (
                            <div className="flex flex-wrap gap-2">
                              {pg.pageContentKeywords.map((k) => (
                                <span key={k} className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-800 border">
                                  {k}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-gray-400">No keywords yet</span>
                          )}
                        </div>
                      </div>

                      {/* SEO Keyword Recommend (จาก AI) */}
                      <div>
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-medium text-gray-800 mb-1">SEO Keywords (AI recommended)</div>
                          <form action={recommendSeoKeywordsAction} className="contents">
                            <input type="hidden" name="pageId" value={pg.id} />
                            <input type="hidden" name="projectId" value={data.id} />
                            <button
                              type="submit"
                              className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                              title="Analyze figmaTextContent + content keywords and update pageSeoKeywords"
                            >
                              AI: Recommend
                            </button>
                          </form>
                        </div>

                        <div className="rounded-md border bg-white p-3 text-sm text-gray-700 min-h-[56px]">
                          {pg.pageSeoKeywords?.length ? (
                            <div className="flex flex-wrap gap-2">
                              {pg.pageSeoKeywords.map((k) => (
                                <span key={k} className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-1 text-xs text-indigo-700 border border-indigo-200">
                                  {k}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-gray-400">No SEO keywords yet. Click “AI: Recommend”.</span>
                          )}
                        </div>

                        {pg.figmaTextContent ? (
                          <>
                            <div className="text-xs text-gray-500 mt-3 mb-1">AI context source (figmaTextContent)</div>
                            <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded-md border bg-white p-3 text-xs text-gray-700">
                              {pg.figmaTextContent}
                            </pre>
                          </>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-3 text-xs text-gray-500">Updated: {pg.updatedAt.toLocaleString()}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
