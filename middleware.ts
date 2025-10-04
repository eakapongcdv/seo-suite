// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // ปล่อย public routes
  if (!pathname.startsWith("/app")) return NextResponse.next();

  // ✅ รองรับทั้ง v4/v5: ใช้ AUTH_SECRET ถ้ามี ไม่งั้น fallback ไป NEXTAUTH_SECRET
  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? "";
  // ✅ v5 ต้องการ salt (ตั้งผ่าน env ได้), dev fallback เป็นค่า default
  const salt = process.env.AUTH_COOKIE_SALT ?? "authjs.session-token";

  // แนะนำ: ถ้าขาด secret ให้ throw เร็ว ๆ (ป้องกันงงใน prod)
  if (!secret) {
    console.error("[middleware] Missing AUTH_SECRET/NEXTAUTH_SECRET");
    // จะ redirect ก็ได้ แต่ควรใส่ secret ให้เรียบร้อยจะถูกต้องกว่า
  }

  const token = await getToken({
    req,
    secret,
    salt,
    secureCookie: process.env.NODE_ENV === "production",
  });

  if (!token) {
    const url = new URL("/signin", req.url);
    url.searchParams.set("callbackUrl", pathname + search);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

// ตรวจเฉพาะเส้นทาง /app/*
export const config = { matcher: ["/app/:path*"] };
