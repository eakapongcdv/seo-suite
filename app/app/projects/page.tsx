// app/app/projects/page.tsx
import Link from "next/link";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { createProjectAction, deleteProjectAction } from "./actions"; // ⬅️ ดึงจากไฟล์ใหม่

export const dynamic = "force-dynamic";

async function getData(userId: string) {
  return prisma.project.findMany({
    where: { ownerId: userId },
    orderBy: { updatedAt: "desc" },
  });
}

export default async function ProjectsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Sign in required</h1>
        <Link className="underline text-blue-600" href="/signin">Go to sign in</Link>
      </div>
    );
  }

  const projects = await getData(session.user.id);

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Projects</h1>

      {/* Create project */}
      <form action={createProjectAction} className="rounded-xl border bg-white p-4 space-y-3">
        <div className="grid gap-3 md:grid-cols-3">
          <input name="siteName" placeholder="Site name" className="border rounded px-3 py-2" />
          <input name="siteUrl" placeholder="https://example.com" className="border rounded px-3 py-2" />
          <input name="targetLocale" defaultValue="en" className="border rounded px-3 py-2" />
        </div>
        <label className="inline-flex items-center gap-2 text-sm">
          <input type="checkbox" name="includeBaidu" value="true" />
          Include Baidu
        </label>
        <div>
          <button type="submit" className="bg-indigo-600 text-white rounded px-4 py-2">Create</button>
        </div>
      </form>

      {/* List */}
      <div className="grid gap-3">
        {projects.map(p => (
          <div key={p.id} className="border rounded p-4 flex items-center justify-between">
            <div>
              <div className="font-semibold">{p.siteName}</div>
              <div className="text-sm text-gray-500">{p.siteUrl}</div>
            </div>
            <div className="flex items-center gap-3">
              <Link className="underline" href={`/app/projects/${p.id}`}>Open</Link>
              <form action={deleteProjectAction}>
                <input type="hidden" name="id" value={p.id} />
                <button type="submit" className="text-red-600">Delete</button>
              </form>
            </div>
          </div>
        ))}
        {projects.length === 0 && (
          <div className="text-gray-500 text-sm">No projects yet.</div>
        )}
      </div>
    </div>
  );
}
