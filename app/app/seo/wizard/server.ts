"use server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function saveWizardToDB(payload: any) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const { project, pages } = payload as { project: any; pages: any[] };
  if (!project) throw new Error("Project missing");
  const created = await prisma.project.create({
    data: {
      ownerId: session.user.id as string,
      siteName: project.siteName,
      siteUrl: project.siteUrl,
      targetLocale: project.targetLocale,
      includeBaidu: !!project.includeBaidu,
      pages: {
        create: (pages || []).map((p) => ({
          pageName: p.pageName,
          pageUrl: p.pageUrl,
          pageDescriptionSummary: p.pageDescriptionSummary ?? null,
          pageContentKeywords: p.pageContentKeywords ?? [],
          pageMetaDescription: p.pageMetaDescription ?? null,
          pageSeoKeywords: p.pageSeoKeywords ?? [],
          figmaNodeId: p.figmaNodeId ?? null,
        })),
      },
    },
    include: { pages: true },
  });
  return created.id;
}
