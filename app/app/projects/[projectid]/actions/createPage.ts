"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { ensureOwner } from "./_shared";

export async function createPageAction(formData: FormData) {
  const projectId = String(formData.get("projectId"));
  const ok = await ensureOwner(projectId);
  if (!ok) throw new Error("Unauthorized");

  const pageName = String(formData.get("pageName") || "Untitled").trim();
  const pageUrl = String(formData.get("pageUrl") || "/").trim();
  const figmaNodeId = (formData.get("figmaNodeId") as string | null)?.toString().trim() || null;
  const sortNumber = Number(formData.get("sortNumber") ?? 0) || 0;

  await prisma.page.create({
    data: { projectId, pageName, pageUrl, figmaNodeId: figmaNodeId || undefined, sortNumber },
  });

  revalidatePath(`/app/projects/${projectId}`);
}
