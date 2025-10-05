"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { ensureOwner } from "./_shared";

export async function updatePageAction(formData: FormData) {
  const id = String(formData.get("id"));
  const projectId = String(formData.get("projectId"));
  const ok = await ensureOwner(projectId);
  if (!ok) throw new Error("Unauthorized");

  const pageName = formData.get("pageName");
  const pageUrl = formData.get("pageUrl");
  const sortRaw = formData.get("sortNumber");
  const pageDescriptionSummary = formData.get("pageDescriptionSummary");
  const pageMetaDescription = formData.get("pageMetaDescription");
  const pageSeoKeywordsRaw = formData.get("pageSeoKeywords");
  const lighthouseSeo = formData.get("lighthouseSeo");
  const lighthousePerf = formData.get("lighthousePerf");
  const lighthouseAccessibility = formData.get("lighthouseAccessibility");

  const data: any = {};
  if (pageName !== null) data.pageName = String(pageName).trim();
  if (pageUrl !== null) data.pageUrl = String(pageUrl).trim();
  if (sortRaw !== null) {
    data.sortNumber = Number(sortRaw);
    if (Number.isNaN(data.sortNumber)) data.sortNumber = 0;
  }
  if (pageDescriptionSummary !== null) {
    const v = String(pageDescriptionSummary).trim();
    data.pageDescriptionSummary = v || null;
  }
  if (pageMetaDescription !== null) {
    const v = String(pageMetaDescription).trim();
    data.pageMetaDescription = v || null;
  }
  if (pageSeoKeywordsRaw !== null) {
    const arr = String(pageSeoKeywordsRaw)
      .split(/[,;\n]/g)
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    data.pageSeoKeywords = Array.from(new Set(arr));
  }

  const clamp100 = (n: number) => Math.max(0, Math.min(100, Math.round(n)));
  if (lighthouseSeo !== null) {
    const n = Number(lighthouseSeo);
    data.lighthouseSeo = Number.isNaN(n) ? null : clamp100(n);
  }
  if (lighthousePerf !== null) {
    const n = Number(lighthousePerf);
    data.lighthousePerf = Number.isNaN(n) ? null : clamp100(n);
  }
  if (lighthouseAccessibility !== null) {
    const n = Number(lighthouseAccessibility);
    data.lighthouseAccessibility = Number.isNaN(n) ? null : clamp100(n);
  }

  await prisma.page.update({ where: { id }, data });
  revalidatePath(`/app/projects/${projectId}`);
}
