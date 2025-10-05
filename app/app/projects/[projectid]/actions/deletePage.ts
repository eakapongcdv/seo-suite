"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { ensureOwner } from "./_shared";

export async function deletePageAction(formData: FormData) {
  const id = String(formData.get("id"));
  const projectId = String(formData.get("projectId"));
  const ok = await ensureOwner(projectId);
  if (!ok) throw new Error("Unauthorized");

  await prisma.page.delete({ where: { id } });
  revalidatePath(`/app/projects/${projectId}`);
}
