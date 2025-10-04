
import { signIn } from "@/lib/auth";

export default function SignInPage() {
  return (
    <div className="mx-auto max-w-md space-y-6 rounded-2xl border bg-white p-8 shadow-sm">
      <h1 className="text-2xl font-semibold">Sign in</h1>
      <p className="text-sm text-gray-600">Use your Google account to continue.</p>
      <form action={async () => { "use server"; await signIn("google", { redirectTo: "/app" }); }}>
        <button type="submit" className="w-full rounded-xl border px-4 py-3 text-center font-medium hover:bg-gray-50">
          Continue with Google
        </button>
      </form>
    </div>
  );
}
