import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { logActivity } from "@/lib/activityLog";

// GET /api/admin/penulis
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Daftar ini memuat EMAIL semua akun — hanya untuk halaman Penulis yang
  // memang khusus ADMIN. Tanpa pemeriksaan ini, akun AUTHOR bisa memanen
  // email seluruh redaksi lewat URL API langsung meski menunya disembunyikan.
  const userRole = (session.user as { role?: string }).role;
  if (userRole !== "ADMIN")
    return NextResponse.json({ error: "Hanya admin yang dapat melihat daftar penulis" }, { status: 403 });

  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, email: true, role: true, createdAt: true, slug: true, bio: true, isVerified: true },
    });
    return NextResponse.json(users);
  } catch {
    return NextResponse.json({ error: "Gagal mengambil data penulis" }, { status: 500 });
  }
}

// POST /api/admin/penulis — daftarkan penulis baru
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userRole = (session.user as { role?: string }).role;
  if (userRole !== "ADMIN")
    return NextResponse.json({ error: "Hanya admin yang dapat menambah penulis" }, { status: 403 });

  try {
    const body = await req.json();
    const { name, email, password, role } = body;

    if (!name?.trim()) return NextResponse.json({ error: "Nama wajib diisi" }, { status: 400 });
    if (!email?.trim()) return NextResponse.json({ error: "Email wajib diisi" }, { status: 400 });
    if (!password || password.length < 8)
      return NextResponse.json({ error: "Password minimal 8 karakter" }, { status: 400 });

    const VALID_ROLES = ["ADMIN", "EDITOR", "AUTHOR"];
    const finalRole = VALID_ROLES.includes(role) ? role : "AUTHOR";

    const existing = await prisma.user.findUnique({ where: { email: email.trim() } });
    if (existing) return NextResponse.json({ error: "Email sudah terdaftar" }, { status: 409 });

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { name: name.trim(), email: email.trim(), passwordHash, role: finalRole },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });

    await logActivity({
      userId: (session.user as { id?: string }).id,
      action: "USER_CREATE",
      description: `Menambah penulis "${user.name}" (${finalRole})`,
    });

    return NextResponse.json(user, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Gagal membuat akun penulis" }, { status: 500 });
  }
}
