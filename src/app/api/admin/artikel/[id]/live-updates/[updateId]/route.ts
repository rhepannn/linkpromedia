import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface Params {
  params: Promise<{ id: string; updateId: string }>;
}

// DELETE /api/admin/artikel/[id]/live-updates/[updateId]
export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { updateId } = await params;

  try {
    await prisma.articleLiveUpdate.delete({ where: { id: updateId } });
    return NextResponse.json({ message: "Update berhasil dihapus" });
  } catch {
    return NextResponse.json({ error: "Gagal menghapus update" }, { status: 500 });
  }
}
