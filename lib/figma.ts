// lib/figma.ts
import { unstable_noStore as noStore } from "next/cache";
import { prisma } from "@/lib/db";

/** ========= Utils ========= */
const mask = (s?: string | null) =>
  !s ? "(empty)" : s.length <= 8 ? "***" : `${s.slice(0, 4)}***${s.slice(-4)}`;

/** ตรวจรูปแบบ node id แบบถูกต้อง (เช่น "12:345" หรือมีตัวอักษรเสริมก็ได้) */
export function isValidNodeId(id: string) {
  // ฟอร์แมตที่ API ยอมรับ: มักเป็น "digits:digits" หรือชุดอักษรตัวเลข/ตัวใหญ่/ตัวเล็ก/ขีดล่างต่อด้วย ":" แล้วตัวเลข/อักษร
  // ใช้เกณฑ์กว้างพอสมควร
  return /^[A-Za-z0-9_]+:[A-Za-z0-9_]+$/.test(id);
}

/** ดึง node-id จากสตริงอินพุต (รองรับ URL / 1-23 / 1%3A23 / 1:23) */
export function parseNodeIdFromInput(raw: string): string {
  const t = String(raw || "").trim();

  // 1) ถ้าเป็น URL ของ Figma → ดึงพารามิเตอร์ node-id / nodeId / selection
  if (/^https?:\/\/(www\.)?figma\.com\//i.test(t)) {
    try {
      const u = new URL(t);
      // ลองดึงจาก "node-id" ก่อน
      let nodeParam =
        u.searchParams.get("node-id") ||
        u.searchParams.get("nodeId") ||
        u.searchParams.get("selection") ||
        "";

      nodeParam = decodeURIComponent(nodeParam);

      // รูปแบบที่เจอบ่อยใน URL: 1-23 → ต้องแปลงเป็น 1:23
      if (/^[^:]+-[^:]+$/.test(nodeParam)) {
        nodeParam = nodeParam.replace("-", ":");
      }
      if (isValidNodeId(nodeParam)) return nodeParam;
    } catch {
      // ตกมาให้ลองวิธีถัดไป
    }
  }

  // 2) ถ้าอินพุตเป็น percent-encoded เช่น 1%3A23 → decode
  let s = t;
  try {
    s = decodeURIComponent(t);
  } catch {
    /* ignore */
  }

  // 3) 1-23 → 1:23
  if (/^[^:]+-[^:]+$/.test(s)) {
    s = s.replace("-", ":");
  }

  // 4) ถ้าได้รูปแบบ valid แล้ว คืนค่าทันที
  if (isValidNodeId(s)) return s;

  // ไม่ผ่าน → โยน error พร้อมคำแนะนำ
  throw new Error(
    `Invalid Figma node id: "${raw}". Please paste a valid node id (e.g. "1:23") or a Figma URL containing "?node-id=...".`
  );
}

/** URL ใช้ "2946-7183" แต่ API ต้อง "2946:7183" */
export function normalizeNodeId(id: string) {
  // คงไว้เพื่อ backward compat แต่ตอนนี้เราให้ parseNodeIdFromInput ช่วยก่อน
  const t = String(id || "").trim();
  if (/^[^:]+-[^:]+$/.test(t)) return t.replace("-", ":");
  return t;
}

/** ========= Low-level fetcher ========= */
async function figmaFetch<T>(pathWithQuery: string, token: string): Promise<T> {
  noStore();
  const url = `https://api.figma.com/v1${pathWithQuery}`;

  // Request log (safe mask)
  console.log("[FIGMA] fetch →", {
    url,
    headers: { "X-Figma-Token": mask(token) },
  });

  const res = await fetch(url, {
    headers: { "X-Figma-Token": token },
    cache: "no-store",
  });

  const raw = await res.text();

  if (!res.ok) {
    console.log("[FIGMA] !ok", {
      status: res.status,
      statusText: res.statusText,
      bodyPreview: raw.slice(0, 500),
    });
    throw new Error(`[FIGMA] ${res.status} ${res.statusText}: ${raw.slice(0, 500)}`);
  }

  // Response log (safe)
  console.log("[FIGMA] ok", {
    status: res.status,
    statusText: res.statusText,
    bodyPreview: raw.slice(0, 180),
  });

  try {
    return JSON.parse(raw) as T;
  } catch {
    return raw as unknown as T;
  }
}

/** ========= Per-Project Credentials (from DB: ProjectIntegration.config) ========= */
export type FigmaCred = {
  token: string;
  fileKey: string;
  format?: "png" | "jpg" | "svg";
  scale?: number;
};

/**
 * อ่าน config จาก ProjectIntegration (type=FIGMA, status=ACTIVE)
 * ตัวอย่าง config:
 * {
 *   "scale": 1,
 *   "token": "figd_***",
 *   "format": "png",
 *   "fileKey": "Y7POXMSBlGhvED21y8cB3q"
 * }
 */
export async function getProjectFigmaCred(projectId: string): Promise<FigmaCred | null> {
  noStore();
  const integ = await prisma.projectIntegration.findFirst({
    where: { projectId, type: "FIGMA", status: "ACTIVE" },
    select: { config: true },
  });

  const cfg = (integ?.config ?? {}) as any;
  if (!cfg?.token || !cfg?.fileKey) return null;

  const cred: FigmaCred = {
    token: String(cfg.token),
    fileKey: String(cfg.fileKey),
    format: (cfg.format ?? "png") as "png" | "jpg" | "svg",
    scale: Number(cfg.scale ?? 2),
  };

  console.log("[FIGMA] cred(from DB)", {
    fileKey: cred.fileKey,
    format: cred.format,
    scale: cred.scale,
    token: mask(cred.token),
  });

  return cred;
}

/** ========= Images API (Per-Project cred) ========= */
export async function figmaGetImagesByCred(
  cred: FigmaCred,
  nodeIdsRaw: string[]
): Promise<Record<string, string>> {
  noStore();
  const { token, fileKey, format = "png", scale = 2 } = cred;
  const nodeIds = nodeIdsRaw.map((r) => parseNodeIdFromInput(r)); // ✅ แข็งแรงขึ้น
  const q = `/images/${fileKey}?ids=${encodeURIComponent(
    nodeIds.join(",")
  )}&format=${format}&scale=${scale}`;

  console.log("[FIGMA] GET images (DB cred)", {
    fileKey,
    ids: nodeIds.join(","),
    format,
    scale,
    token: mask(token),
  });

  const json = await figmaFetch<{ images?: Record<string, string | null> }>(q, token);
  const images = json?.images || {};
  return Object.fromEntries(Object.entries(images).map(([k, v]) => [k, v ?? ""]));
}

/** ========= High-level helpers (รับ projectId โดยตรง) ========= */

/** ดึงภาพหลาย node โดยอ้างอิง cred จาก ProjectIntegration ของโปรเจกต์ */
export async function figmaGetImagesForProject(
  projectId: string,
  nodeIdsRaw: string[]
): Promise<Record<string, string>> {
  const cred = await getProjectFigmaCred(projectId);
  if (!cred) {
    throw new Error(
      "[FIGMA] Missing Figma credentials in ProjectIntegration (type=FIGMA, status=ACTIVE)."
    );
  }
  return figmaGetImagesByCred(cred, nodeIdsRaw);
}

/** ดึงภาพ node เดียว (URL) โดยอ้างอิง cred โปรเจกต์ */
export async function getFigmaNodeImageUrlForProject(
  projectId: string,
  nodeIdRaw: string
): Promise<string | null> {
  const map = await figmaGetImagesForProject(projectId, [nodeIdRaw]);
  const id = normalizeNodeId(nodeIdRaw);
  return map[id] || null;
}

/** ========= Nodes/Document (Per-Project cred) ========= */
export async function getFigmaNodeDocumentByCred(cred: FigmaCred, nodeIdRaw: string) {
  noStore();
  const { token, fileKey } = cred;
  const id = parseNodeIdFromInput(nodeIdRaw); // ✅ แข็งแรงขึ้น
  const path = `/files/${fileKey}/nodes?ids=${encodeURIComponent(id)}`;
  const json = await figmaFetch<{ nodes?: Record<string, { document?: any }> }>(path, token);
  return json?.nodes?.[id]?.document;
}

/** อ่านโหนดจากโปรเจกต์ (สะดวก: ส่ง projectId + nodeId) */
export async function getFigmaNodeDocumentForProject(projectId: string, nodeIdRaw: string) {
  const cred = await getProjectFigmaCred(projectId);
  if (!cred) {
    throw new Error(
      "[FIGMA] Missing Figma credentials in ProjectIntegration (type=FIGMA, status=ACTIVE)."
    );
  }
  return getFigmaNodeDocumentByCred(cred, nodeIdRaw);
}

/** ========= Text & Keywords ========= */
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
    .map((w) => w.trim())
    .filter(Boolean)
    .filter((w) => w.length >= 3 && !EN_STOP.has(w));
  const freq = new Map<string, number>();
  for (const w of words) freq.set(w, (freq.get(w) || 0) + 1);
  return [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, topN).map(([w]) => w);
}
