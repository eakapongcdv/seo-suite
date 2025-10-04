// app/app/projects/[projectid]/page.tsx
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import ProjectHeader from "./_components/ProjectHeader";
import ProjectMetrics from "./_components/ProjectMetrics";
import AddPageModal from "./_components/AddPageModal";
import PageRow from "./_components/PageRow";

export const dynamic = "force-dynamic";

type Params = { projectid: string };

async function ensureOwner(projectId: string) {
  const session = await auth();
  if (!session?.user?.id) return null;
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, ownerId: true, siteName: true, siteUrl: true },
  });
  if (!project || project.ownerId !== session.user.id) return null;
  return project;
}

function avg(nums: number[]) {
  const valid = nums.filter((n) => typeof n === "number" && !Number.isNaN(n));
  if (valid.length === 0) return 0;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}

async function getData(projectId: string) {
  return prisma.project.findUnique({
    where: { id: projectId },
    include: {
      pages: {
        orderBy: [{ sortNumber: "asc" }, { updatedAt: "desc" }],
        // อย่าใส่ select เพื่อให้ได้ครบทุกฟิลด์ที่ PageRow ใช้
      },
    },
  });
}

export default async function ProjectEditor({ params }: { params: Params }) {
  const { projectid: projectId } = params;

  const project = await ensureOwner(projectId);
  if (!project) {
    return (
      <div className="p-6 space-y-2">
        <h1 className="text-xl font-semibold">Project not found</h1>
        <p className="text-sm text-gray-600">You may not have access to this project.</p>
      </div>
    );
  }

  const data = await getData(projectId);
  if (!data) return <div className="p-6">Project not found.</div>;

  // project-level metrics
  const totalPages = data.pages.length;
  const checklistDone = data.pages.filter((pg) => (pg.pageSeoKeywords?.length ?? 0) > 0).length;
  const checklistPct = totalPages > 0 ? (checklistDone / totalPages) * 100 : 0;
  const seoScores = data.pages
    .map((pg) => (typeof pg.lighthouseSeo === "number" ? pg.lighthouseSeo : NaN))
    .filter((n) => !Number.isNaN(n));
  const seoAvg = Math.round(avg(seoScores));

  return (
    <div className="w-full space-y-6 px-4 py-6 sm:px-6">
      <ProjectHeader siteName={project.siteName} siteUrl={project.siteUrl} />
      <ProjectMetrics
        totalPages={totalPages}
        checklistPct={checklistPct}
        checklistDone={checklistDone}
        seoAvg={seoAvg}
      />

      {/* Title + Add Page Button (modal) */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Pages</h2>
        <AddPageModal projectId={data.id} />
      </div>

      {/* List */}
      <div className="grid gap-3">
        {data.pages.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
            <p className="text-gray-500">No pages yet. Add your first page to get started.</p>
          </div>
        ) : (
          data.pages.map((pg) => (
            <PageRow key={pg.id} projectId={data.id} page={pg} />
          ))
        )}
      </div>
    </div>
  );
}
