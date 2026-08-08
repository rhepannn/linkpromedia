import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activityLog";

interface Params {
  params: Promise<{ id: string }>;
}

// PATCH /api/admin/kategori/[id]
export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userRole = (session.user as { role?: string }).role;
  if (!["ADMIN", "EDITOR"].includes(userRole ?? ""))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  try {
    const body = await req.json();
    const { name, slug } = body;

    if (!name?.trim()) return NextResponse.json({ error: "Nama tidak boleh kosong" }, { status: 400 });

    const category = await prisma.category.update({
      where: { id },
      data: {
        ...(name && { name: name.trim() }),
        ...(slug && { slug: slug.trim() }),
      },
    });

    await logActivity({
      userId: (session.user as { id?: string }).id,
      action: "CATEGORY_UPDATE",
      description: `Mengedit kategori "${category.name}"`,
    });

    return NextResponse.json(category);
  } catch {
    return NextResponse.json({ error: "Gagal memperbarui kategori" }, { status: 500 });
  }
}

// DELETE /api/admin/kategori/[id]
export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userRole = (session.user as { role?: string }).role;
  if (userRole !== "ADMIN")
    return NextResponse.json({ error: "Hanya admin yang dapat menghapus kategori" }, { status: 403 });

  const { id } = await params;

  try {
    const count = await prisma.article.count({ where: { categoryId: id } });
    if (count > 0)
      return NextResponse.json(
        { error: `Kategori masih dipakai oleh ${count} artikel. Pindahkan artikel terlebih dahulu.` },
        { status: 409 }
      );
    const deleted = await prisma.category.delete({ where: { id } });

    await logActivity({
      userId: (session.user as { id?: string }).id,
      action: "CATEGORY_DELETE",
      description: `Menghapus kategori "${deleted.name}"`,
    });

    return NextResponse.json({ message: "Kategori berhasil dihapus" });
  } catch {
    return NextResponse.json({ error: "Gagal menghapus kategori" }, { status: 500 });
  }
}
