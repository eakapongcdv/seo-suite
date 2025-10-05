// app/app/projects/[projectid]/_components/ProjectHeader.tsx
"use client";

import Link from "next/link";
import { ExternalLink, ArrowLeft, Settings2, Pencil } from "lucide-react";

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

export default function ProjectHeader({
  siteName,
  siteUrl,
  targetLocale,
  projectId, // ✅ เพิ่มสำหรับลิงก์ Edit & Integrations
}: {
  siteName: string;
  siteUrl: string;
  targetLocale?: string | null;
  projectId?: string | null;
}) {
  const t = ((targetLocale as TargetLocale) || "en") as TargetLocale;
  const title = siteName?.trim() ? siteName : "Untitled Project";

  return (
    <div className="flex items-start justify-between gap-3">
      {/* ← Back */}
      <div className="shrink-0">
        <Link
          href="/app/projects"
          className="inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
      </div>

      {/* ชื่อ + URL + action ขวา */}
      <div className="ml-auto min-w-0 text-right">
        <div className="truncate text-2xl font-bold" title={title}>
          {title}{" "}
          <span className="align-middle text-sm font-normal text-gray-500">
            ({LOCALE_LABEL[t]} {LOCALE_FLAG[t]})
          </span>
        </div>

        {/* URL + ปุ่มเปิดเว็บ */}
        <div className="mt-1 inline-flex items-center gap-2 text-sm text-gray-600">
          {siteUrl ? (
            <>
              <span className="truncate" title={siteUrl}>
                {siteUrl}
              </span>
              <a
                href={siteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-lg border px-2 py-1 hover:bg-gray-50"
                title="Open site"
                aria-label="Open site"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            </>
          ) : (
            <span className="text-gray-400">No site URL</span>
          )}
        </div>

        {/* ปุ่มจัดการโปรเจกต์ */}
        {projectId ? (
          <div className="mt-2 flex w-full justify-end gap-2">
            <Link
              href={`/app/projects/${projectId}/edit`}
              className="inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
              title="Edit project"
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit Project
            </Link>
            <Link
              href={`/app/projects/${projectId}/integrations`}
              className="inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
              title="Project integrations"
            >
              <Settings2 className="h-3.5 w-3.5" />
              Integrations
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}
