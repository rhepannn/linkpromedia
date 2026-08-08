import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { deleteMedia } from "@/lib/media";
import { logActivity } from "@/lib/activityLog";
import { prisma } from "@/lib/prisma";

interface Params {
  params: Promise<{ id: string }>;
}

// DELETE /api/admin/media/[id]
export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const media = await prisma.media.findUnique({ where: { id }, select: { filename: true } });
    await deleteMedia(id);

    await logActivity({
      userId: (session.user as { id?: string }).id,
      action: "MEDIA_DELETE",
      description: `Menghapus gambar "${media?.filename ?? id}"`,
    });

    return NextResponse.json({ message: "Media berhasil dihapus" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal menghapus media";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
