// app/api/projects/[id]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

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
