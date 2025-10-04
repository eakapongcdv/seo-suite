// app/app/pages/page.tsx
import Link from "next/link";
import { prisma, } from "@/lib/db";
import { auth } from "@/lib/auth";
import type { Prisma } from "@prisma/client";

// ชนิด Project ที่มี pages ติดมาด้วย
type ProjectWithPages = Prisma.ProjectGetPayload<{ include: { pages: true } }>;

export default async function PagesList() {
  const session = await auth();
  if (!session?.user?.id) return <div>Please sign in.</div>;

  // ใส่ชนิดชัดเจนให้ผลลัพธ์
  const projects: ProjectWithPages[] = await prisma.project.findMany({
    where: { ownerId: session.user.id as string },
    include: { pages: true },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Projects</h1>

      {projects.length === 0 ? (
        <p className="text-sm text-gray-600">
          No projects yet. Create one via the SEO Wizard.
        </p>
      ) : (
        <div className="grid gap-3">
          {projects.map((p) => (
            <div key={p.id} className="rounded-xl border bg-white p-4">
              <div className="text-sm text-gray-500">{p.siteUrl}</div>
              <div className="font-medium">{p.siteName}</div>
              <div className="text-xs text-gray-500">
                Pages: {p.pages.length} · Updated: {p.updatedAt.toISOString()}
              </div>
            </div>
          ))}
        </div>
      )}

      <Link href="/app/seo/wizard" className="inline-block rounded-xl border px-4 py-2">
        Open Wizard
      </Link>
    </div>
  );
}
