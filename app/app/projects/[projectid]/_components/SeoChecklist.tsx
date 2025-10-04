// app/app/projects/[projectid]/_components/SeoChecklist.tsx
import { CheckCircle2, XCircle } from "lucide-react";
import Circular from "./Circular";

type PageLike = {
  pageName: string;
  pageUrl: string;
  pageMetaDescription: string | null;
  pageContentKeywords: string[] | null;
  pageSeoKeywords: string[] | null;
  figmaCaptureUrl: string | null;
  figmaTextContent: string | null;
  lighthousePerf: number | null;
  lighthouseSeo: number | null;
  lighthouseAccessibility: number | null;
};

export type ChecklistItem = { ok: boolean; label: string };

type Props =
  | { page: PageLike; title?: string; items?: never }
  | { items: ChecklistItem[]; title?: string; page?: never };

/** สร้างรายการเช็คจากสคีมล่าสุด (derive จากฟิลด์ใน Page) */
function buildItemsFromPage(p: PageLike): ChecklistItem[] {
  const hasMeta = !!p.pageMetaDescription?.trim();
  const hasContentKW = (p.pageContentKeywords?.length ?? 0) > 0;
  const hasSeoKW = (p.pageSeoKeywords?.length ?? 0) > 0;
  const hasFigmaCapture = !!p.figmaCaptureUrl;
  const hasFigmaText = !!p.figmaTextContent?.trim();

  // คุณภาพ URL ง่าย ๆ: เริ่มด้วย "/" หรือ "http"
  const urlOk = !!p.pageUrl && (p.pageUrl.startsWith("/") || p.pageUrl.startsWith("http"));

  // Lighthouse: นับว่า “มีผล” ถ้ามีค่า (จะดีมากถ้า >= 80 แต่ยังถือว่า “มี” ก่อน)
  const hasLhPerf = typeof p.lighthousePerf === "number";
  const hasLhSeo = typeof p.lighthouseSeo === "number";
  const hasLhA11y = typeof p.lighthouseAccessibility === "number";

  // ความสอดคล้องเบื้องต้น: มี keyword ทับซ้อนระหว่าง content กับ seo
  const overlapOk = (() => {
    const a = new Set((p.pageContentKeywords || []).map((s) => s.toLowerCase()));
    const b = new Set((p.pageSeoKeywords || []).map((s) => s.toLowerCase()));
    for (const k of a) if (b.has(k)) return true;
    return false;
  })();

  return [
    { ok: !!p.pageName?.trim(), label: "Page name set" },
    { ok: urlOk, label: "Valid page URL" },
    { ok: hasMeta, label: "Meta description present" },
    { ok: hasContentKW, label: "Content keywords extracted" },
    { ok: hasSeoKW, label: "SEO keywords set" },
    { ok: overlapOk, label: "SEO keywords align with content" },
    { ok: hasFigmaCapture, label: "Figma capture synced" },
    { ok: hasFigmaText, label: "Figma text extracted" },
    { ok: hasLhPerf, label: "Lighthouse: Performance recorded" },
    { ok: hasLhSeo, label: "Lighthouse: SEO recorded" },
    { ok: hasLhA11y, label: "Lighthouse: Accessibility recorded" },
  ];
}

export default function SeoChecklist(props: Props) {
  const items = "page" in props ? buildItemsFromPage(props.page) : props.items;
  const title = props.title ?? "SEO Checklist";

  const done = items.filter((i) => i.ok).length;
  const pct = Math.round((done / (items.length || 1)) * 100);

  return (
    <div className="mt-2 rounded-lg border border-gray-200 bg-white p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-sm font-medium text-gray-900">{title}</div>
        <Circular value={pct} label={`${done}/${items.length}`} />
      </div>
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {items.map((c) => (
          <li key={c.label} className="flex items-center gap-2 text-sm">
            {c.ok ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            ) : (
              <XCircle className="h-4 w-4 text-gray-300" />
            )}
            <span className={c.ok ? "text-gray-800" : "text-gray-500"}>{c.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
