import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionActor } from "@/lib/sessionRole";
import { canReview, FORBIDDEN_MESSAGE } from "@/lib/permissions";
import { logActivity } from "@/lib/activityLog";
import { enrichArticleOnPublish } from "@/lib/autoEnrich";

interface Params {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/admin/artikel/[id]/review — keputusan editor atas artikel yang diajukan.
 *
 * body: { keputusan: "setujui" | "kembalikan", catatan?: string }
 */
export async function POST(req: NextRequest, { params }: Params) {
  const actor = await getSessionActor();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!canReview(actor.role)) {
    return NextResponse.json({ error: FORBIDDEN_MESSAGE }, { status: 403 });
  }

  const { id } = await params;

  try {
    const { keputusan, catatan } = await req.json();

    if (keputusan !== "setujui" && keputusan !== "kembalikan") {
      return NextResponse.json({ error: "Keputusan tidak dikenali" }, { status: 400 });
    }

    const article = await prisma.article.findUnique({
      where: { id },
      select: { id: true, title: true, status: true },
    });
    if (!article) return NextResponse.json({ error: "Artikel tidak ditemukan" }, { status: 404 });

    if (article.status !== "IN_REVIEW") {
      return NextResponse.json(
        { error: "Artikel ini sedang tidak dalam antrean tinjauan." },
        { status: 400 }
      );
    }

    // Mengembalikan artikel wajib disertai alasan supaya penulis tahu apa yang harus diperbaiki
    if (keputusan === "kembalikan" && (typeof catatan !== "string" || !catatan.trim())) {
      return NextResponse.json(
        { error: "Tulis alasan pengembalian supaya penulis tahu yang perlu diperbaiki." },
        { status: 400 }
      );
    }

    const disetujui = keputusan === "setujui";

    await prisma.article.update({
      where: { id },
      data: disetujui
        ? { status: "PUBLISHED", publishedAt: new Date() }
        : { status: "DRAFT", publishedAt: null },
    });

    // Catat keputusan sebagai catatan sistem di diskusi artikel
    await prisma.articleNote.create({
      data: {
        articleId: id,
        authorId: actor.id,
        isSystem: true,
        body: disetujui
          ? `Artikel disetujui dan diterbitkan oleh ${actor.name}.${
              typeof catatan === "string" && catatan.trim() ? `\n\nCatatan: ${catatan.trim()}` : ""
            }`
          : `Artikel dikembalikan untuk diperbaiki oleh ${actor.name}.\n\nAlasan: ${catatan.trim()}`,
      },
    });

    if (disetujui) {
      await enrichArticleOnPublish(id);
    }

    await logActivity({
      userId: actor.id,
      action: disetujui ? "ARTICLE_APPROVE" : "ARTICLE_RETURN",
      description: disetujui
        ? `Menyetujui & menerbitkan artikel "${article.title}"`
        : `Mengembalikan artikel "${article.title}" untuk diperbaiki`,
    });

    return NextResponse.json({
      message: disetujui ? "Artikel disetujui dan diterbitkan." : "Artikel dikembalikan ke penulis.",
    });
  } catch (err) {
    console.error("Gagal memproses tinjauan artikel:", err);
    return NextResponse.json({ error: "Gagal memproses tinjauan" }, { status: 500 });
  }
}
