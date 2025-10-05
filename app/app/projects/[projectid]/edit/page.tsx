// app/app/projects/[projectid]/edit/page.tsx
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import EditProjectForm from "./_components/EditProjectForm";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function EditProjectPage({
  params,
}: {
  params: { projectid: string };
}) {
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

  const project = await prisma.project.findFirst({
    where: { id: params.projectid, ownerId: session.user.id },
    select: {
      id: true,
      ownerId: true,
      siteName: true,
      siteUrl: true,
      targetLocale: true,
      includeBaidu: true,
      figmaFileKey: true,
      figmaAccessToken: true,
      _count: { select: { pages: true } },
      updatedAt: true,
      createdAt: true,
    },
  });

  if (!project) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Project not found</h1>
        <Link className="underline text-blue-600" href="/app/projects">
          Back to projects
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6 sm:px-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Edit: {project.siteName}</h1>
          <p className="mt-1 text-sm text-gray-500">ID: {project.id}</p>
        </div>
        <Link
          href={`/app/projects/${project.id}`}
          className="rounded-lg border px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
        >
          View project
        </Link>
      </div>

      <EditProjectForm project={project} />
    </div>
  );
}
