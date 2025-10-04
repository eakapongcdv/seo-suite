import Link from "next/link";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import CreateProjectModal from "./_components/CreateProjectModal";
import ProjectCard from "./_components/ProjectCard";

export const dynamic = "force-dynamic";

async function getData(userId: string) {
  return prisma.project.findMany({
    where: { ownerId: userId },
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { pages: true } },
      // ดึง fields ที่ต้องใช้ใน Edit modal (รวม figma config)
      pages: {
        select: {
          id: true,
          pageName: true,
          figmaCaptureUrl: true,
          pageSeoKeywords: true,
          lighthouseSeo: true,
        },
      },
    },
  });
}

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

  // NOTE: ถ้าคุณเพิ่มฟิลด์ figmaFileKey/figmaAccessToken ใน Prisma (ที่ model Project)
  // ให้ add select ฟิลด์ทั้งสองในส่วน query นี้ด้วย (หรือใช้ include: true)
  const projects = await prisma.project.findMany({
    where: { ownerId: session.user.id },
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { pages: true } },
      pages: {
        select: {
          id: true,
          pageName: true,
          figmaCaptureUrl: true,
          pageSeoKeywords: true,
          lighthouseSeo: true,
        },
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
          <ProjectCard
            key={p.id}
            project={{
              ...p,
              figmaFileKey: (p as any).figmaFileKey ?? null,
              figmaAccessToken: (p as any).figmaAccessToken ?? null,
              includeBaidu: (p as any).includeBaidu ?? false,
            }}
          />
        ))}

        {projects.length === 0 && <div className="text-sm text-gray-500">No projects yet.</div>}
      </div>
    </div>
  );
}
