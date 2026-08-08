import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getLiveUpdates } from "@/lib/articles";
import { logActivity } from "@/lib/activityLog";
import { getValidUserId } from "@/lib/sessionUser";

interface Params {
  params: Promise<{ id: string }>;
}

// GET /api/admin/artikel/[id]/live-updates
export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const updates = await getLiveUpdates(id);
    return NextResponse.json(updates);
  } catch (err) {
    console.error("Gagal mengambil live update:", err);
    return NextResponse.json({ error: "Gagal mengambil live update" }, { status: 500 });
  }
}

// POST /api/admin/artikel/[id]/live-updates — tambah update kronologis baru
export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const body = await req.json();
    const { content } = body;

    if (!content?.trim()) return NextResponse.json({ error: "Isi update wajib diisi" }, { status: 400 });

    const article = await prisma.article.findUnique({ where: { id }, select: { title: true, isLive: true } });
    if (!article) return NextResponse.json({ error: "Artikel tidak ditemukan" }, { status: 404 });
    if (!article.isLive)
      return NextResponse.json({ error: "Artikel ini bukan artikel live" }, { status: 400 });

    // Pakai id yang sudah dipastikan ada di DB — sesi bisa "basi"
    const authorId = await getValidUserId();

    const update = await prisma.articleLiveUpdate.create({
      data: {
        articleId: id,
        content: content.trim(),
        authorId,
      },
      include: { author: { select: { name: true } } },
    });

    await logActivity({
      userId: authorId,
      action: "ARTICLE_LIVE_UPDATE",
      description: `Menambah update langsung pada artikel "${article.title}"`,
    });

    return NextResponse.json(update, { status: 201 });
  } catch (err) {
    console.error("Gagal menambah live update:", err);
    return NextResponse.json({ error: "Gagal menambah live update" }, { status: 500 });
  }
}
