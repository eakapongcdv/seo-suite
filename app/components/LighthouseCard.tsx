"use client";
export function LighthouseCard({ perf, seo, a11y }: { perf?: number|null; seo?: number|null; a11y?: number|null; }) {
  const badge = (n?: number|null) => (
    <span className={`inline-block min-w-10 rounded-full px-2 py-1 text-center text-xs font-semibold ${n==null?"bg-gray-100 text-gray-500":"bg-black text-white"}`}>{n ?? "–"}</span>
  );
  return (
    <div className="rounded-2xl border bg-white p-4">
      <div className="mb-2 text-sm font-medium">Lighthouse</div>
      <div className="flex items-center gap-3 text-sm">
        <div>Performance {badge(perf ?? null)}</div>
        <div>SEO {badge(seo ?? null)}</div>
        <div>Accessibility {badge(a11y ?? null)}</div>
      </div>
      <p className="mt-2 text-xs text-gray-500">(Hook up CI later to run Lighthouse and update these.)</p>
    </div>
  );
}
