// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // ปล่อยทุกอย่างที่ไม่ใช่ /app/**
  if (!pathname.startsWith("/app")) return NextResponse.next();

  // ===== ค่าเดียวกับที่ใช้ใน lib/auth.ts =====
  const AUTH_URL = process.env.AUTH_URL ?? "";
  const COOKIE_SECURE = AUTH_URL.startsWith("https");
  // ชื่อคุกกี้ต้องตรงกับ lib/auth.ts (ดู cookies.sessionToken.name)
  const COOKIE_NAME = COOKIE_SECURE
    ? "__Secure-authjs.session-token"
    : "authjs.session-token";
  // ==============================================

  // รองรับทั้ง v5 และ v4 (fallback NEXTAUTH_SECRET)
  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? "";
  const salt = process.env.AUTH_COOKIE_SALT ?? "authjs.session-token"; // v5 ต้องมี salt (มี default แล้ว)

  if (!secret) {
    console.error("[middleware] Missing AUTH_SECRET (or NEXTAUTH_SECRET)");
    // ไม่ return ทันที เพื่อไม่ขวางระบบ; แต่ควรเซ็ตให้ถูกใน env นะครับ
  }

  // อ่านโทเค็นจากคุกกี้ให้ตรงเงื่อนไขโปรโตคอล/ชื่อคุกกี้
  const token = await getToken({
    req,
    secret,
    salt,
    cookieName: COOKIE_NAME,
    secureCookie: COOKIE_SECURE,
  });

  // ยังไม่ล็อกอิน → ส่งไปหน้า /signin พร้อม callbackUrl
  if (!token) {
    const url = new URL("/signin", req.url);
    url.searchParams.set("callbackUrl", pathname + search);
    return NextResponse.redirect(url);
  }

  // ผ่าน
  return NextResponse.next();
}

// ตรวจเฉพาะเส้นทาง /app/*
export const config = {
  matcher: ["/app/:path*"],
};
