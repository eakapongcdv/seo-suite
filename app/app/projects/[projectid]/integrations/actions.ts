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
      const developer_token = String(formData.get("developer_token") || "").trim();
      const client_id       = String(formData.get("client_id") || "").trim();
      const client_secret   = String(formData.get("client_secret") || "").trim();
      const refresh_token   = String(formData.get("refresh_token") || "").trim();
      const login_customer_id = String(formData.get("login_customer_id") || "").replace(/-/g, "").trim() || undefined;
      const customer_id       = String(formData.get("customer_id") || "").replace(/-/g, "").trim();
      const keyword_planner_customer_id = String(formData.get("keyword_planner_customer_id") || "")
        .replace(/-/g, "")
        .trim() || undefined;

      propertyUri = String(formData.get("propertyUri") || "").trim() || null;

      const secret = {
        developer_token,
        client_id,
        client_secret,
        refresh_token,
        login_customer_id,
        customer_id,
        keyword_planner_customer_id,
      };

      config.secret = secret;

      statusActive = !!(developer_token && client_id && client_secret && refresh_token && customer_id);

      console.log("[RANK_API][UPSERT] google secret (masked)", {
        has_dev_token: !!developer_token,
        developer_token: mask(developer_token),
        client_id: mask(client_id),
        client_secret: mask(client_secret),
        refresh_token: mask(refresh_token),
        login_customer_id: login_customer_id || "(none)",
        customer_id_len: customer_id ? customer_id.length : 0,
        has_kp_cid: !!keyword_planner_customer_id,
        propertyUri,
        willBeActive: statusActive,
      });

      if (!statusActive) {
        debugNote =
          "Missing Google Ads credentials. Required: developer_token, client_id, client_secret, refresh_token, customer_id";
      }
    } else {
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
    throw err;
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

/** ---------- Helpers: stringify Google Ads errors อย่างฉลาด ---------- */
function jsonSafe(v: any, max = 2000) {
  try {
    const s = JSON.stringify(
      v,
      (_k, val) => (typeof val === "bigint" ? Number(val) : val),
      2
    );
    return s.length > max ? s.slice(0, max) + "…(truncated)" : s;
  } catch {
    return String(v);
  }
}

function extractGoogleAdsError(err: any): string {
  const details = Array.isArray(err?.details) ? err.details : undefined;
  const firstErrors = Array.isArray(details?.[0]?.errors) ? details[0].errors : undefined;
  const firstError = firstErrors?.[0];

  const parts: string[] = [];
  if (err?.code) parts.push(`code=${err.code}`);
  if (err?.status) parts.push(`status=${err.status}`);
  if (err?.message) parts.push(err.message);

  if (firstError?.message) parts.push(`detail=${firstError.message}`);
  const ec = firstError?.error_code;
  if (ec && typeof ec === "object") {
    const keys = Object.keys(ec).filter((k) => ec[k]);
    if (keys.length) parts.push(`error_code=${keys.map((k) => `${k}:${ec[k]}`).join(",")}`);
  }
  if (firstError?.location?.field_path_elements?.length) {
    const path = firstError.location.field_path_elements
      .map((e: any) => e?.field_name)
      .filter(Boolean)
      .join(".");
    if (path) parts.push(`field=${path}`);
  }

  if (err?.response?.data) {
    const d = err.response.data;
    const e2 = d.error || d;
    if (e2?.message && typeof e2.message === "string") parts.push(`resp=${e2.message}`);
    else parts.push(`resp=${jsonSafe(e2, 400)}`);
  } else if (err?.error) {
    if (typeof err.error === "string") parts.push(`error=${err.error}`);
    else parts.push(`error=${jsonSafe(err.error, 400)}`);
  }

  if (parts.length === 0) {
    return jsonSafe(err, 600);
  }
  return parts.join(" | ");
}

function prettyGoogleAdsError(err: any): string {
  try {
    const body = err?.meta?.body || err;
    if (typeof body === "string") return body;
    if (body?.errors && Array.isArray(body.errors)) {
      return JSON.stringify(body, null, 2);
    }
    if (err?.message) return err.message;
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

/** ========== ทดสอบ credential แบบไม่ throw + DEBUG ครบถ้วน ========== */
export async function testRankApiGoogle(formData: FormData) {
  const projectId = String(formData.get("projectId") || "");
  await ensureOwner(projectId);

  const kwSample = ["ไอโฟน"]; // หรือ "iphone 17 pro max"

  // ✅ ใช้ array ปกติ (mutable) เพื่อให้ตรงกับ signature ใน lib
  const kwOptions: { language_code: "th"; geo_target_constants: string[] } = {
    language_code: "th",
    geo_target_constants: ["geoTargetConstants/2764"], // Thailand
  };

  const startedAt = new Date();
  console.groupCollapsed(`[RANK_API][TEST][${projectId}] start ${startedAt.toISOString()}`);
  try {
    console.log("[RANK_API][TEST] getGoogleAdsClientForProject…");
    const { customer, client, customerId, loginCustomerId } =
      await (await import("@/lib/googleAds")).getGoogleAdsClientForProject(projectId);

    // ✅ list accounts the current token can access
    const { listAccessibleCustomers } = await import("@/lib/googleAds");
    const accessible = await listAccessibleCustomers(client);

    // อ่าน secret เพื่อหา kp CID ที่จะใช้จริง (ถ้ามี)
    const integ = await prisma.projectIntegration.findFirst({
      where: { projectId, type: "RANK_API", status: "ACTIVE" },
      select: { config: true },
    });
    const cfg = (integ?.config ?? {}) as any;
    const secret =
      typeof cfg?.secret === "string" ? JSON.parse(cfg.secret) : cfg?.secret || {};
    const kpCid = String(secret?.keyword_planner_customer_id || secret?.customer_id || "")
      .replace(/-/g, "")
      .trim();

    console.log("[KWIDEA][ACCESS]", {
      login_mcc: loginCustomerId || "(none)",
      base_cid: customerId,
      kp_cid: kpCid || "(auto/unknown)",
      kp_in_accessible: kpCid ? accessible.includes(kpCid) : "(no-kpCid)",
      accessible_count: accessible.length,
    });

    console.log("[RANK_API][TEST] GAQL: SELECT customer.id… LIMIT 1");
    const rows = await customer.query(`
      SELECT
        customer.resource_name,
        customer.id,
        customer.descriptive_name
      FROM customer
      LIMIT 1
    `);

    const row0 = rows?.[0]?.customer;
    console.log("[RANK_API][TEST] customer peek", {
      resource_name: row0?.resource_name,
      id: row0?.id ? String(row0.id) : null,
      name: row0?.descriptive_name ?? null,
      rows_count: Array.isArray(rows) ? rows.length : 0,
    });

    console.log("[RANK_API][TEST] Keyword Ideas request preview", {
      keywords: kwSample,
      options: kwOptions,
    });

    try {
      const { fetchAvgMonthlySearches } = await import("@/lib/googleAds");
      await fetchAvgMonthlySearches(projectId, kwSample, kwOptions);
      console.log("[RANK_API][TEST] Keyword Ideas OK (developer token มีสิทธิ์ใช้)");
    } catch (inner) {
      const msgPretty = prettyGoogleAdsError(inner);

      await prisma.projectIntegration.update({
        where: { projectId_type: { projectId, type: "RANK_API" } },
        data: {
          status: "ACTIVE",
          errorMsg:
            "Connected, but Keyword Planner is restricted: " +
            msgPretty +
            " — Apply for Basic/Standard access for developer token if needed.",
          lastSyncAt: new Date(),
        },
      });

      console.groupEnd();
      revalidatePath(`/app/projects/${projectId}/integrations`);
      return { ok: true, note: "Connected but keyword planner restricted" };
    }

    await prisma.projectIntegration.update({
      where: { projectId_type: { projectId, type: "RANK_API" } },
      data: {
        status: "ACTIVE",
        errorMsg: null,
        lastSyncAt: new Date(),
      },
    });

    console.log("[RANK_API][TEST] DONE OK]");
    console.groupEnd();
    revalidatePath(`/app/projects/${projectId}/integrations`);
    return { ok: true };
  } catch (err) {
    const msgPretty = prettyGoogleAdsError(err);

    await prisma.projectIntegration.upsert({
      where: { projectId_type: { projectId, type: "RANK_API" } },
      create: {
        projectId,
        type: "RANK_API",
        status: "INACTIVE",
        connectedAt: null,
        connectedBy: await ensureOwner(projectId),
        propertyUri: null,
        config: {},
        errorMsg: msgPretty,
      },
      update: {
        status: "INACTIVE",
        errorMsg: msgPretty,
      },
    });

    console.groupEnd();
    revalidatePath(`/app/projects/${projectId}/integrations`);
    return { ok: false, error: msgPretty };
  }
}

export async function testRankApiGoogleFormAction(formData: FormData): Promise<void> {
  await testRankApiGoogle(formData);
}
