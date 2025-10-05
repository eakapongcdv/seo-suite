// app/app/projects/[projectid]/edit/_components/EditProjectForm.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type TargetLocale = "en" | "th" | "zh-CN";

const LOCALE_LABEL: Record<TargetLocale, string> = {
  en: "English",
  th: "Thai",
  "zh-CN": "Chinese",
};

export default function EditProjectForm({
  project,
}: {
  project: {
    id: string;
    ownerId: string;
    siteName: string;
    siteUrl: string;
    targetLocale: string;
    includeBaidu: boolean;
  };
}) {
  const router = useRouter();
  const [siteName, setSiteName] = useState(project.siteName ?? "");
  const [siteUrl, setSiteUrl] = useState(project.siteUrl ?? "");
  const [targetLocale, setTargetLocale] = useState<TargetLocale>(
    (project.targetLocale as TargetLocale) || "en"
  );
  const [includeBaidu, setIncludeBaidu] = useState(!!project.includeBaidu);

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    setOk(false);

    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteName,
          siteUrl,
          targetLocale,
          includeBaidu,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || `Update failed (${res.status})`);
      }

      setOk(true);
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-5 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      {err && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {err}
        </div>
      )}
      {ok && (
        <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          Saved successfully.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700">Site Name</label>
          <input
            type="text"
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
            value={siteName}
            onChange={(e) => setSiteName(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Site URL</label>
          <input
            type="url"
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
            value={siteUrl}
            onChange={(e) => setSiteUrl(e.target.value)}
            required
            placeholder="https://example.com"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700">Target Locale</label>
          <select
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
            value={targetLocale}
            onChange={(e) => setTargetLocale(e.target.value as TargetLocale)}
          >
            {(["en", "th", "zh-CN"] as TargetLocale[]).map((l) => (
              <option key={l} value={l}>
                {l} — {LOCALE_LABEL[l]}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-end gap-2">
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={includeBaidu}
              onChange={(e) => setIncludeBaidu(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            Include Baidu (China SEO)
          </label>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => history.back()}
          className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm text-white disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save changes"}
        </button>
      </div>
    </form>
  );
}
