// app/api/google-ads/oauth/start/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams, origin } = new URL(req.url);
  const projectId = searchParams.get("projectId") || "";

  if (!projectId) {
    return NextResponse.json({ error: "Missing projectId" }, { status: 400 });
  }

  // อ่าน integration (type=RANK_API, vendor=google)
  const integ = await prisma.projectIntegration.findFirst({
    where: { projectId, type: "RANK_API", status: { in: ["ACTIVE", "INACTIVE"] } },
    select: { config: true },
  });

  const cfg = (integ?.config ?? {}) as any;
  if ((cfg.vendor || "").toLowerCase() !== "google") {
    return NextResponse.json({ error: "Vendor must be google" }, { status: 400 });
  }

  const secret = typeof cfg.secret === "string" ? safeParse(cfg.secret) : cfg.secret || {};
  const client_id = secret?.client_id || "";
  const client_secret = secret?.client_secret || "";

  if (!client_id || !client_secret) {
    return NextResponse.json(
      { error: "Missing client_id/client_secret in RANK_API config.secret" },
      { status: 400 }
    );
  }

  // ต้องลงทะเบียน redirect URI นี้ใน Google Cloud Console ให้ตรงกันเป๊ะ
  const redirect_uri = `${origin}/api/google-ads/oauth/callback`;

  const scope = "https://www.googleapis.com/auth/adwords";
  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", client_id);
  authUrl.searchParams.set("redirect_uri", redirect_uri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", scope);
  authUrl.searchParams.set("access_type", "offline"); // ต้องการ refresh_token
  authUrl.searchParams.set("prompt", "consent"); // บังคับโชว์ consent เพื่อได้ refresh_token
  authUrl.searchParams.set("state", JSON.stringify({ projectId }));

  return NextResponse.redirect(authUrl.toString());
}

function safeParse(s: string) {
  try { return JSON.parse(s); } catch { return null; }
}
