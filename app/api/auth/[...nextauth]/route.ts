// app/api/auth/[...nextauth]/route.ts
import { handlers } from "@/lib/auth";

// ดึง GET/POST ออกจาก handlers แล้ว export ออกไปให้ Next.js ใช้เป็น Route Handler
export const { GET, POST } = handlers;
