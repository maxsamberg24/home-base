import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/identity";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Not signed in", { status: 401 });

  const { id } = await params;
  const photo = await prisma.photo.findUnique({ where: { id }, select: { data: true, contentType: true } });
  if (!photo) return new NextResponse("Not found", { status: 404 });

  return new NextResponse(photo.data as unknown as BodyInit, {
    headers: {
      "Content-Type": photo.contentType,
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
