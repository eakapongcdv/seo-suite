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

export async function updateProjectAction(formData: FormData) {
  const userId = await ensureUser();
  if (!userId) throw new Error("Unauthorized");

  const id = String(formData.get("id") || "");
  if (!id) throw new Error("Missing project id");

  // ตรวจว่าเป็นโปรเจกต์ของผู้ใช้คนนี้จริง
  const exists = await prisma.project.findFirst({
    where: { id, ownerId: userId },
    select: { id: true },
  });
  if (!exists) throw new Error("Not found");

  // ดึงค่าจากฟอร์ม (อัปเดตแบบ partial)
  const siteName = formData.get("siteName")?.toString().trim();
  const siteUrl = formData.get("siteUrl")?.toString().trim();
  const targetLocale = formData.get("targetLocale")?.toString().trim();

  // checkbox: ถ้าไม่ติ๊ก จะไม่มีคีย์ใน FormData → ใช้ formData.has()
  const includeBaidu = formData.has("includeBaidu");

  await prisma.project.update({
    where: { id },
    data: {
      ...(siteName !== undefined ? { siteName } : {}),
      ...(siteUrl !== undefined ? { siteUrl } : {}),
      ...(targetLocale !== undefined ? { targetLocale } : {}),
      includeBaidu,
    },
  });

  // refresh หน้า list
  revalidatePath("/app/projects");
  // ❗️ไม่ต้อง return ค่าใด ๆ
}

