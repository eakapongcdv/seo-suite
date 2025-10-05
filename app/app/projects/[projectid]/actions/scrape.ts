"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { ensureOwner, toAbsoluteUrl, pickMeta, pickTitle, pickH1, pickCanonical, pickRobotsNoindex, countWords, countAltCoverage, countLinks } from "./_shared";

export async function scrapeRealPageAction(formData: FormData) {
  const pageId = String(formData.get("pageId") || "");
  const projectId = String(formData.get("projectId") || "");
  const ok = await ensureOwner(projectId);
  if (!ok) throw new Error("Unauthorized");

  const page = await prisma.page.findUnique({ where: { id: pageId }, select: { id: true, pageUrl: true } });
  if (!page?.pageUrl) throw new Error("Page URL not found");

  const targetUrl = toAbsoluteUrl(ok.siteUrl, page.pageUrl);
  const res = await fetch(targetUrl, { cache: "no-store" });
  const html = await res.text();

  const title = pickTitle(html);
  const metaDesc = pickMeta(html, "description") || pickMeta(html, "og:description");
  const h1 = pickH1(html);
  const canonicalHref = pickCanonical(html);
  const robotsNoindex = pickRobotsNoindex(html);
  const wordCount = countWords(html);
  const altPct = countAltCoverage(html);
  const { internal, external } = countLinks(html);

  const seoTitlePresent = !!title;
  const seoTitleLengthOk = title.length >= 30 && title.length <= 60;
  const seoH1Present = !!h1;
  const seoCanonicalPresent = !!canonicalHref;

  const absTarget = new URL(targetUrl);
  let canonicalSelfReferential = false;
  try {
    const absCanon = new URL(canonicalHref, absTarget.origin);
    canonicalSelfReferential = absCanon.href.replace(/\/$/, "") === absTarget.href.replace(/\/$/, "");
  } catch {}

  await prisma.page.update({
    where: { id: pageId },
    data: {
      pageMetaDescription: metaDesc || undefined,
      seoTitlePresent,
      seoTitleLengthOk,
      seoH1Present,
      seoCanonicalPresent,
      seoCanonicalSelfReferential: canonicalSelfReferential,
      seoRobotsNoindex: robotsNoindex,
      seoWordCount: wordCount,
      seoAltTextCoveragePct: altPct,
      seoInternalLinks: internal,
      seoExternalLinks: external,
    },
  });

  revalidatePath(`/app/projects/${projectId}`);
}
