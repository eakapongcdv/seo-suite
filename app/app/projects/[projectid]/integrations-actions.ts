// app/app/projects/[projectid]/integrations-actions.ts
"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";

async function ensureOwner(projectId: string) {
  const session = await auth();
  if (!session?.user?.id) return null;
  const proj = await prisma.project.findUnique({ where: { id: projectId }, select: { ownerId: true }});
  if (!proj || proj.ownerId !== session.user.id) return null;
  return proj;
}

export async function upsertFigmaIntegrationAction(formData: FormData) {
  const projectId = String(formData.get("projectId"));
  const token = String(formData.get("token") || "").trim();
  const fileKey = String(formData.get("fileKey") || "").trim();
  const format = (String(formData.get("format") || "png") as "png" | "jpg" | "svg");
  const scale = Number(formData.get("scale") || 2);

  if (!await ensureOwner(projectId)) throw new Error("Unauthorized");
  if (!token || !fileKey) throw new Error("Missing token/fileKey");

  const cfg = { token, fileKey, format, scale };

  await prisma.projectIntegration.upsert({
    where: {
      // unique composite key แนะนำให้ทำใน DB จริง (หรือใช้ findFirst + upsert logic)
      // ที่นี่ใช้วิธี findFirst + create/update เพื่อความยืดหยุ่น
      // ถ้าไม่มี unique constraint ให้คุมที่โค้ดแทน
      id: (
        await prisma.projectIntegration.findFirst({
          where: { projectId, type: "FIGMA" }
        })
      )?.id || "___placeholder___"
    },
    create: {
      projectId,
      type: "FIGMA",
      status: "ACTIVE",
      connectedAt: new Date(),
      config: cfg
    },
    update: {
      status: "ACTIVE",
      config: cfg,
      errorMsg: null
    }
  });

  revalidatePath(`/app/projects/${projectId}`);
}
