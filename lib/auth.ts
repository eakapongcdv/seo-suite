// lib/auth.ts
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db";

export const { handlers, signIn, signOut, auth } = NextAuth({
  // ยังใช้ PrismaAdapter ได้ตามเดิมสำหรับ Users/Accounts
  adapter: PrismaAdapter(prisma) as any,

  // ✅ ใช้ JWT เพื่อลดปัญหา Prisma บน Edge (middleware)
  session: { strategy: "jwt" },

  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,         // ต้องตั้งใน .env.local
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!, // ต้องตั้งใน .env.local
    }),
  ],

  // (ออปชัน) แนบ user.id ลง session เพื่อใช้งานง่ายฝั่ง Client/Server
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.id = (user as any).id;
      return token;
    },
    async session({ session, token }) {
      if (token?.id) (session.user as any).id = token.id as string;
      return session;
    },
  },
});
