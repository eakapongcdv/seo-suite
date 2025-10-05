// app/app/projects/page.tsx
import Link from "next/link";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import CreateProjectModal from "./_components/CreateProjectModal";
import ProjectGroup from "./_components/ProjectGroup";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Sign in required</h1>
        <Link className="underline text-blue-600" href="/signin">
          Go to sign in
        </Link>
      </div>
    );
  }

  const projects = await prisma.project.findMany({
    where: { ownerId: session.user.id },
    orderBy: [{ siteName: "asc" }, { updatedAt: "desc" }],
    select: {
      id: true,
      ownerId: true,
      siteName: true,
      siteUrl: true,
      targetLocale: true,     // "en" | "th" | "zh-CN"
      includeBaidu: true,
      updatedAt: true,
      _count: { select: { pages: true } },
      pages: {
        select: {
          id: true,
          pageName: true,
          pageUrl: true,
          figmaCaptureUrl: true,
          pageSeoKeywords: true,
          lighthouseSeo: true,
          sortNumber: true,
        },
        orderBy: { sortNumber: "asc" },
      },
    },
  });

  // Group by siteName
  const groups = Object.values(
    projects.reduce<Record<string, typeof projects>>((acc, p) => {
      acc[p.siteName] ||= [];
      acc[p.siteName].push(p);
      return acc;
    }, {})
  );

  return (
    <div className="w-full space-y-6 px-4 py-6 sm:px-6">
      <div className="mb-2 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Projects</h1>
        <CreateProjectModal />
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {groups.length === 0 && (
          <div className="text-sm text-gray-500">No projects yet.</div>
        )}

        {groups.map((group) => (
          <ProjectGroup
            key={group[0].siteName}
            siteName={group[0].siteName}
            projects={group}
          />
        ))}
      </div>
    </div>
  );
}
