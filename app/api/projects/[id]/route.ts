// app/api/projects/[id]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { Prisma } from "@prisma/client";

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const proj = await prisma.project.findFirst({
    where: { id: params.id, ownerId: session.user.id },
    include: { _count: { select: { pages: true } } },
  });
  if (!proj) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (proj._count.pages > 0) {
    return NextResponse.json(
      { error: "Please delete all pages before deleting the project." },
      { status: 400 }
    );
  }

  await prisma.project.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const {
    siteName,
    siteUrl,
    targetLocale,
    includeBaidu,
  } = body as {
    siteName?: string;
    siteUrl?: string;
    targetLocale?: string;
    includeBaidu?: boolean;
  };

  // ตรวจว่าเป็นของเจ้าของจริง
  const proj = await prisma.project.findFirst({
    where: { id: params.id, ownerId: session.user.id },
    select: { id: true },
  });
  if (!proj) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const updated = await prisma.project.update({
      where: { id: params.id },
      data: {
        siteName: siteName ?? undefined,
        siteUrl: siteUrl ?? undefined,
        targetLocale: targetLocale ?? undefined,
        includeBaidu: includeBaidu ?? undefined
      },
      select: { id: true },
    });

    return NextResponse.json({ ok: true, id: updated.id });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      // unique (ownerId, siteName, targetLocale)
      return NextResponse.json(
        {
          error:
            "A project with the same site name and locale already exists for this owner.",
        },
        { status: 409 }
      );
    }
    throw err;
  }
}