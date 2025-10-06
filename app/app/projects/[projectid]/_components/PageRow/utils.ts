// app/app/projects/[projectid]/_components/PageRow/utils.ts
import type { Prisma } from "@prisma/client";

export function mapLocaleToKeywordLang(locale: string | null | undefined): "en" | "th" | "zh" {
  if (locale === "th") return "th";
  if (locale === "zh-CN") return "zh";
  return "en";
}

export function keywordLangLabel(lang: "en" | "th" | "zh") {
  return lang === "th" ? "ไทย" : lang === "zh" ? "中文" : "English";
}

/**
 * อ่านค่า Top Keywords จากฟิลด์ JSON (หรือสตริงเก่า) ให้กลายเป็น array/object ที่ UI ใช้ได้
 * รองรับ:
 *  - Array<{ keyword: string; avgMonthlySearches: number }>
 *  - { error: string }
 *  - [] (ค่าเริ่มต้น/ไม่มีข้อมูล)
 */
export function readTopKeywordJson(
  v: Prisma.JsonValue | string | null | undefined
):
  | { keyword: string; avgMonthlySearches: number }[]
  | { error: string }
  | [] {
  if (v == null) return [];

  // กรณีข้อมูลเก่าเป็นสตริง
  if (typeof v === "string") {
    try {
      const parsed = JSON.parse(v);
      return readTopKeywordJson(parsed as any);
    } catch {
      return [];
    }
  }

  // กรณีเป็น JSON จริงจาก Prisma
  if (Array.isArray(v)) return v as any;
  if (typeof v === "object") {
    const obj = v as Record<string, unknown>;
    if (typeof obj.error === "string") return { error: obj.error };
  }

  return [];
}

export function pickTargetAbsoluteUrl(pageUrl?: string, realCaptureUrl?: string | null) {
  const isAbs = !!pageUrl && /^https?:\/\//i.test(pageUrl);
  if (isAbs) return pageUrl as string;
  if (realCaptureUrl && /^https?:\/\//i.test(realCaptureUrl)) return realCaptureUrl;
  return undefined;
}
