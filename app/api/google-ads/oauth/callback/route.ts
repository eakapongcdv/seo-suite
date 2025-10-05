// /app/api/google-ads/oauth/callback/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code") || "";
  const state = url.searchParams.get("state") || "{}";
  const { projectId } = JSON.parse(state || "{}");

  const client_id = process.env.GADS_CLIENT_ID!;
  const client_secret = process.env.GADS_CLIENT_SECRET!;
  const redirect_uri = `${url.origin}/api/google-ads/oauth/callback`;

  if (!code || !projectId) {
    return NextResponse.redirect(`${url.origin}/app/projects/${projectId || ""}/integrations?msg=oauth_error`);
  }

  // แลก code เป็น token
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id,
      client_secret,
      redirect_uri,
      grant_type: "authorization_code",
    }),
    cache: "no-store",
  });

  const json = await tokenRes.json();
  if (!tokenRes.ok) {
    console.error("[GADS][OAUTH] token exchange failed:", json);
    return NextResponse.redirect(
      `${url.origin}/app/projects/${projectId}/integrations?msg=token_exchange_failed`
    );
  }

  // ได้ refresh_token แล้วเก็บเข้าฐาน
  const refresh_token = json.refresh_token as string | undefined;
  const access_token = json.access_token as string | undefined;
  if (!refresh_token) {
    // บางครั้ง Google จะไม่คืน refresh_token ถ้า user เคยอนุญาตแล้ว (จึงใช้ prompt=consent ไปแล้วด้านบน)
    console.warn("[GADS][OAUTH] No refresh_token returned");
  }

  // ดึงของเดิมจาก ProjectIntegration (RANK_API vendor=google)
  const integ = await prisma.projectIntegration.findFirst({
    where: { projectId, type: "RANK_API" },
    select: { config: true, status: true },
  });

  const cfg = (integ?.config ?? {}) as any;
  const secret = typeof cfg.secret === "string" ? JSON.parse(cfg.secret) : (cfg.secret ?? {});

  // อัปเดต field ใน secret (อย่าลืมต้องมี developer_token, customer_id, (option) login_customer_id มาก่อน)
  const newSecret = {
    ...secret,
    refresh_token: refresh_token || secret.refresh_token, // ใช้ตัวใหม่ถ้ามี
    // เก็บ access_token ได้ แต่ไม่จำเป็น (หมดอายุเร็ว)
    access_token,
  };

  await prisma.projectIntegration.upsert({
    where: { projectId_type: { projectId, type: "RANK_API" } },
    create: {
      projectId,
      type: "RANK_API",
      status: refresh_token ? "ACTIVE" : "INACTIVE", // ถ้าได้ RT แล้ว ค่อย active
      connectedAt: refresh_token ? new Date() : null,
      connectedBy: null,
      propertyUri: cfg.propertyUri ?? null,
      config: { ...cfg, vendor: "google", secret: newSecret },
      errorMsg: refresh_token ? null : "No refresh_token returned from Google OAuth",
    },
    update: {
      status: refresh_token ? "ACTIVE" : "INACTIVE",
      connectedAt: refresh_token ? new Date() : null,
      config: { ...cfg, vendor: "google", secret: newSecret },
      errorMsg: refresh_token ? null : "No refresh_token returned from Google OAuth",
    },
  });

  return NextResponse.redirect(`${url.origin}/app/projects/${projectId}/integrations?msg=google_ads_connected`);
}
