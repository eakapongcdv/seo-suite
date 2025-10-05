"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Globe, Copy, Trash2, Pencil } from "lucide-react";

type TargetLocale = "en" | "th" | "zh-CN";

const LOCALE_LABEL: Record<TargetLocale, string> = {
  en: "English",
  th: "Thai",
  "zh-CN": "Chinese",
};
const LOCALE_FLAG: Record<TargetLocale, string> = {
  en: "🇬🇧",
  th: "🇹🇭",
  "zh-CN": "🇨🇳",
};

function CircularProgress({ value }: { value: number }) {
  const size = 64;
  const stroke = 8;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const v = Math.max(0, Math.min(100, Math.round(value)));
  const dash = (v / 100) * circumference;
  return (
    <svg width={size} height={size} className="shrink-0">
      <circle cx={size/2} cy={size/2} r={radius} strokeWidth={stroke} stroke="#e5e7eb" fill="none" />
      <circle
        cx={size/2} cy={size/2} r={radius} strokeWidth={stroke}
        strokeLinecap="round" strokeDasharray={`${dash} ${circumference - dash}`}
        stroke="#111827" fill="none" transform={`rotate(-90 ${size/2} ${size/2})`}
      />
      <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fontSize="14" fill="#111827">
        {v}%
      </text>
    </svg>
  );
}

export default function ProjectCard({
  project,
}: {
  project: {
    id: string;
    ownerId: string;
    siteName: string;
    siteUrl: string;
    targetLocale: string; // en | th | zh-CN
    includeBaidu: boolean;
    figmaFileKey?: string | null;
    figmaAccessToken?: string | null;
    _count: { pages: number };
    pages: Array<{
      id: string;
      pageName: string;
      pageUrl: string;
      figmaCaptureUrl?: string | null;
      pageSeoKeywords: string[];
      lighthouseSeo?: number | null;
    }>;
  };
}) {
  const router = useRouter();
  const [showDeleteWarn, setShowDeleteWarn] = useState(false);
  const [showClone, setShowClone] = useState(false);
  const [cloneLocale, setCloneLocale] = useState<TargetLocale | "">("");

  const displayName = project.siteName; // ✅ ชื่อจริงจาก schema
  const tLocale = (project.targetLocale as TargetLocale) || "en";

  // หา home cover ตาม pageName
  const homeCandidates = project.pages.filter((p) => {
    const n = (p.pageName || "").toLowerCase();
    return n === "home" || n === "index";
  });
  const homePage = homeCandidates[0] || null;
  const coverUrl =
    homePage?.figmaCaptureUrl ||
    project.pages.find((p) => p.figmaCaptureUrl)?.figmaCaptureUrl ||
    null;

  // SEO progress: ใช้ค่าเฉลี่ย
  const avgSeo =
    project.pages.length > 0
      ? Math.round(
          project.pages.reduce((sum, p) => sum + (p.lighthouseSeo ?? 0), 0) /
            project.pages.length
        )
      : 0;

  // SEO keywords: หน้า home ก่อน ถ้าไม่มีดึงรวม top
  const homeKeywords = homePage?.pageSeoKeywords ?? [];
  const allKeywords = Array.from(
    new Set(project.pages.flatMap((p) => p.pageSeoKeywords || []))
  );
  const showKeywords =
    homeKeywords.length > 0 ? homeKeywords.slice(0, 8) : allKeywords.slice(0, 8);

  const handleOpenSite = () => {
    if (project.siteUrl) window.open(project.siteUrl, "_blank", "noopener");
  };

  const handleDelete = async () => {
    if (project._count.pages > 0) {
      setShowDeleteWarn(true);
      return;
    }
    try {
      const res = await fetch(`/api/projects/${project.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      router.refresh();
    } catch (e) {
      alert((e as Error).message || "Delete failed");
    }
  };

  const handleClone = async () => {
    if (!cloneLocale) return;
    try {
      const res = await fetch(`/api/projects/${project.id}/clone`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetLocale: cloneLocale }),
      });
      if (!res.ok) throw new Error(await res.text());
      setShowClone(false);
      setCloneLocale("");
      router.refresh();
    } catch (e) {
      alert((e as Error).message || "Clone failed");
    }
  };

  return (
    <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
      {/* Cover */}
      <div className="aspect-[16/9] w-full bg-gray-100">
        {coverUrl ? (
          <img
            src={coverUrl}
            alt="Home preview"
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-gray-400">
            No home capture
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link
              href={`/app/projects/${project.id}`}
              className="block truncate text-lg font-semibold hover:underline"
              title={displayName}
            >
              {displayName}{" "}
              <span className="text-sm font-normal text-gray-500">
                ({LOCALE_LABEL[tLocale]} {LOCALE_FLAG[tLocale]})
              </span>
            </Link>

            <div className="mt-2 text-xs text-gray-500">
              Pages: {project._count.pages}
              {project.includeBaidu ? (
                <span className="ml-2 inline-flex items-center gap-1 rounded bg-amber-50 px-2 py-0.5 text-amber-700">
                  <Globe className="h-3 w-3" />
                  Baidu Ready
                </span>
              ) : null}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {/* Open site */}
            <button
              type="button"
              onClick={handleOpenSite}
              disabled={!project.siteUrl}
              className="inline-flex rounded-lg border p-2 text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              title={project.siteUrl ? "Open site" : "Site URL not set"}
            >
              <ExternalLink className="h-4 w-4" />
            </button>

            {/* Edit */}
            <Link
              href={`/app/projects/${project.id}/edit`}
              className="inline-flex rounded-lg border p-2 text-gray-600 hover:bg-gray-50"
              title="Edit project"
            >
              <Pencil className="h-4 w-4" />
            </Link>

            {/* Clone */}
            <button
              type="button"
              onClick={() => setShowClone(true)}
              className="inline-flex rounded-lg border p-2 text-gray-600 hover:bg-gray-50"
              title="Clone project to a new locale"
            >
              <Copy className="h-4 w-4" />
            </button>

            {/* Delete */}
            <button
              type="button"
              onClick={handleDelete}
              className="inline-flex rounded-lg border p-2 text-red-600 hover:bg-red-50"
              title="Delete project"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* SEO summary row */}
        <div className="mt-4 flex items-center gap-4">
          <CircularProgress value={avgSeo} />
          <div className="min-w-0">
            <div className="text-sm font-medium">SEO Progress</div>
            <div className="mt-1 line-clamp-2 text-xs text-gray-600">
              {showKeywords.length > 0 ? (
                <span>
                  <span className="font-semibold">Keywords:</span>{" "}
                  {showKeywords.join(", ")}
                </span>
              ) : (
                <span className="text-gray-400">No SEO keywords</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal: ห้ามลบถ้ายังมีเพจ */}
      {showDeleteWarn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-4 shadow-lg">
            <h3 className="text-base font-semibold">Cannot delete this project</h3>
            <p className="mt-2 text-sm text-gray-600">
              Please delete all pages in the project before deleting the project.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setShowDeleteWarn(false)}
                className="rounded-lg border px-3 py-1.5 text-sm"
              >
                OK
              </button>
              <Link
                href={`/app/projects/${project.id}`}
                className="rounded-lg bg-gray-900 px-3 py-1.5 text-sm text-white"
              >
                Go to project
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Clone — เลือก locale ใหม่ */}
      {showClone && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-4 shadow-lg">
            <h3 className="text-base font-semibold">Clone project</h3>
            <p className="mt-2 text-sm text-gray-600">
              Select a target language for the cloned project.
            </p>

            <div className="mt-3">
              <label className="block text-sm font-medium">Language</label>
              <select
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                value={cloneLocale}
                onChange={(e) => setCloneLocale(e.target.value as TargetLocale)}
              >
                <option value="">— Select —</option>
                {/* ให้เลือกได้ทุกภาษา ยกเว้นภาษาเดียวกับโปรเจกต์นี้ */}
                {(["en", "th", "zh-CN"] as TargetLocale[])
                  .filter((l) => l !== tLocale)
                  .map((l) => (
                    <option key={l} value={l}>
                      {LOCALE_LABEL[l]}
                    </option>
                  ))}
              </select>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowClone(false);
                  setCloneLocale("");
                }}
                className="rounded-lg border px-3 py-1.5 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleClone}
                disabled={!cloneLocale}
                className="rounded-lg bg-gray-900 px-3 py-1.5 text-sm text-white disabled:opacity-50"
              >
                Clone
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
