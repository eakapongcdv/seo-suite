"use client";
const items = [
  { key: "titleLen", label: "Title ≤ 35 Chinese chars" },
  { key: "descLen", label: "Meta description ≤ 78 Chinese chars" },
  { key: "icp", label: "ICP filing (工信部备案) present" },
  { key: "robots", label: "robots.txt allows BaiduBot" },
  { key: "sitemapBaidu", label: "Submit sitemap to Baidu (主动推送/自动提交)" },
] as const;
export default function BaiduChecklist({ flags }: { flags: Partial<Record<string, boolean>> }) {
  return (
    <div className="rounded-2xl border bg-white p-4">
      <div className="mb-2 text-sm font-medium">Baidu SEO Checklist</div>
      <ul className="space-y-1 text-sm">
        {items.map(it => (
          <li key={it.key} className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${flags[it.key]?"bg-emerald-500":"bg-gray-300"}`} />
            <span>{it.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
