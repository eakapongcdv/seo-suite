// app/app/projects/[projectid]/integrations/actions.ts
"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export type IntegrationTypeLiteral = "GSC" | "FIGMA" | "RANK_API";

const VALID_TYPES = new Set<IntegrationTypeLiteral>(["GSC", "FIGMA", "RANK_API"]);
const VALID_VENDORS = new Set(["google", "bing", "baidu"]);

function assertNonEmpty(value: string, name: string) {
  if (!value) throw new Error(`${name} is required`);
}

async function ensureOwner(projectId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const p = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, ownerId: true },
  });
  if (!p || p.ownerId !== session.user.id) throw new Error("Forbidden");
  return session.user.id;
}

function parseType(formData: FormData): IntegrationTypeLiteral {
  const type = String(formData.get("type") || "");
  if (!VALID_TYPES.has(type as IntegrationTypeLiteral)) {
    throw new Error(`Invalid integration type: "${type}"`);
  }
  return type as IntegrationTypeLiteral;
}

/** สร้าง row integration ถ้ายังไม่มี (สถานะ INACTIVE) เพื่อกัน error ตอน update */
async function ensureIntegrationRow(projectId: string, type: IntegrationTypeLiteral, userId: string) {
  await prisma.projectIntegration.upsert({
    where: { projectId_type: { projectId, type } },
    create: {
      projectId,
      type,
      status: "INACTIVE",
      connectedAt: null,
      connectedBy: userId,
      config: {},
    },
    update: {}, // มีแล้วไม่ต้องอัปเดตอะไร
  });
}

export async function upsertGscIntegration(formData: FormData) {
  const projectId = String(formData.get("projectId") || "");
  assertNonEmpty(projectId, "projectId");

  const propertyUri = String(formData.get("propertyUri") || "").trim();
  const userId = await ensureOwner(projectId);

  await prisma.projectIntegration.upsert({
    where: { projectId_type: { projectId, type: "GSC" } },
    create: {
      projectId,
      type: "GSC",
      status: propertyUri ? "ACTIVE" : "INACTIVE",
      connectedAt: propertyUri ? new Date() : null,
      connectedBy: userId,
      propertyUri: propertyUri || null,
      config: {},
      errorMsg: null,
    },
    update: {
      status: propertyUri ? "ACTIVE" : "INACTIVE",
      connectedAt: propertyUri ? new Date() : null,
      connectedBy: userId,
      propertyUri: propertyUri || null,
      errorMsg: null,
    },
  });

  revalidatePath(`/app/projects/${projectId}/integrations`);
}

export async function upsertFigmaIntegration(formData: FormData) {
  const projectId = String(formData.get("projectId") || "");
  assertNonEmpty(projectId, "projectId");

  const fileKey = String(formData.get("fileKey") || "").trim();
  const token = String(formData.get("token") || "").trim();
  const scale = Number(formData.get("scale") || 1);
  const format = String(formData.get("format") || "png").trim() || "png";
  const userId = await ensureOwner(projectId);

  const active = !!(fileKey && token);

  await prisma.projectIntegration.upsert({
    where: { projectId_type: { projectId, type: "FIGMA" } },
    create: {
      projectId,
      type: "FIGMA",
      status: active ? "ACTIVE" : "INACTIVE",
      connectedAt: active ? new Date() : null,
      connectedBy: userId,
      config: { fileKey, token, scale, format },
      errorMsg: null,
    },
    update: {
      status: active ? "ACTIVE" : "INACTIVE",
      connectedAt: active ? new Date() : null,
      connectedBy: userId,
      config: { fileKey, token, scale, format },
      errorMsg: null,
    },
  });

  revalidatePath(`/app/projects/${projectId}/integrations`);
}

export async function upsertRankApiIntegration(formData: FormData) {
  const projectId = String(formData.get("projectId") || "");
  assertNonEmpty(projectId, "projectId");

  const vendorRaw = String(formData.get("vendor") || "google").toLowerCase().trim();
  if (!VALID_VENDORS.has(vendorRaw)) {
    throw new Error(`Invalid vendor: "${vendorRaw}" (allowed: google, bing, baidu)`);
  }
  const vendor = vendorRaw;
  const secret = String(formData.get("secret") || "").trim();
  const propertyUri = String(formData.get("propertyUri") || "").trim();
  const userId = await ensureOwner(projectId);

  const active = !!(vendor && secret);

  await prisma.projectIntegration.upsert({
    where: { projectId_type: { projectId, type: "RANK_API" } },
    create: {
      projectId,
      type: "RANK_API",
      status: active ? "ACTIVE" : "INACTIVE",
      connectedAt: active ? new Date() : null,
      connectedBy: userId,
      propertyUri: propertyUri || null,
      config: { vendor, secret },
      errorMsg: null,
    },
    update: {
      status: active ? "ACTIVE" : "INACTIVE",
      connectedAt: active ? new Date() : null,
      connectedBy: userId,
      propertyUri: propertyUri || null,
      config: { vendor, secret },
      errorMsg: null,
    },
  });

  revalidatePath(`/app/projects/${projectId}/integrations`);
}

export async function disconnectIntegration(formData: FormData) {
  const projectId = String(formData.get("projectId") || "");
  assertNonEmpty(projectId, "projectId");
  const type = parseType(formData);

  const userId = await ensureOwner(projectId);
  await ensureIntegrationRow(projectId, type, userId);

  await prisma.projectIntegration.update({
    where: { projectId_type: { projectId, type } },
    data: {
      status: "INACTIVE",
      errorMsg: null,
    },
  });

  revalidatePath(`/app/projects/${projectId}/integrations`);
}

export async function triggerSyncIntegration(formData: FormData) {
  const projectId = String(formData.get("projectId") || "");
  assertNonEmpty(projectId, "projectId");
  const type = parseType(formData);

  const userId = await ensureOwner(projectId);
  await ensureIntegrationRow(projectId, type, userId);

  // Placeholder: เรียก service จริงของคุณที่นี่ แล้วอัปเดตผลลัพธ์กลับเข้าไป
  await prisma.projectIntegration.update({
    where: { projectId_type: { projectId, type } },
    data: {
      lastSyncAt: new Date(),
      errorMsg: null,
    },
  });

  revalidatePath(`/app/projects/${projectId}/integrations`);
}
