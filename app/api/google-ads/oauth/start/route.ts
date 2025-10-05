// /app/api/google-ads/oauth/start/route.ts
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const projectId = url.searchParams.get("projectId") || "";

  // อ่านค่าจาก env (client ของคุณ)
  const client_id = process.env.GADS_CLIENT_ID!;
  const redirect_uri = `${url.origin}/api/google-ads/oauth/callback`;

  const params = new URLSearchParams({
    client_id,
    redirect_uri,
    response_type: "code",
    access_type: "offline",     // สำคัญ: ต้องเป็น offline เพื่อขอ refresh_token
    prompt: "consent",          // บังคับให้ถาม consent เพื่อให้ได้ refresh_token ใหม่
    scope: "https://www.googleapis.com/auth/adwords",
    state: JSON.stringify({ projectId }),
  });

  return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
}
