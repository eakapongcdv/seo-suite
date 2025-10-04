import Link from "next/link";
import { ExternalLink, Pencil, Trash2 } from "lucide-react";
import Circular from "./Circular";
import EditProjectModal from "./EditProjectModal";
import { deleteProjectAction } from "../actions";

function avg(nums: number[]) {
  const valid = nums.filter((n) => typeof n === "number" && !Number.isNaN(n));
  if (valid.length === 0) return 0;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}

type PageLite = {
  id: string;
  pageName: string | null;
  figmaCaptureUrl: string | null;
  pageSeoKeywords: string[] | null;
  lighthouseSeo: number | null;
};

type ProjectCardProps = {
  project: {
    id: string;
    siteName: string;
    siteUrl: string | null;
    targetLocale: string;
    includeBaidu: boolean;
    figmaFileKey?: string | null;
    figmaAccessToken?: string | null;
    _count: { pages: number };
    pages: PageLite[];
  };
};

export default function ProjectCard({ project: p }: ProjectCardProps) {
  const homePage = p.pages.find(pg => pg.pageName?.toLowerCase() === "home" && !!pg.figmaCaptureUrl);

  const totalPages = p._count.pages;
  const checklistDone = p.pages.filter((pg) => (pg.pageSeoKeywords?.length ?? 0) > 0).length;
  const checklistPct = totalPages > 0 ? (checklistDone / totalPages) * 100 : 0;
  const seoScores = p.pages.map(pg => (typeof pg.lighthouseSeo === "number" ? pg.lighthouseSeo : NaN)).filter(n => !Number.isNaN(n));
  const seoAvg = Math.round(avg(seoScores));

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      {/* Row 1 */}
      <div className="flex items-start justify-between gap-4">
        {/* thumbnail */}
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

        {/* title */}
        <div className="min-w-0 flex-1">
          <div className="truncate text-base font-semibold text-gray-900">{p.siteName}</div>
          <div className="truncate text-sm text-gray-500">{p.siteUrl}</div>
        </div>

        {/* actions */}
        <div className="flex items-center gap-2">
          <Link
            href={`/app/projects/${p.id}`}
            aria-label="Open"
            title="Open"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
          >
            <ExternalLink className="h-4 w-4" />
          </Link>

          {/* Edit modal (with figma config) */}
          <EditProjectModal
            p={{
              id: p.id,
              siteName: p.siteName,
              siteUrl: p.siteUrl,
              targetLocale: p.targetLocale,
              includeBaidu: p.includeBaidu,
              figmaFileKey: p.figmaFileKey ?? null,
              figmaAccessToken: p.figmaAccessToken ?? null,
            }}
          />

          {/* Delete */}
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
        <Circular
          value={totalPages > 0 ? checklistPct : 0}
          label={`${checklistDone}/${totalPages} pages with SEO keywords`}
        />
        <Circular value={seoAvg} label={`Avg SEO score: ${seoAvg}/100`} />
      </div>
    </div>
  );
}
