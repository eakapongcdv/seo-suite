// lib/figma.ts
import { unstable_noStore as noStore } from "next/cache";
import { prisma } from "@/lib/db";

/** ========= ENV (Backward Compatibility) ========= */
export const FIGMA_TOKEN = process.env.FIGMA_PERSONAL_ACCESS_TOKEN!;
export const FIGMA_FILE_KEY = process.env.FIGMA_FILE_KEY!;
export const EXPORT_FORMAT = (process.env.FIGMA_EXPORT_FORMAT || "png") as "png" | "jpg" | "svg";
export const EXPORT_SCALE = Number(process.env.FIGMA_IMAGE_SCALE || 2);

/** ========= Utils ========= */
const mask = (s?: string | null) =>
  !s ? "(empty)" : s.length <= 8 ? "***" : `${s.slice(0, 4)}***${s.slice(-4)}`;

/** URL ใช้ "2946-7183" แต่ API ต้อง "2946:7183" */
export function normalizeNodeId(id: string) {
  const t = String(id || "").trim();
  return t.includes("-") && !t.includes(":") ? t.replace("-", ":") : t;
}

/** ========= Low-level fetcher ========= */
async function figmaFetch<T>(pathWithQuery: string, token: string): Promise<T> {
  noStore();
  const url = `https://api.figma.com/v1${pathWithQuery}`;

  // Request log
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

/** ========= Per-Project Credentials (from DB) ========= */
export type FigmaCred = {
  token: string;
  fileKey: string;
  format?: "png" | "jpg" | "svg";
  scale?: number;
};

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

/** ========= Images API (ENV-based; Backward-compatible) ========= */
export async function figmaGetImages(
  fileKey: string,
  nodeIdsRaw: string[]
): Promise<Record<string, string>> {
  const nodeIds = nodeIdsRaw.map(normalizeNodeId);
  const q = `/images/${fileKey}?ids=${encodeURIComponent(
    nodeIds.join(",")
  )}&format=${EXPORT_FORMAT}&scale=${EXPORT_SCALE}`;

  console.log("[FIGMA] GET images (ENV)", {
    fileKey,
    ids: nodeIds.join(","),
    format: EXPORT_FORMAT,
    scale: EXPORT_SCALE,
    token: mask(FIGMA_TOKEN),
  });

  const json = await figmaFetch<{ images?: Record<string, string | null> }>(q, FIGMA_TOKEN);
  const images = json?.images || {};

  const keys = Object.keys(images);
  console.log("[FIGMA] images resp (ENV)", {
    idsCount: keys.length,
    firstPair: keys.length ? { id: keys[0], url: images[keys[0]] } : null,
  });

  return Object.fromEntries(Object.entries(images).map(([k, v]) => [k, v ?? ""]));
}

/** Helper (ENV): single node image URL */
export async function getFigmaNodePngUrl(nodeIdRaw: string): Promise<string | null> {
  const id = normalizeNodeId(nodeIdRaw);
  const map = await figmaGetImages(FIGMA_FILE_KEY, [id]);
  return map[id] || null;
}

/** ========= Images API (Per-Project cred) ========= */
export async function figmaGetImagesByCred(
  cred: FigmaCred,
  nodeIdsRaw: string[]
): Promise<Record<string, string>> {
  const { token, fileKey, format = "png", scale = 2 } = cred;
  const nodeIds = nodeIdsRaw.map(normalizeNodeId);
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

  const keys = Object.keys(images);
  console.log("[FIGMA] images resp (DB cred)", {
    idsCount: keys.length,
    firstPair: keys.length ? { id: keys[0], url: images[keys[0]] } : null,
  });

  return Object.fromEntries(Object.entries(images).map(([k, v]) => [k, v ?? ""]));
}

/** ========= Nodes/Document (ENV-based) ========= */
export async function getFigmaNodeDocument(nodeIdRaw: string) {
  const id = normalizeNodeId(nodeIdRaw);
  const path = `/files/${FIGMA_FILE_KEY}/nodes?ids=${encodeURIComponent(id)}`;
  const json = (await figmaFetch<{ nodes?: Record<string, { document?: any }> }>(
    path,
    FIGMA_TOKEN
  ));
  return json?.nodes?.[id]?.document;
}

/** ========= Nodes/Document (Per-Project cred) ========= */
export async function getFigmaNodeDocumentByCred(cred: FigmaCred, nodeIdRaw: string) {
  const { token, fileKey } = cred;
  const id = normalizeNodeId(nodeIdRaw);
  const path = `/files/${fileKey}/nodes?ids=${encodeURIComponent(id)}`;
  const json = await figmaFetch<{ nodes?: Record<string, { document?: any }> }>(path, token);
  return json?.nodes?.[id]?.document;
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
