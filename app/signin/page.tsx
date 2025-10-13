// app/signin/page.tsx
import { signIn } from "@/lib/auth";

export const runtime = "nodejs"; // ชัดเจนว่า route นี้วิ่งบน Node

// Server Action แยกฟังก์ชัน (อ่าน callbackUrl แบบปลอดภัย)
async function signInWithGoogle(formData: FormData) {
  "use server";
  const cb = String(formData.get("callbackUrl") || "/app");
  // ใช้ redirectTo กับ Auth.js v5
  await signIn("google", { redirectTo: cb });
  // NOTE: ถ้า provider หรือ config มีปัญหา signIn จะ throw -> ปล่อยให้ Next แสดง error
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams?: { callbackUrl?: string };
}) {
  const callbackUrl = searchParams?.callbackUrl ?? "/app";

  return (
    <div className="mx-auto max-w-md space-y-6 rounded-2xl border bg-white p-8 shadow-sm">
      <h1 className="text-2xl font-semibold">Sign in</h1>
      <p className="text-sm text-gray-600">Use your Google account to continue.</p>

      <form action={signInWithGoogle}>
        {/* ส่ง callbackUrl กลับไปใน Server Action */}
        <input type="hidden" name="callbackUrl" value={callbackUrl} />
        <button
          type="submit"
          className="w-full rounded-xl border px-4 py-3 text-center font-medium hover:bg-gray-50"
        >
          Continue with Google
        </button>
      </form>

      {/* Fallback: เผื่อกรณี Server Actions ใช้ไม่ได้/JS ถูกปิด */}
      <a
        className="block text-center text-sm text-blue-600 underline"
        href={`/api/auth/signin/google?callbackUrl=${encodeURIComponent(callbackUrl)}`}
      >
        Having trouble? Continue with Google (fallback)
      </a>
    </div>
  );
}
