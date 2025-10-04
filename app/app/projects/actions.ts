// app/app/projects/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

async function ensureUser() {
  const session = await auth();
  return session?.user?.id ?? null;
}

export async function createProjectAction(formData: FormData) {
  const userId = await ensureUser();
  if (!userId) throw new Error("Unauthorized");

  const siteName = String(formData.get("siteName") || "").trim();
  const siteUrl  = String(formData.get("siteUrl")  || "").trim();
  const targetLocale = String(formData.get("targetLocale") || "en");
  const includeBaidu = String(formData.get("includeBaidu") || "false") === "true";

  if (!siteName) throw new Error("siteName is required");

  const project = await prisma.project.create({
    data: { ownerId: userId, siteName, siteUrl, targetLocale, includeBaidu }
  });

  // อัปเดตรายการหน้า /app/projects
  revalidatePath("/app/projects");

  // ถ้าอยากพาไปหน้าโปรเจกต์ใหม่เลย ให้ใช้ redirect (จะ throw และถือเป็น void)
  // redirect(`/app/projects/${project.id}`);

  // ❗️ห้าม return ค่าใด ๆ
}

export async function deleteProjectAction(formData: FormData) {
  const userId = await ensureUser();
  if (!userId) throw new Error("Unauthorized");

  const id = String(formData.get("id"));
  const proj = await prisma.project.findFirst({ where: { id, ownerId: userId } });
  if (!proj) throw new Error("Not found");

  await prisma.project.delete({ where: { id } });
  revalidatePath("/app/projects");
}
