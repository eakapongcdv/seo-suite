// app/app/projects/[projectid]/actions/_shared.ts
// ❌ ไม่ใส่ "use server" ในไฟล์นี้

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

/** ตรวจสิทธิ์เจ้าของโปรเจ็กต์ (ใช้ใน server actions อื่น ๆ) */
export async function ensureOwner(projectId: string) {
  const session = await auth();
  if (!session?.user?.id) return null;
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, ownerId: true, siteUrl: true },
  });
  if (!project || project.ownerId !== session.user.id) return null;
  return project; // { id, ownerId, siteUrl }
}

/** -------- Utils สำหรับ scrape / compose URL (pure functions, sync ได้) -------- */

export function toAbsoluteUrl(siteUrl: string, pageUrl: string) {
  try {
    if (!siteUrl) return pageUrl;
    if (!pageUrl) return siteUrl;
    if (pageUrl.startsWith("/")) {
      const u = new URL(siteUrl);
      return `${u.origin}${pageUrl}`;
    }
    return new URL(pageUrl).toString();
  } catch {
    return pageUrl;
  }
}

/** lightweight parsers (scrape) */
export function pickMeta(html: string, name: string) {
  const re = new RegExp(
    `<meta[^>]+(?:name|property)=["']${name}["'][^>]*content=["']([^"']+)["'][^>]*>`,
    "i"
  );
  const m = html.match(re);
  return m?.[1]?.trim() ?? "";
}

export function pickTitle(html: string) {
  const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return m?.[1]?.trim() ?? "";
}

export function pickH1(html: string) {
  const m = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const raw = m?.[1] ?? "";
  return raw.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export function pickCanonical(html: string) {
  const m = html.match(/<link[^>]+rel=["']canonical["'][^>]*href=["']([^"']+)["'][^>]*>/i);
  return m?.[1]?.trim() ?? "";
}

export function pickRobotsNoindex(html: string) {
  const content = pickMeta(html, "robots").toLowerCase();
  return content.includes("noindex") || content.includes("none");
}

export function countWords(html: string) {
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return 0;
  return text.split(/\s+/).length;
}

export function countAltCoverage(html: string) {
  const imgs = html.match(/<img\b[^>]*>/gi) || [];
  if (imgs.length === 0) return 0;
  let withAlt = 0;
  for (const tag of imgs) if (/alt=["'][^"']+["']/i.test(tag)) withAlt++;
  return Math.round((withAlt / imgs.length) * 100);
}

export function countLinks(html: string) {
  const anchors = html.match(/<a\b[^>]*href=["'][^"']+["'][^>]*>/gi) || [];
  let internal = 0;
  let external = 0;
  for (const tag of anchors) {
    const href = (tag.match(/href=["']([^"']+)["']/i) || [])[1] || "";
    if (/^https?:\/\//i.test(href)) external++;
    else internal++;
  }
  return { internal, external };
}
