/* middleware.ts*/
export { auth as middleware } from "@/lib/auth";

export const config = {
  matcher: ["/app/:path*"],
};

/*
// middleware.ts (เวอร์ชัน debug)
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  if (!pathname.startsWith("/app")) return NextResponse.next();

  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  });

  if (!token) {
    const url = new URL("/signin", req.url);
    url.searchParams.set("callbackUrl", pathname + search);
    const res = NextResponse.redirect(url);
    res.headers.set("x-auth-debug", "no-token"); // <— ดูใน Network
    return res;
  }

  const res = NextResponse.next();
  res.headers.set("x-auth-debug", "ok"); // <— ดูใน Network
  return res;
}

export const config = { matcher: ["/app/:path*"] };
*/