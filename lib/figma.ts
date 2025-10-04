// lib/figma.ts
import { unstable_noStore as noStore } from "next/cache";

export const FIGMA_TOKEN = process.env.FIGMA_PERSONAL_ACCESS_TOKEN!;
export const FIGMA_FILE_KEY = process.env.FIGMA_FILE_KEY!;
export const EXPORT_FORMAT = process.env.FIGMA_EXPORT_FORMAT || "png"; // "png" | "jpg" | "svg"
export const EXPORT_SCALE = Number(process.env.FIGMA_IMAGE_SCALE || 2);

const F_BASES = ["https://api.figma.com/v1"];

const mask = (s?: string | null) =>
  !s ? "(empty)" : s.length <= 8 ? "***" : `${s.slice(0, 4)}***${s.slice(-4)}`;

function normalizeNodeId(id: string) {
  // URL ใช้ "2946-7183" แต่ API ต้องการ "2946:7183"
  return id.includes("-") && !id.includes(":") ? id.replace("-", ":") : id;
}

async function fetchWithFallback(pathWithQuery: string) {
  noStore();
  let lastErr: any = null;

  for (const base of F_BASES) {
    const url = `${base}${pathWithQuery}`;
    try {
      const res = await fetch(url, {
        headers: { "X-Figma-Token": FIGMA_TOKEN },
        cache: "no-store",
      });
      const text = await res.text();

      if (!res.ok) {
        lastErr = new Error(`[FIGMA] ${res.status} ${res.statusText}: ${text.slice(0, 400)}`);
        // ลอง base ถัดไปต่อ
        continue;
      }
      try {
        return JSON.parse(text);
      } catch {
        return text;
      }
    } catch (e) {
      lastErr = e;
      continue;
    }
  }
  throw lastErr ?? new Error("[FIGMA] request failed (no base succeeded)");
}

// ✅ ดึงรูปหลาย node พร้อมกัน
export async function figmaGetImages(fileKey: string, nodeIdsRaw: string[]): Promise<Record<string, string>> {
  const nodeIds = nodeIdsRaw.map(normalizeNodeId);
  const q = `/images/${fileKey}?ids=${encodeURIComponent(nodeIds.join(","))}&format=${EXPORT_FORMAT}&scale=${EXPORT_SCALE}`;

  console.log("[FIGMA] GET images", {
    fileKey,
    ids: nodeIds.join(","),
    format: EXPORT_FORMAT,
    scale: EXPORT_SCALE,
    token: mask(FIGMA_TOKEN),
  });

  const json = (await fetchWithFallback(q)) as { images?: Record<string, string | null> };
  const images = json?.images || {};
  return Object.fromEntries(
    Object.entries(images).map(([k, v]) => [k, v ?? ""])
  );
}

// ↪️ Helper: ดึง URL รูปของ node เดี่ยว (เรียกฟังก์ชันข้างบน)
export async function getFigmaNodePngUrl(nodeIdRaw: string): Promise<string | null> {
  const id = normalizeNodeId(nodeIdRaw);
  const map = await figmaGetImages(FIGMA_FILE_KEY, [id]);
  return map[id] || null;
}

// (คงของเดิมไว้) ดึง document เพื่อดึง TEXT
export async function getFigmaNodeDocument(nodeIdRaw: string) {
  const id = normalizeNodeId(nodeIdRaw);
  const path = `/files/${FIGMA_FILE_KEY}/nodes?ids=${encodeURIComponent(id)}`;
  const json = await fetchWithFallback(path) as { nodes?: Record<string, { document?: any }> };
  return json?.nodes?.[id]?.document;
}

export function collectTextFromNode(doc: any): string {
  let acc: string[] = [];
  function walk(n: any) {
    if (!n) return;
    if (n.type === "TEXT" && typeof n.characters === "string") acc.push(n.characters);
    if (Array.isArray(n.children)) n.children.forEach(walk);
  }
  walk(doc);
  return acc.join("\n").trim();
}

const EN_STOP = new Set([
  "the","a","an","and","or","for","to","of","in","on","at","by","with","is","are","be","as",
  "this","that","these","those","it","its","from","your","our","you","we","they","their","i",
  "will","can","if","not","but","about","into","out","up","down","over","under","after","before",
  "then","than","so","because","get","got","have","has","had","do","does","did","use","used","using"
]);

export function extractKeywordsSimple(text: string, topN = 20): string[] {
  const words = (text || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s\-_/]/gu, " ")
    .split(/\s+/)
    .map(w => w.trim())
    .filter(Boolean)
    .filter(w => w.length >= 3 && !EN_STOP.has(w));
  const freq = new Map<string, number>();
  for (const w of words) freq.set(w, (freq.get(w) || 0) + 1);
  return [...freq.entries()].sort((a,b) => b[1]-a[1]).slice(0, topN).map(([w]) => w);
}
