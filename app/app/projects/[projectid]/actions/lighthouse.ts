"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { ensureOwner } from "./_shared";

export async function refreshLighthouseAction(formData: FormData) {
  const pageId = String(formData.get("pageId") || "");
  const projectId = String(formData.get("projectId") || "");

  if (process.env.ENABLE_LIGHTHOUSE === "false") {
    revalidatePath(`/app/projects/${projectId}`);
    return;
  }
  // @ts-ignore
  if (typeof process === "undefined" || (process as any).env?.NEXT_RUNTIME === "edge") {
    revalidatePath(`/app/projects/${projectId}`);
    return;
  }

  const ok = await ensureOwner(projectId);
  if (!ok) { revalidatePath(`/app/projects/${projectId}`); return; }

  const project = await prisma.project.findFirst({ where: { id: projectId }, select: { siteUrl: true } });
  if (!project?.siteUrl) { revalidatePath(`/app/projects/${projectId}`); return; }

  const page = await prisma.page.findUnique({ where: { id: pageId }, select: { pageUrl: true } });
  if (!page) { revalidatePath(`/app/projects/${projectId}`); return; }

  let targetUrl = page.pageUrl?.startsWith("http")
    ? page.pageUrl!
    : new URL(page.pageUrl || "/", project.siteUrl).toString();

  let lighthouse: any, launch: any, chrome: any;
  try {
    const lhMod = await import("lighthouse/core/index.cjs");
    lighthouse = lhMod.default || lhMod;
    const chromeMod = await import("chrome-launcher");
    launch = chromeMod.launch;

    chrome = await launch({
      chromeFlags: ["--headless=new","--no-sandbox","--disable-gpu","--disable-dev-shm-usage"],
    });

    const options = {
      logLevel: "info",
      output: "json",
      onlyCategories: ["performance", "seo", "accessibility"],
      port: chrome.port,
    } as const;

    const result = await lighthouse(targetUrl, options as any);
    const perf = Math.round(((result.lhr.categories.performance?.score ?? 0) as number) * 100);
    const seo  = Math.round(((result.lhr.categories.seo?.score ?? 0) as number) * 100);
    const a11y = Math.round(((result.lhr.categories.accessibility?.score ?? 0) as number) * 100);

    await prisma.page.update({
      where: { id: pageId },
      data: {
        lighthousePerf: Number.isFinite(perf) ? perf : null,
        lighthouseSeo: Number.isFinite(seo) ? seo : null,
        lighthouseAccessibility: Number.isFinite(a11y) ? a11y : null,
      },
    });
  } catch {
    await prisma.page.update({
      where: { id: pageId },
      data: { lighthousePerf: null, lighthouseSeo: null, lighthouseAccessibility: null },
    });
  } finally {
    try { if (chrome) await chrome.kill(); } catch {}
  }

  revalidatePath(`/app/projects/${projectId}`);
}
