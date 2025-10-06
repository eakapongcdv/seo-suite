// app/app/projects/[projectid]/_components/PageRow/FigmaSeoSection.tsx
"use client";

import { useState } from "react";
import { Save as SaveIcon, RefreshCw, Sparkles } from "lucide-react";
import SubmitButton from "@/app/components/SubmitButton";
import { PageRowProps } from "./types";
import {
  updatePageAction,
  syncFigmaAction,
  recommendSeoKeywordsAction,
} from "../../actions";

type Props = {
  projectId: string;
  page: PageRowProps["page"];
  keywordLang: "en" | "th" | "zh";
};

export default function FigmaSeoSection({ projectId, page, keywordLang }: Props) {
  const [figmaError, setFigmaError] = useState<string | null>(null);
  const [figmaPending, setFigmaPending] = useState(false);

  async function handleFigmaSyncSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFigmaError(null);
    setFigmaPending(true);
    try {
      const fd = new FormData(e.currentTarget);
      const res = await syncFigmaAction(fd);
      if (!res?.ok) setFigmaError(res?.error || "Figma sync failed");
    } catch (err: any) {
      setFigmaError(err?.message || "Figma sync failed");
    } finally {
      setFigmaPending(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 items-end gap-2 md:grid-cols-12">
        <form onSubmit={handleFigmaSyncSubmit} className="md:col-span-8 flex gap-2">
          <input type="hidden" name="pageId" value={page.id} />
          <input type="hidden" name="projectId" value={projectId} />
          <input
            name="figmaNodeId"
            defaultValue={page.figmaNodeId ?? ""}
            placeholder='เช่น "1:23" หรือวาง URL ที่มี ?node-id=1-23'
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
          <button
            type="submit"
            aria-label="Sync Figma"
            title="Sync Figma"
            disabled={figmaPending}
            aria-busy={figmaPending}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${figmaPending ? "animate-spin" : ""}`} />
          </button>
        </form>

        <form action={recommendSeoKeywordsAction} className="md:col-span-4 flex justify-end">
          <input type="hidden" name="pageId" value={page.id} />
          <input type="hidden" name="projectId" value={projectId} />
          <input type="hidden" name="preferredKeywordsLanguage" value={keywordLang} />
          <SubmitButton
            aria-label="AI: SEO Keyword Recommend"
            title="AI: SEO Keyword Recommend"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-transparent bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <Sparkles className="h-4 w-4" />
          </SubmitButton>
        </form>
      </div>

      {figmaError && <p className="text-xs text-red-600">{figmaError}</p>}

      <div>
        <div className="mb-1 text-sm font-medium text-gray-800">Capture Preview (Figma)</div>
        {page.figmaCaptureUrl ? (
          <div className="max-h-[500px] overflow-auto rounded-md border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={page.figmaCaptureUrl} alt="Figma capture" className="block h-auto w-full" />
          </div>
        ) : (
          <div className="rounded-md border p-4 text-center text-sm text-gray-400">No capture yet</div>
        )}

        {page.figmaTextContent ? (
          <div className="mt-2">
            <div className="mb-1 text-xs text-gray-500">Extracted Text (raw)</div>
            <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded-md border bg-white p-3 text-xs text-gray-700">
              {page.figmaTextContent}
            </pre>
          </div>
        ) : null}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-3">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-sm font-medium text-gray-900">Meta Tags</div>
          <button
            form="meta-form"
            aria-label="Save Meta"
            title="Save Meta"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 shadow-sm hover:bg-gray-50"
          >
            <SaveIcon className="h-4 w-4" />
          </button>
        </div>

        <form id="meta-form" action={updatePageAction} className="grid grid-cols-1 gap-3">
          <input type="hidden" name="id" value={page.id} />
          <input type="hidden" name="projectId" value={projectId} />

          <textarea
            name="pageDescriptionSummary"
            defaultValue={page.pageDescriptionSummary ?? ""}
            rows={2}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
            placeholder="Short content summary"
          />
          <textarea
            name="pageMetaDescription"
            defaultValue={page.pageMetaDescription ?? ""}
            rows={3}
            placeholder="Ideal 150–160 chars with primary keywords"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
          <input type="hidden" name="pageSeoKeywords" defaultValue={(page.pageSeoKeywords ?? []).join(", ")} />
        </form>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-3">
        <div className="mb-2 text-sm font-medium text-gray-900">SEO Keywords</div>
        <div className="min-h-[44px] rounded-md border bg-gray-50 p-2">
          {page.pageSeoKeywords?.length ? (
            <div className="flex flex-wrap gap-1.5">
              {page.pageSeoKeywords.map((k) => (
                <span
                  key={k}
                  className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-xs text-indigo-700"
                >
                  {k}
                </span>
              ))}
            </div>
          ) : (
            <span className="text-xs text-gray-400">No SEO keywords yet.</span>
          )}
        </div>

        <form action={updatePageAction} className="mt-2 flex items-end gap-2">
          <input type="hidden" name="id" value={page.id} />
          <input type="hidden" name="projectId" value={projectId} />
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-gray-700">Edit keywords (separate with commas)</label>
            <input
              name="pageSeoKeywords"
              defaultValue={(page.pageSeoKeywords ?? []).join(", ")}
              placeholder="Add or edit keywords…"
              className="h-9 w-full rounded-lg border border-gray-300 px-3 text-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
          <button
            type="submit"
            aria-label="Save Keywords"
            title="Save Keywords"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
          >
            <SaveIcon className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
