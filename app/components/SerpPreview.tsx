"use client";
import * as React from "react";
export default function SerpPreview({ title, url, description }: { title: string; url: string; description: string; }) {
  const displayUrl = React.useMemo(() => {
    try { const u = new URL(url); return `${u.hostname}${u.pathname.replace(/\/$/, "")}`; } catch { return url; }
  }, [url]);
  return (
    <div className="rounded-2xl border bg-white p-4">
      <div className="text-xs text-emerald-700">{displayUrl}</div>
      <div className="mt-0.5 text-lg font-medium text-blue-700 leading-snug">{title || "(Untitled page)"}</div>
      <div className="mt-1 text-sm text-gray-700 line-clamp-3">{description || "Add a compelling meta description (≈ 150–160 chars)."}</div>
    </div>
  );
}
