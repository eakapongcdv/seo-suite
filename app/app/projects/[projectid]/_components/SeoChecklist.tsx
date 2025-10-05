// app/app/projects/[projectid]/_components/SeoChecklist.tsx
import { CheckCircle2, XCircle } from "lucide-react";
import Circular from "./Circular";

export type PageLike = {
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

  // เชื่อมต่อเครื่องมือภายนอก (อาจไม่มีส่งมา)
  gscConnected?: boolean | null;
  baiduConnected?: boolean | null;
};

export type ChecklistItem = { ok: boolean; label: string };

type Props =
  | { page: PageLike; title?: string; items?: never; strictLighthouse?: boolean }
  | { items: ChecklistItem[]; title?: string; page?: never; strictLighthouse?: boolean };

/** สร้างรายการเช็คจากสคีมล่าสุด (derive จากฟิลด์ใน Page) */
function buildItemsFromPage(p: PageLike, strictLighthouse: boolean): ChecklistItem[] {
  const hasMeta = !!p?.pageMetaDescription?.trim();
  const contentKW = Array.isArray(p?.pageContentKeywords) ? p.pageContentKeywords : [];
  const seoKW = Array.isArray(p?.pageSeoKeywords) ? p.pageSeoKeywords : [];
  const hasContentKW = contentKW.length > 0;
  const hasSeoKW = seoKW.length > 0;
  const hasFigmaCapture = !!p?.figmaCaptureUrl;
  const hasFigmaText = !!p?.figmaTextContent?.trim();

  // URL เบื้องต้น
  const urlOk = !!p?.pageUrl && (p.pageUrl.startsWith("/") || p.pageUrl.startsWith("http"));

  // Lighthouse: ถ้า strict = true ต้อง >= 80 ถึงนับว่า ok
  const perf = typeof p?.lighthousePerf === "number" ? p.lighthousePerf : null;
  const seo = typeof p?.lighthouseSeo === "number" ? p.lighthouseSeo : null;
  const a11y = typeof p?.lighthouseAccessibility === "number" ? p.lighthouseAccessibility : null;

  const hasLhPerf = perf !== null && (!strictLighthouse || perf >= 80);
  const hasLhSeo = seo !== null && (!strictLighthouse || seo >= 80);
  const hasLhA11y = a11y !== null && (!strictLighthouse || a11y >= 80);

  // ความสอดคล้องเบื้องต้น: keyword ทับซ้อนระหว่าง content กับ seo
  const overlapOk = (() => {
    if (!contentKW.length || !seoKW.length) return false;
    const a = new Set(contentKW.map((s) => s.toLowerCase()));
    for (const k of seoKW) if (a.has(k.toLowerCase())) return true;
    return false;
  })();

  const items: ChecklistItem[] = [
    { ok: !!p?.pageName?.trim(), label: "Page name set" },
    { ok: urlOk, label: "Valid page URL" },
    { ok: hasMeta, label: "Meta description present" },
    { ok: hasContentKW, label: "Content keywords extracted" },
    { ok: hasSeoKW, label: "SEO keywords set" },
    { ok: overlapOk, label: "SEO keywords align with content" },
    { ok: hasFigmaCapture, label: "Figma capture synced" },
    { ok: hasFigmaText, label: "Figma text extracted" },
    { ok: hasLhPerf, label: strictLighthouse ? "Lighthouse: Performance ≥ 80" : "Lighthouse: Performance recorded" },
    { ok: hasLhSeo, label: strictLighthouse ? "Lighthouse: SEO ≥ 80" : "Lighthouse: SEO recorded" },
    { ok: hasLhA11y, label: strictLighthouse ? "Lighthouse: Accessibility ≥ 80" : "Lighthouse: Accessibility recorded" },
  ];

  // ต่อท้ายเมื่อมีฟิลด์บอกสถานะการเชื่อมต่อ
  if (typeof p.gscConnected === "boolean") {
    items.push({ ok: !!p.gscConnected, label: "Connected: Google Search Console" });
  }
  if (typeof p.baiduConnected === "boolean") {
    items.push({ ok: !!p.baiduConnected, label: "Connected: Baidu Webmaster" });
  }

  return items;
}

// Type guard ช่วยให้ TS รู้ว่า props มี page แน่นอน
function isPageProps(p: Props): p is { page: PageLike; title?: string; strictLighthouse?: boolean } {
  return "page" in p && !!(p as any).page;
}

export default function SeoChecklist(props: Props) {
  const strict = props.strictLighthouse ?? false;

  const items: ChecklistItem[] = isPageProps(props)
    ? buildItemsFromPage(props.page, strict)
    : (props.items as ChecklistItem[]);

  const title = props.title ?? "SEO Checklist";
  const total = items.length || 1;
  const done = items.filter((i) => i.ok).length;
  const pct = Math.round((done / total) * 100);

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
