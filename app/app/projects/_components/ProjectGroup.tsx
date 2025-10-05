"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Globe, Copy, Trash2, Pencil } from "lucide-react";
import ProjectMetrics from "../[projectid]/_components/ProjectMetrics";

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

type PageLite = {
  id: string;
  pageName: string;
  pageUrl: string;
  figmaCaptureUrl: string | null;
  pageSeoKeywords: string[];
  lighthouseSeo: number | null;
  sortNumber: number | null;
};

type ProjectLite = {
  id: string;
  ownerId: string;
  siteName: string;
  siteUrl: string;
  targetLocale: string; // TargetLocale
  includeBaidu: boolean;
  figmaFileKey?: string | null;
  figmaAccessToken?: string | null;
  updatedAt: string | Date;
  _count: { pages: number };
  pages: PageLite[];
};

export default function ProjectGroup({
  siteName,
  projects,
}: {
  siteName: string;
  projects: ProjectLite[];
}) {
  const router = useRouter();
  const [showDeleteWarnId, setShowDeleteWarnId] = useState<string | null>(null);
  const [showCloneId, setShowCloneId] = useState<string | null>(null);
  const [cloneLocale, setCloneLocale] = useState<TargetLocale | "">("");

  // หา cover สำหรับทั้งกลุ่ม (รูปเดียว): home/index ก่อน ถ้าไม่มีก็ใช้รูปแรกที่พบ
  const coverUrl = useMemo(() => {
    // รวมทุกเพจของทุกโปรเจกต์ในกลุ่ม
    const allPages = projects.flatMap((p) => p.pages);
    const homes = allPages.filter((pg) => {
      const n = (pg.pageName || "").toLowerCase();
      return n === "home" || n === "index";
    });
    const homeCover = homes.find((h) => !!h.figmaCaptureUrl)?.figmaCaptureUrl;
    if (homeCover) return homeCover;
    const firstAny = allPages.find((pg) => !!pg.figmaCaptureUrl)?.figmaCaptureUrl || null;
    return firstAny;
  }, [projects]);

  // เฉลี่ย SEO ทั้งกลุ่ม (เพื่อ context ในหัวบัตร)
  const avgSeo = useMemo(() => {
    const pages = projects.flatMap((p) => p.pages);
    if (pages.length === 0) return 0;
    const sum = pages.reduce((acc, pg) => acc + (pg.lighthouseSeo ?? 0), 0);
    return Math.round(sum / pages.length);
  }, [projects]);


  const handleClone = async (pid: string) => {
    if (!cloneLocale) return;
    try {
      const res = await fetch(`/api/projects/${pid}/clone`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetLocale: cloneLocale }),
      });
      if (!res.ok) throw new Error(await res.text());
      setShowCloneId(null);
      setCloneLocale("");
      router.refresh();
    } catch (e) {
      alert((e as Error).message || "Clone failed");
    }
  };

  return (
    <section className="overflow-hidden rounded-xl border bg-white shadow-sm">
      {/* Cover รูปเดียวต่อกลุ่ม — ยึดบน/ครอปล่าง */}
      <div className="aspect-[16/9] w-full bg-gray-100 overflow-hidden">
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={`${siteName} cover`}
            className="h-full w-full object-cover object-top"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-gray-400">
            No capture
          </div>
        )}
      </div>

      <div className="p-4">
        {/* Header กลุ่ม */}
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="truncate text-xl font-semibold" title={siteName}>
            {siteName}
          </h2>
          <div className="text-sm text-gray-500">
            Locales: {projects.length} • Avg SEO {avgSeo}%
          </div>
        </div>

        {/* รายการโปรเจกต์ในกลุ่ม (ไม่แสดงรูปซ้ำ) */}
        <div className="divide-y">
          {projects.map((p) => {
          const t = (p.targetLocale as TargetLocale) || "en";

          // --- คำนวณค่า Metrics ---
          const totalPages = p.pages.length;
          const checklistDone = p.pages.filter(pg => (pg.pageSeoKeywords?.length || 0) > 0).length;
          const checklistPct = totalPages > 0 ? Math.round((checklistDone / totalPages) * 100) : 0;
          const seoAvg = totalPages > 0
            ? Math.round(p.pages.reduce((s, pg) => s + (pg.lighthouseSeo ?? 0), 0) / totalPages)
            : 0;

          // Keywords เดิม
          const home =
            p.pages.find((pg) => ["home", "index"].includes(pg.pageName.toLowerCase())) || null;
          const kw =
            (home?.pageSeoKeywords && home.pageSeoKeywords.length > 0
              ? home.pageSeoKeywords
              : Array.from(new Set(p.pages.flatMap((pg) => pg.pageSeoKeywords || [])))
            ).slice(0, 8);

          return (
            <div key={p.id} className="flex flex-col gap-3 py-3">
              {/* แถวบน: ชื่อโปรเจกต์ + locale + ปุ่มต่างๆ (เหมือนเดิม) */}
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <Link
                    href={`/app/projects/${p.id}`}
                    className="block truncate text-base font-medium hover:underline"
                    title={`${p.siteName} (${LOCALE_LABEL[t]})`}
                  >
                    {p.siteName}{" "}
                    <span className="text-sm font-normal text-gray-500">
                      ({LOCALE_LABEL[t]} {LOCALE_FLAG[t]})
                    </span>

                    {p.includeBaidu && (
                      <span className="ml-2 text-xs inline-flex items-center gap-1 rounded bg-amber-50 px-2 py-0.5 text-amber-700">
                        <Globe className="h-3 w-3" />
                        Baidu Ready
                      </span>
                    )}
                  </Link>

                  <div className="mt-1 line-clamp-2 text-xs text-gray-600">
                    {kw.length > 0 ? (
                      <>
                        <span className="font-semibold">Keywords:</span> {kw.join(", ")}
                      </>
                    ) : (
                      <span className="text-gray-400">No SEO keywords</span>
                    )}
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {/* ปุ่มเดิม: Open / Edit / Clone / Delete */}
                  {/* ... (เหมือนที่ทำไว้ก่อนหน้า) ... */}
                </div>
              </div>

              {/* แถวล่าง: ProjectMetrics */}
              <ProjectMetrics
                totalPages={totalPages}
                checklistPct={checklistPct}
                checklistDone={checklistDone}
                seoAvg={seoAvg}
              />
            </div>
          );
        })}

        </div>
      </div>

      {/* Modal: ห้ามลบถ้ามีเพจ */}
      {showDeleteWarnId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-4 shadow-lg">
            <h3 className="text-base font-semibold">Cannot delete this project</h3>
            <p className="mt-2 text-sm text-gray-600">
              Please delete all pages in the project before deleting the project.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setShowDeleteWarnId(null)}
                className="rounded-lg border px-3 py-1.5 text-sm"
              >
                OK
              </button>
              {/* ปุ่มไปหน้าโปรเจกต์นั้น */}
              <Link
                href={`/app/projects/${showDeleteWarnId}`}
                className="rounded-lg bg-gray-900 px-3 py-1.5 text-sm text-white"
              >
                Go to project
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Clone เลือก locale ใหม่ (แสดงครั้งละโปรเจกต์) */}
      {showCloneId && (
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
                {(["en", "th", "zh-CN"] as TargetLocale[])
                  // ซ่อนภาษาเดิมของโปรเจกต์ที่จะ clone
                  .filter((l) => {
                    const p = projects.find((pp) => pp.id === showCloneId);
                    return p ? l !== (p.targetLocale as TargetLocale) : true;
                  })
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
                  setShowCloneId(null);
                  setCloneLocale("");
                }}
                className="rounded-lg border px-3 py-1.5 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => handleClone(showCloneId)}
                disabled={!cloneLocale}
                className="rounded-lg bg-gray-900 px-3 py-1.5 text-sm text-white disabled:opacity-50"
              >
                Clone
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
