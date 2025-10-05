// app/app/projects/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

async function ensureUser() {
  const session = await auth();
  return session?.user?.id ?? null;
}

function normStr(v: FormDataEntryValue | null | undefined) {
  return v === null || v === undefined ? undefined : String(v).trim();
}

export async function createProjectAction(formData: FormData) {
  const userId = await ensureUser();
  if (!userId) throw new Error("Unauthorized");

  const siteName = normStr(formData.get("siteName")) || "";
  const siteUrl = normStr(formData.get("siteUrl")) || "";
  const targetLocale = normStr(formData.get("targetLocale")) || "en";

  // checkbox: ใน create ใช้ค่าจากฟอร์ม (มี value="true" เมื่อมีคีย์)
  const includeBaidu = String(formData.get("includeBaidu") || "false") === "true";

  if (!siteName) throw new Error("siteName is required");

  await prisma.project.create({
    data: {
      ownerId: userId,
      siteName,
      siteUrl,
      targetLocale,
      includeBaidu,
    },
  });

  // อัปเดตรายการหน้า /app/projects
  revalidatePath("/app/projects");
  // ❗️อย่าคืนค่า (server action ควรเป็น void)
}

export async function deleteProjectAction(formData: FormData) {
  const userId = await ensureUser();
  if (!userId) throw new Error("Unauthorized");

  const id = String(formData.get("id") || "");
  if (!id) throw new Error("Missing project id");

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

  // อ่านฟิลด์แบบ partial (มีคีย์ค่อยอัปเดต)
  const siteName = normStr(formData.get("siteName"));
  const siteUrl = normStr(formData.get("siteUrl"));
  const targetLocale = normStr(formData.get("targetLocale"));

  // checkbox edit: ถ้าฟอร์มมีช่องให้ติ๊กเสมอ ให้ใช้ .has() เพื่อ set true/false ตามสถานะจริง
  // ถ้าไม่มีช่องในฟอร์ม (บางหน้า) ให้ไม่แตะต้องฟิลด์นี้
  const includeBaidu =
    formData.has("includeBaidu") || formData.get("includeBaidu") === "false"
      ? formData.has("includeBaidu")
      : undefined;


  await prisma.project.update({
    where: { id },
    data: {
      ...(siteName !== undefined ? { siteName } : {}),
      ...(siteUrl !== undefined ? { siteUrl } : {}),
      ...(targetLocale !== undefined ? { targetLocale } : {}),
      ...(includeBaidu !== undefined ? { includeBaidu } : {}),
    },
  });

  // refresh หน้า list
  revalidatePath("/app/projects");
  // ❗️ไม่ต้อง return ค่าใด ๆ
}
