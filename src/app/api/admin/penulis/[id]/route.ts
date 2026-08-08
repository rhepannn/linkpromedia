import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activityLog";

interface Params {
  params: Promise<{ id: string }>;
}

// PATCH /api/admin/penulis/[id] — ubah role atau data penulis
export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userRole = (session.user as { role?: string }).role;
  if (userRole !== "ADMIN")
    return NextResponse.json({ error: "Hanya admin yang dapat mengubah data penulis" }, { status: 403 });

  const { id } = await params;

  try {
    const body = await req.json();
    const { name, role, slug, bio, isVerified } = body;

    const VALID_ROLES = ["ADMIN", "EDITOR", "AUTHOR"];
    if (role && !VALID_ROLES.includes(role))
      return NextResponse.json({ error: "Role tidak valid" }, { status: 400 });

    if (slug !== undefined && slug !== null && slug.trim()) {
      const slugBersih = slug
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-");
      if (!slugBersih) return NextResponse.json({ error: "Slug tidak valid" }, { status: 400 });
      const dipakai = await prisma.user.findFirst({ where: { slug: slugBersih, id: { not: id } } });
      if (dipakai) return NextResponse.json({ error: "Slug sudah dipakai penulis lain" }, { status: 409 });
    }

    const user = await prisma.user.update({
      where: { id },
      data: {
        ...(name && { name: name.trim() }),
        ...(role && { role }),
        ...(slug !== undefined && {
          slug: slug?.trim()
            ? slug.trim().toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-")
            : null,
        }),
        ...(bio !== undefined && { bio: bio?.trim() || null }),
        ...(isVerified !== undefined && { isVerified: !!isVerified }),
      },
      select: { id: true, name: true, email: true, role: true, slug: true, bio: true, isVerified: true },
    });

    await logActivity({
      userId: (session.user as { id?: string }).id,
      action: "USER_ROLE_CHANGE",
      description: role
        ? `Mengubah role "${user.name}" menjadi ${role}`
        : `Mengedit data penulis "${user.name}"`,
    });

    return NextResponse.json(user);
  } catch {
    return NextResponse.json({ error: "Gagal memperbarui data penulis" }, { status: 500 });
  }
}

// DELETE /api/admin/penulis/[id]
export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userRole = (session.user as { role?: string }).role;
  if (userRole !== "ADMIN")
    return NextResponse.json({ error: "Hanya admin yang dapat menghapus penulis" }, { status: 403 });

  const { id } = await params;

  // Jangan hapus diri sendiri
  if ((session.user as { id?: string }).id === id)
    return NextResponse.json({ error: "Tidak dapat menghapus akun sendiri" }, { status: 400 });

  // Relasi Article.author sengaja Restrict — artikel tidak boleh ikut terhapus
  // hanya karena penulisnya dihapus. Tanpa pemeriksaan ini, admin cuma melihat
  // "Gagal menghapus penulis" tanpa tahu sebabnya, seperti jalan buntu.
  const jumlahArtikel = await prisma.article.count({ where: { authorId: id } });
  if (jumlahArtikel > 0) {
    return NextResponse.json(
      {
        error: `Penulis ini masih punya ${jumlahArtikel} artikel. Pindahkan artikelnya ke penulis lain terlebih dahulu.`,
      },
      { status: 409 }
    );
  }

  try {
    const deleted = await prisma.user.delete({ where: { id } });

    await logActivity({
      userId: (session.user as { id?: string }).id,
      action: "USER_DELETE",
      description: `Menghapus penulis "${deleted.name}"`,
    });

    return NextResponse.json({ message: "Penulis berhasil dihapus" });
  } catch {
    return NextResponse.json({ error: "Gagal menghapus penulis" }, { status: 500 });
  }
}
