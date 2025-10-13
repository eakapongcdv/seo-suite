// lib/auth.ts
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db";

// รองรับทั้งคู่: (v5) GOOGLE_ID/GOOGLE_SECRET และ (เดิม) GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET
const GOOGLE_ID = process.env.GOOGLE_ID ?? process.env.GOOGLE_CLIENT_ID ?? "";
const GOOGLE_SECRET = process.env.GOOGLE_SECRET ?? process.env.GOOGLE_CLIENT_SECRET ?? "";

// เด็ดขาด: ใช้ค่า AUTH_URL เพื่อตัดสินใจ secure cookie (localhost = http → ไม่ secure)
const AUTH_URL = process.env.AUTH_URL ?? "";
const COOKIE_SECURE = AUTH_URL.startsWith("https");

if (!GOOGLE_ID || !GOOGLE_SECRET) {
  // eslint-disable-next-line no-console
  console.warn("[auth] Missing GOOGLE_ID/GOOGLE_SECRET (or *_CLIENT_*) env vars");
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma) as any,

  // ใช้ JWT เพื่อลด coupling กับ DB ระหว่าง request (เหมาะกับ middleware/edge)
  session: { strategy: "jwt" },

  providers: [
    Google({
      clientId: GOOGLE_ID,
      clientSecret: GOOGLE_SECRET,
    }),
  ],

  // สำคัญเมื่ออยู่หลัง proxy (nginx/plesk) หรือใช้ host แบบ localhost
  // โปรดตั้งค่า .env:
  // - DEV:  AUTH_TRUST_HOST=true, AUTH_URL=http://localhost:3000
  // - PROD: AUTH_URL=https://seo.codediva.co.th
  trustHost: true,
  secret: process.env.AUTH_SECRET,

  // บังคับคุกกี้ session ให้สอดคล้องกับโปรโตคอล:
  // - local prod (http://localhost) → secure: false
  // - production https → secure: true
  cookies: {
    sessionToken: {
      name: COOKIE_SECURE ? "__Secure-authjs.session-token" : "authjs.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: COOKIE_SECURE,
      },
    },
  },

  pages: {
    // ถ้ามีหน้า signin เอง
    signIn: "/signin",
  },

  callbacks: {
    async jwt({ token, user }) {
      if (user) token.id = (user as any).id;
      return token;
    },
    async session({ session, token }) {
      if (token?.id) (session.user as any).id = token.id as string;
      return session;
    },
    async redirect({ url, baseUrl }) {
      // อนุญาตเส้นทางภายในโดเมนเดียวกัน
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      try {
        const u = new URL(url);
        if (u.origin === baseUrl) return url;
      } catch {}
      // ค่าเริ่มต้นหลังล็อกอิน
      return `${baseUrl}/app`;
    },
  },
});
