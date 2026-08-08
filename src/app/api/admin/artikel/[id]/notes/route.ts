import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionActor } from "@/lib/sessionRole";
import { canEditArticle, FORBIDDEN_MESSAGE } from "@/lib/permissions";

interface Params {
  params: Promise<{ id: string }>;
}

/** Pastikan pengguna berhak melihat/menulis catatan artikel ini */
async function assertAccess(id: string) {
  const actor = await getSessionActor();
  if (!actor) return { error: "Unauthorized", status: 401 as const };

  const article = await prisma.article.findUnique({
    where: { id },
    select: { authorId: true, title: true },
  });
  if (!article) return { error: "Artikel tidak ditemukan", status: 404 as const };

  if (!canEditArticle(actor.role, article.authorId, actor.id)) {
    return { error: FORBIDDEN_MESSAGE, status: 403 as const };
  }
  return { actor, article };
}

// GET /api/admin/artikel/[id]/notes — daftar catatan & diskusi internal
export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const access = await assertAccess(id);
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  try {
    const notes = await prisma.articleNote.findMany({
      where: { articleId: id },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        body: true,
        isSystem: true,
        createdAt: true,
        author: { select: { name: true, role: true } },
      },
    });
    return NextResponse.json(notes);
  } catch (err) {
    console.error("Gagal mengambil catatan redaksi:", err);
    return NextResponse.json({ error: "Gagal mengambil catatan" }, { status: 500 });
  }
}

// POST /api/admin/artikel/[id]/notes — tambah catatan internal
export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const access = await assertAccess(id);
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  try {
    const { body } = await req.json();
    if (typeof body !== "string" || !body.trim()) {
      return NextResponse.json({ error: "Isi catatan wajib diisi" }, { status: 400 });
    }

    const note = await prisma.articleNote.create({
      data: {
        articleId: id,
        body: body.trim().slice(0, 5000),
        authorId: access.actor.id,
      },
      select: {
        id: true,
        body: true,
        isSystem: true,
        createdAt: true,
        author: { select: { name: true, role: true } },
      },
    });

    return NextResponse.json(note, { status: 201 });
  } catch (err) {
    console.error("Gagal menambah catatan redaksi:", err);
    return NextResponse.json({ error: "Gagal menambah catatan" }, { status: 500 });
  }
}
