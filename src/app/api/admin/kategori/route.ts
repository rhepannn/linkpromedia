import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activityLog";

// GET /api/admin/kategori
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const categories = await prisma.category.findMany({ orderBy: { name: "asc" } });
    return NextResponse.json(categories);
  } catch {
    return NextResponse.json({ error: "Gagal mengambil kategori" }, { status: 500 });
  }
}

// POST /api/admin/kategori — tambah kategori baru
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userRole = (session.user as { role?: string }).role;
  if (!["ADMIN", "EDITOR"].includes(userRole ?? ""))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await req.json();
    const { name, slug } = body;

    if (!name?.trim()) return NextResponse.json({ error: "Nama kategori wajib diisi" }, { status: 400 });
    if (!slug?.trim()) return NextResponse.json({ error: "Slug wajib diisi" }, { status: 400 });

    const existing = await prisma.category.findFirst({
      where: { OR: [{ name: name.trim() }, { slug: slug.trim() }] },
    });
    if (existing) return NextResponse.json({ error: "Nama atau slug sudah digunakan" }, { status: 409 });

    const category = await prisma.category.create({
      data: { name: name.trim(), slug: slug.trim() },
    });

    await logActivity({
      userId: (session.user as { id?: string }).id,
      action: "CATEGORY_CREATE",
      description: `Menambah kategori "${category.name}"`,
    });

    return NextResponse.json(category, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Gagal membuat kategori" }, { status: 500 });
  }
}
