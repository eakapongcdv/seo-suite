// app/app/projects/[projectid]/_server/googleRank.ts
"use server";

import { headers } from "next/headers";

// คืนค่า: { position: number | null, pageIndex: number | null, foundUrl: string | null }
export async function getGoogleRank(opts: {
  keyword: string;
  targetUrl: string;        // URL ของโปรเจกต์/โดเมนเรา
  locale?: string;          // เช่น "th-TH"
  countryCode?: string;     // เช่น "TH"
  maxPages?: number;        // default 10 (หน้าละ 10 ลิงก์)
}) {
  const {
    keyword,
    targetUrl,
    locale = "th-TH",
    countryCode = "TH",
    maxPages = 10,
  } = opts;

  const targetHost = safeHost(targetUrl);
  if (!targetHost) return { position: null, pageIndex: null, foundUrl: null };

  // สร้างพารามิเตอร์ค้นหา
  // hl = language, gl = country
  const hl = locale.split("-")[0] || "en";
  const gl = countryCode || "US";

  let globalRank = 0;

  for (let page = 0; page < maxPages; page++) {
    const start = page * 10;
    const q = new URLSearchParams({ q: keyword, hl, gl, start: String(start) }).toString();
    const url = `https://www.google.com/search?${q}`;

    const html = await fetchHtml(url);
    if (!html) continue;

    // ดึงลิงก์ organic แบบง่าย (โหมด fallback): หา `/url?q=...` จากผลลัพธ์
    const links = extractGoogleResultLinks(html);

    for (const link of links) {
      globalRank += 1;
      const host = safeHost(link);
      if (host && host.endsWith(targetHost)) {
        return { position: globalRank, pageIndex: page, foundUrl: link };
      }
    }

    // ถ้าหน้านี้ไม่มี next / ไม่มีผลลัพธ์เพิ่ม ก็หยุด
    if (links.length < 10) break;
  }

  return { position: null, pageIndex: null, foundUrl: null };
}

function safeHost(raw: string) {
  try {
    const u = new URL(raw);
    // ให้เปรียบเทียบแบบปลายโดเมน (เช่น sub.example.com ก็ถือว่าเข้าโดเมน example.com)
    const parts = u.hostname.split(".");
    return parts.slice(-2).join(".");
  } catch {
    return null;
  }
}

async function fetchHtml(url: string) {
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        // UA ควรเป็น browser-like เพื่อกันบล็อกขั้นพื้นฐาน
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0 Safari/537.36",
        "Accept-Language": "th,en;q=0.8",
        "Cache-Control": "no-cache",
      },
      // สำคัญ: ทำงานบน server เท่านั้น
      cache: "no-store",
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

// ดึงลิงก์แบบง่าย ๆ จาก /url?q=... ในผลลัพธ์ organic
function extractGoogleResultLinks(html: string): string[] {
  const results: string[] = [];
  const regex = /href="\/url\?q=([^"&]+)[^"]*"/g;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(html)) !== null) {
    try {
      const url = decodeURIComponent(m[1]);
      // กรองลิงก์ที่ไม่น่าใช่ organic
      if (
        url.startsWith("http") &&
        !url.includes("googleusercontent.com") &&
        !url.includes("google.com") &&
        !url.includes("webcache.googleusercontent.com")
      ) {
        results.push(url);
      }
    } catch {}
  }
  return results;
}
