// app/app/layout.tsx
import type { ReactNode } from "react";
import Link from "next/link";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  const year = new Date().getFullYear();

  const initials =
    (session?.user?.name || "")
      .split(" ")
      .map((s) => s[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U";

  return (
    <div className="min-h-screen flex flex-col bg-[#f6f8fc] text-gray-900">
      {/* Top App Bar (full-width) */}
      <header className="sticky top-0 z-30 w-full border-b border-gray-200/70 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="px-4 sm:px-6">
          <div className="h-14 flex items-center justify-between">
            {/* Brand */}
            <Link href="/app/projects" className="flex items-center gap-3">
              <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white font-semibold shadow-sm">
                SEO
              </div>
              <div className="text-[17px] font-semibold tracking-tight text-gray-900">
                CODEDIVA SEO Suite
              </div>
            </Link>

            {/* Right controls */}
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2">
                {session?.user?.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={session.user.image}
                    alt={session.user.name || "profile"}
                    className="h-8 w-8 rounded-full border border-gray-200 object-cover shadow-sm"
                  />
                ) : (
                  <div className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-[11px] font-medium shadow-sm">
                    {initials}
                  </div>
                )}
                <div className="text-sm text-gray-700">
                  {session?.user?.name || session?.user?.email}
                </div>
              </div>

              {/* Logout */}
              <form action="/api/auth/signout?callbackUrl=/signin" method="post">
                <button
                  type="submit"
                  className="inline-flex h-9 items-center justify-center rounded-full border border-gray-200 bg-white px-4 text-sm text-gray-700 hover:bg-gray-50 shadow-sm"
                >
                  Logout
                </button>
              </form>
            </div>
          </div>
        </div>
      </header>

      {/* Main (full-width content) */}
      <main className="flex-1 w-full">
        {/* full-bleed with responsive padding */}
        <div className="w-full px-4 sm:px-6 py-6">
          {children}
        </div>
      </main>

      {/* Footer (full-width + stick to bottom) */}
      <footer className="w-full border-t border-gray-200 bg-white">
        <div className="w-full px-4 sm:px-6 py-4 text-center text-sm text-gray-500">
          © {year} CODEDIVA SEO Suite · All rights reserved
        </div>
      </footer>
    </div>
  );
}
