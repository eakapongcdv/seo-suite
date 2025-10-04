// app/app/projects/page.tsx
import Link from "next/link";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import {
  createProjectAction,
  deleteProjectAction,
  updateProjectAction,
} from "./actions";
import { Plus, ExternalLink, Pencil, Trash2, X } from "lucide-react";
import ModalToggleButton from "@/app/components/ModalToggleButton";

export const dynamic = "force-dynamic";

// --- Helpers ---
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

async function getData(userId: string) {
  return prisma.project.findMany({
    where: { ownerId: userId },
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { pages: true } },
      pages: {
        select: {
          id: true,
          pageName: true,
          figmaCaptureUrl: true,        // ⬅️ ใช้ทำ thumbnail
          pageSeoKeywords: true,
          lighthouseSeo: true,
        },
      },
    },
  });
}

export default async function ProjectsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Sign in required</h1>
        <Link className="underline text-blue-600" href="/signin">Go to sign in</Link>
      </div>
    );
  }

  const projects = await getData(session.user.id);

  return (
    <div className="w-full space-y-6 px-4 py-6 sm:px-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Projects</h1>

        {/* Create modal */}
        <details className="relative">
          <summary
            className="list-none inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-gray-300 bg-white text-gray-700 shadow-sm hover:bg-gray-50"
            aria-label="Create project"
            title="Create project"
          >
            <Plus className="h-5 w-5" />
          </summary>

          <div className="absolute right-0 z-20 mt-2 w-[480px] rounded-2xl border border-gray-200 bg-white p-5 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-base font-semibold">Create Project</div>
              <ModalToggleButton className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50" aria-label="Close">
                <X className="h-4 w-4" />
              </ModalToggleButton>
            </div>

            <form action={createProjectAction} className="space-y-3">
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">Site name</label>
                  <input
                    name="siteName"
                    placeholder="My Site"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">Target locale</label>
                  <input
                    name="targetLocale"
                    defaultValue="en"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-gray-700">Site URL</label>
                  <input
                    name="siteUrl"
                    placeholder="https://example.com"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <label className="inline-flex items-center gap-2 text-sm">
                <input type="checkbox" name="includeBaidu" value="true" />
                Include Baidu
              </label>

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

      {/* Project list (full width cards) */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2 2xl:grid-cols-3">
        {projects.map((p) => {
          // หา page ที่ชื่อ "home" และมี figmaCaptureUrl
          const homePage = p.pages.find(
            (pg) => pg.pageName?.toLowerCase() === "home" && !!pg.figmaCaptureUrl
          );

          const totalPages = p._count.pages;
          const checklistDone = p.pages.filter((pg) => (pg.pageSeoKeywords?.length ?? 0) > 0).length;
          const checklistPct = totalPages > 0 ? (checklistDone / totalPages) * 100 : 0;

          const seoScores = p.pages
            .map((pg) => (typeof pg.lighthouseSeo === "number" ? pg.lighthouseSeo : NaN))
            .filter((n) => !Number.isNaN(n));
          const seoAvg = Math.round(avg(seoScores));

          return (
            <div key={p.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              {/* Row 1: left thumbnail + title + actions */}
              <div className="flex items-start justify-between gap-4">
                {/* Thumbnail ด้านซ้ายสุด */}
                <div className="w-[120px] shrink-0">
                  <div className="aspect-[4/3] overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
                    {homePage?.figmaCaptureUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={homePage.figmaCaptureUrl}
                        alt="Home preview"
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">
                        No preview
                      </div>
                    )}
                  </div>
                  <div className="mt-1 text-center text-[11px] text-gray-500">home</div>
                </div>

                {/* Title */}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-base font-semibold text-gray-900">{p.siteName}</div>
                  <div className="truncate text-sm text-gray-500">{p.siteUrl}</div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <Link
                    href={`/app/projects/${p.id}`}
                    aria-label="Open"
                    title="Open"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Link>

                  {/* Edit modal */}
                  <details className="relative">
                    <summary
                      className="list-none inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                      aria-label="Edit"
                      title="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </summary>

                    <div className="absolute right-0 z-20 mt-2 w-[520px] rounded-2xl border border-gray-200 bg-white p-5 shadow-xl">
                      <div className="mb-3 flex items-center justify-between">
                        <div className="text-base font-semibold">Edit Project</div>
                        <ModalToggleButton className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50" aria-label="Close">
                          <X className="h-4 w-4" />
                        </ModalToggleButton>
                      </div>

                      <form action={updateProjectAction} className="space-y-3">
                        <input type="hidden" name="id" value={p.id} />
                        <div className="grid gap-3 md:grid-cols-2">
                          <div>
                            <label className="mb-1 block text-xs font-medium text-gray-700">Site name</label>
                            <input
                              name="siteName"
                              defaultValue={p.siteName}
                              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-medium text-gray-700">Target locale</label>
                            <input
                              name="targetLocale"
                              defaultValue={p.targetLocale}
                              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                            />
                          </div>
                          <div className="md:col-span-2">
                            <label className="mb-1 block text-xs font-medium text-gray-700">Site URL</label>
                            <input
                              name="siteUrl"
                              defaultValue={p.siteUrl}
                              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                            />
                          </div>
                        </div>

                        <label className="inline-flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            name="includeBaidu"
                            value="true"
                            defaultChecked={(p as any).includeBaidu}
                          />
                          Include Baidu
                        </label>

                        <div className="flex justify-end gap-2">
                          <ModalToggleButton className="inline-flex h-9 items-center justify-center rounded-lg border border-gray-300 bg-white px-4 text-sm hover:bg-gray-50">
                            Cancel
                          </ModalToggleButton>
                          <button
                            type="submit"
                            className="inline-flex h-9 items-center justify-center rounded-lg bg-indigo-600 px-4 text-sm font-medium text-white hover:bg-indigo-700"
                          >
                            Save changes
                          </button>
                        </div>
                      </form>
                    </div>
                  </details>

                  <form action={deleteProjectAction}>
                    <input type="hidden" name="id" value={p.id} />
                    <button
                      type="submit"
                      aria-label="Delete"
                      title="Delete"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-transparent bg-red-100 text-red-700 hover:bg-red-200"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </form>
                </div>
              </div>

              {/* Row 2: metrics */}
              <div className="mt-4 grid grid-cols-1 items-center gap-4 sm:grid-cols-3">
                <div className="text-sm text-gray-700">
                  <div className="text-xs text-gray-500">Pages</div>
                  <div className="text-base font-semibold">{totalPages}</div>
                </div>

                <div className="sm:col-span-1">
                  <Circular
                    value={totalPages > 0 ? checklistPct : 0}
                    label={`${checklistDone}/${totalPages} pages with SEO keywords`}
                  />
                </div>

                <div className="sm:col-span-1">
                  <Circular value={seoAvg} label={`Avg SEO score: ${seoAvg}/100`} />
                </div>
              </div>
            </div>
          );
        })}

        {projects.length === 0 && (
          <div className="text-sm text-gray-500">No projects yet.</div>
        )}
      </div>
    </div>
  );
}
