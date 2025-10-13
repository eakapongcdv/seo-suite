// app/api/authdebug/route.ts
export const runtime = "nodejs";

export async function GET() {
  // อนุญาตเสมอใน dev; ถ้าเป็น prod ต้องมีโทเค็นใน ENV หรือเฮดเดอร์
  const isDev = process.env.NODE_ENV !== "production";
  const tokenEnv = process.env.AUTH_DEBUG_TOKEN; // ตั้งค่าไว้เฉพาะตอนต้องดีบัก prod
  const tokenHdr =
    typeof Headers !== "undefined"
      ? (globalThis as any)?.request?.headers?.get?.("x-authdebug-token")
      : undefined;

  if (!isDev && tokenEnv && tokenHdr !== tokenEnv) {
    return new Response("Forbidden", { status: 403 });
  }

  const body = {
    AUTH_URL: process.env.AUTH_URL,
    AUTH_SECRET: !!process.env.AUTH_SECRET,
    GOOGLE_ID: !!(process.env.GOOGLE_ID ?? process.env.GOOGLE_CLIENT_ID),
    AUTH_TRUST_HOST: process.env.AUTH_TRUST_HOST,
    NODE_ENV: process.env.NODE_ENV,
  };

  return new Response(JSON.stringify(body, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store, must-revalidate",
      "Pragma": "no-cache",
    },
  });
}
