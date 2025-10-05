// app/app/projects/page.tsx
import Link from "next/link";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import CreateProjectModal from "./_components/CreateProjectModal";
import ProjectCard from "./_components/ProjectCard";

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
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      ownerId: true,
      siteName: true,
      siteUrl: true,
      targetLocale: true,     // <= เดี่ยว
      includeBaidu: true,
      figmaFileKey: true,
      figmaAccessToken: true,
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
        },
        orderBy: { sortNumber: "asc" },
      },
    },
  });

  return (
    <div className="w-full space-y-6 px-4 py-6 sm:px-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Projects</h1>
        <CreateProjectModal />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2 2xl:grid-cols-3">
        {projects.map((p) => (
          <ProjectCard key={p.id} project={p} />
        ))}
        {projects.length === 0 && (
          <div className="text-sm text-gray-500">No projects yet.</div>
        )}
      </div>
    </div>
  );
}
