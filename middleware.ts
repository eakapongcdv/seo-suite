// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // ปล่อยทุกอย่างที่ไม่ใช่ /app/**
  if (!pathname.startsWith("/app")) return NextResponse.next();

  // ปล่อยให้ next-auth ตีความคุกกี้/โปรโตคอลเอง (จาก X-Forwarded-* ที่ nginx ใส่ให้แล้ว)
  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
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
