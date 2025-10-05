// app/app/projects/[projectid]/integrations/actions.ts
"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export type IntegrationTypeLiteral = "GSC" | "FIGMA" | "RANK_API";

/** ========== helpers ========== */
function mask(str?: string | null) {
  if (!str) return "(empty)";
  const s = String(str);
  if (s.length <= 8) return "***";
  return `${s.slice(0, 4)}***${s.slice(-4)}`;
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

export async function upsertGscIntegration(formData: FormData) {
  const projectId = String(formData.get("projectId") || "");
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
  const fileKey = String(formData.get("fileKey") || "").trim();
  const token = String(formData.get("token") || "").trim();
  const scale = Number(formData.get("scale") || 1);
  const format = String(formData.get("format") || "png");
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

/** ========== RANK_API with debug logs ========== */
export async function upsertRankApiIntegration(formData: FormData) {
  const projectId = String(formData.get("projectId") || "");
  const vendor = String(formData.get("vendor") || "google").toLowerCase();
  const userId = await ensureOwner(projectId);

  // เก็บสถานะ + config ก่อนอัปเสิร์ต เพื่อ debug
  const before = await prisma.projectIntegration.findUnique({
    where: { projectId_type: { projectId, type: "RANK_API" } },
    select: { status: true, propertyUri: true, config: true, errorMsg: true, connectedAt: true },
  });

  let statusActive = false;
  let propertyUri: string | null = null;
  let config: any = { vendor };
  let debugNote = "";

  try {
    console.log("[RANK_API][UPSERT] start", {
      projectId,
      vendor,
      before: {
        status: before?.status,
        connectedAt: before?.connectedAt,
        propertyUri: before?.propertyUri,
      },
    });

    if (vendor === "google") {
      // รับ field ของ Google Ads
      const developer_token = String(formData.get("developer_token") || "").trim();
      const client_id       = String(formData.get("client_id") || "").trim();
      const client_secret   = String(formData.get("client_secret") || "").trim();
      const refresh_token   = String(formData.get("refresh_token") || "").trim();
      const login_customer_id = String(formData.get("login_customer_id") || "").replace(/-/g, "").trim() || undefined;
      const customer_id       = String(formData.get("customer_id") || "").replace(/-/g, "").trim();

      propertyUri = String(formData.get("propertyUri") || "").trim() || null;

      const secret = {
        developer_token,
        client_id,
        client_secret,
        refresh_token,
        login_customer_id,
        customer_id,
      };

      config.secret = secret;

      statusActive = !!(developer_token && client_id && client_secret && refresh_token && customer_id);

      // DEBUG (mask ค่าลับ)
      console.log("[RANK_API][UPSERT] google secret (masked)", {
        has_dev_token: !!developer_token,
        developer_token: mask(developer_token),
        client_id: mask(client_id),
        client_secret: mask(client_secret),
        refresh_token: mask(refresh_token),
        login_customer_id: login_customer_id || "(none)",
        customer_id_len: customer_id ? customer_id.length : 0,
        propertyUri,
        willBeActive: statusActive,
      });

      if (!statusActive) {
        debugNote =
          "Missing Google Ads credentials. Required: developer_token, client_id, client_secret, refresh_token, customer_id";
      }
    } else {
      // generic vendors (bing/baidu ฯลฯ)
      const secret = String(formData.get("secret") || "").trim();
      propertyUri = String(formData.get("propertyUri") || "").trim() || null;
      config.secret = secret;
      statusActive = !!(vendor && secret);

      console.log("[RANK_API][UPSERT] generic vendor", {
        vendor,
        secret_masked: mask(secret),
        propertyUri,
        willBeActive: statusActive,
      });

      if (!statusActive) {
        debugNote = "Missing vendor or secret for generic RANK_API vendor";
      }
    }

    // upsert
    const saved = await prisma.projectIntegration.upsert({
      where: { projectId_type: { projectId, type: "RANK_API" } },
      create: {
        projectId,
        type: "RANK_API",
        status: statusActive ? "ACTIVE" : "INACTIVE",
        connectedAt: statusActive ? new Date() : null,
        connectedBy: userId,
        propertyUri,
        config,
        errorMsg: statusActive ? null : debugNote || null,
      },
      update: {
        status: statusActive ? "ACTIVE" : "INACTIVE",
        connectedAt: statusActive ? new Date() : null,
        connectedBy: userId,
        propertyUri,
        config,
        errorMsg: statusActive ? null : debugNote || null,
      },
      select: { status: true, connectedAt: true, propertyUri: true, errorMsg: true },
    });

    console.log("[RANK_API][UPSERT] done", { after: saved });

    revalidatePath(`/app/projects/${projectId}/integrations`);
  } catch (err: any) {
    const msg = err?.message || String(err);
    console.error("[RANK_API][UPSERT] ERROR:", msg);

    // บันทึก errorMsg เพื่อแสดงใน UI
    try {
      await prisma.projectIntegration.upsert({
        where: { projectId_type: { projectId, type: "RANK_API" } },
        create: {
          projectId,
          type: "RANK_API",
          status: "INACTIVE",
          connectedAt: null,
          connectedBy: userId,
          propertyUri,
          config,
          errorMsg: msg,
        },
        update: {
          status: "INACTIVE",
          errorMsg: msg,
        },
      });
    } catch (e) {
      console.error("[RANK_API][UPSERT] failed to persist errorMsg:", e);
    }

    revalidatePath(`/app/projects/${projectId}/integrations`);
    throw err; // ให้ action ส่ง error ต่อไป (จะเห็นใน dev console)
  }
}

export async function disconnectIntegration(formData: FormData) {
  const projectId = String(formData.get("projectId") || "");
  const type = String(formData.get("type") || "") as IntegrationTypeLiteral;
  await ensureOwner(projectId);

  await prisma.projectIntegration.update({
    where: { projectId_type: { projectId, type } },
    data: {
      status: "INACTIVE",
      errorMsg: null,
    },
  });

  console.log("[INTEGRATION][DISCONNECT]", { projectId, type });

  revalidatePath(`/app/projects/${projectId}/integrations`);
}

export async function triggerSyncIntegration(formData: FormData) {
  const projectId = String(formData.get("projectId") || "");
  const type = String(formData.get("type") || "") as IntegrationTypeLiteral;
  await ensureOwner(projectId);

  await prisma.projectIntegration.update({
    where: { projectId_type: { projectId, type } },
    data: {
      lastSyncAt: new Date(),
      errorMsg: null,
    },
  });

  console.log("[INTEGRATION][SYNC]", { projectId, type, at: new Date().toISOString() });

  revalidatePath(`/app/projects/${projectId}/integrations`);
}

// เพิ่มในไฟล์เดียวกัน: app/app/projects/[projectid]/integrations/actions.ts
export async function testRankApiGoogle(formData: FormData) {
  const projectId = String(formData.get("projectId") || "");
  await ensureOwner(projectId);

  // ดึงคอนฟิก RANK_API
  const integ = await prisma.projectIntegration.findUnique({
    where: { projectId_type: { projectId, type: "RANK_API" } },
    select: { config: true },
  });

  const cfg = (integ?.config ?? {}) as any;
  if (!cfg?.vendor || String(cfg.vendor).toLowerCase() !== "google") {
    await prisma.projectIntegration.update({
      where: { projectId_type: { projectId, type: "RANK_API" } },
      data: { status: "INACTIVE", errorMsg: "Vendor is not 'google' for RANK_API." },
    });
    revalidatePath(`/app/projects/${projectId}/integrations`);
    return;
  }

  // แกะ secret (object หรือ json string)
  let secret: any = null;
  try { secret = typeof cfg.secret === "string" ? JSON.parse(cfg.secret) : cfg.secret; } catch {}

  const dev  = secret?.developer_token;
  const cid  = secret?.client_id;
  const cs   = secret?.client_secret;
  const rt   = secret?.refresh_token;
  const cust = (secret?.customer_id || "").replace(/-/g, "");
  const mcc  = (secret?.login_customer_id || "").replace(/-/g, "") || undefined;

  // เช็คฟิลด์จำเป็น
  const missing: string[] = [];
  if (!dev)  missing.push("developer_token");
  if (!cid)  missing.push("client_id");
  if (!cs)   missing.push("client_secret");
  if (!rt)   missing.push("refresh_token");
  if (!cust) missing.push("customer_id");

  if (missing.length) {
    await prisma.projectIntegration.update({
      where: { projectId_type: { projectId, type: "RANK_API" } },
      data: { status: "INACTIVE", errorMsg: `Missing fields: ${missing.join(", ")}` },
    });
    revalidatePath(`/app/projects/${projectId}/integrations`);
    return;
  }

  try {
    // ใช้แพ็กเกจ google-ads-api (Customer.query)
    const { GoogleAdsApi } = await import("google-ads-api");
    const client = new GoogleAdsApi({
      developer_token: dev,
      client_id: cid,
      client_secret: cs,
    });

    const customer = client.Customer({
      customer_id: cust,
      refresh_token: rt,
      login_customer_id: mcc, // optional MCC
    });

    // ยิง query เบาๆ เพื่อยืนยันสิทธิ์/โทเคน
    const rows = await customer.query(`
      SELECT customer.id, customer.descriptive_name
      FROM customer
      LIMIT 1
    `);
    console.log("[RANK_API][TEST] OK:", rows?.[0]);

    await prisma.projectIntegration.update({
      where: { projectId_type: { projectId, type: "RANK_API" } },
      data: { status: "ACTIVE", lastSyncAt: new Date(), errorMsg: null },
    });
  } catch (e: any) {
    const msg = e?.message || String(e);
    console.error("[RANK_API][TEST] ERROR:", msg);
    await prisma.projectIntegration.update({
      where: { projectId_type: { projectId, type: "RANK_API" } },
      data: { status: "INACTIVE", errorMsg: `Google Ads test failed: ${msg}` },
    });
  } finally {
    revalidatePath(`/app/projects/${projectId}/integrations`);
  }
}