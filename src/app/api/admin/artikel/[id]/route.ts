import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activityLog";
import { snapshotRevision } from "@/lib/articleRevisions";
import { syncArticleTags } from "@/lib/tags";
import { enrichArticleOnPublish } from "@/lib/autoEnrich";
import { getSessionActor } from "@/lib/sessionRole";
import { canEditArticle, canDeleteArticle, allowedStatuses, FORBIDDEN_MESSAGE } from "@/lib/permissions";
import { countWords } from "@/lib/utils";
import { kirimNotifikasiKeSemua } from "@/lib/push";

interface Params {
  params: Promise<{ id: string }>;
}

// GET /api/admin/artikel/[id]
export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const article = await prisma.article.findUnique({
      where: { id },
      include: {
        category: true,
        author: { select: { id: true, name: true } },
        tags: { include: { tag: true } },
      },
    });
    if (!article) return NextResponse.json({ error: "Artikel tidak ditemukan" }, { status: 404 });
    return NextResponse.json(article);
  } catch {
    return NextResponse.json({ error: "Gagal mengambil artikel" }, { status: 500 });
  }
}

// PATCH /api/admin/artikel/[id]
export async function PATCH(req: NextRequest, { params }: Params) {
  const actor = await getSessionActor();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const existing = await prisma.article.findUnique({
      where: { id },
      select: { authorId: true, status: true },
    });
    if (!existing) return NextResponse.json({ error: "Artikel tidak ditemukan" }, { status: 404 });

    // Penulis hanya boleh menyunting tulisannya sendiri
    if (!canEditArticle(actor.role, existing.authorId, actor.id)) {
      return NextResponse.json({ error: FORBIDDEN_MESSAGE }, { status: 403 });
    }

    const body = await req.json();
    const { title, slug, excerpt, content, categoryId, status, thumbnailUrl, isBreaking, isEditorsPick, scheduledAt, metaTitle, metaDescription, tags, aiSummary } = body;

    if (title !== undefined && !title.trim())
      return NextResponse.json({ error: "Judul tidak boleh kosong" }, { status: 400 });

    // Penulis tidak boleh menerbitkan sendiri — hanya mengajukan ke editor
    const allowed = allowedStatuses(actor.role);
    if (status && !allowed.includes(status)) {
      return NextResponse.json(
        { error: "Kamu tidak bisa menerbitkan artikel. Ajukan ke editor untuk ditinjau." },
        { status: 403 }
      );
    }
    if (scheduledAt && !allowed.includes("SCHEDULED")) {
      return NextResponse.json(
        { error: "Kamu tidak bisa menjadwalkan artikel. Ajukan ke editor untuk ditinjau." },
        { status: 403 }
      );
    }

    let statusData: Record<string, unknown> = {};
    if (scheduledAt) {
      const scheduledDate = new Date(scheduledAt);
      if (scheduledDate.getTime() <= Date.now()) {
        return NextResponse.json({ error: "Waktu jadwal harus di masa depan" }, { status: 400 });
      }
      statusData = { status: "SCHEDULED", publishedAt: scheduledDate };
    } else if (status) {
      statusData = {
        status,
        // Arsip menyembunyikan dari publik tanpa menghapus riwayat tanggal terbit
        ...(status === "PUBLISHED" && { publishedAt: new Date() }),
        ...(status === "DRAFT" && { publishedAt: null }),
      };
    }

    if (content !== undefined && !content.trim())
      return NextResponse.json({ error: "Konten tidak boleh kosong" }, { status: 400 });

    const isContentEdit = content !== undefined;
    if (isContentEdit) {
      await snapshotRevision(id, actor.id);
    }

    const article = await prisma.article.update({
      where: { id },
      data: {
        ...(title && { title: title.trim() }),
        ...(slug && { slug }),
        ...(excerpt !== undefined && { excerpt: excerpt.trim() || null }),
        ...(content && { content: content.trim(), wordCount: countWords(content) }),
        ...(thumbnailUrl !== undefined && { thumbnailUrl: thumbnailUrl.trim() || null }),
        ...(categoryId && { categoryId }),
        ...statusData,
        ...(isBreaking !== undefined && { isBreaking: !!isBreaking }),
        ...(isEditorsPick !== undefined && { isEditorsPick: !!isEditorsPick }),
        ...(metaTitle !== undefined && { metaTitle: metaTitle?.trim() || null }),
        ...(metaDescription !== undefined && { metaDescription: metaDescription?.trim() || null }),
        ...(aiSummary !== undefined && {
          aiSummary: Array.isArray(aiSummary) && aiSummary.length > 0 ? JSON.stringify(aiSummary) : null,
        }),
      },
      include: { category: true, author: { select: { id: true, name: true } } },
    });

    if (Array.isArray(tags)) {
      await syncArticleTags(id, tags);
    }

    // Artikel yang akan tayang dilengkapi Inti Berita + tag otomatis.
    // Inti Berita dilewati kalau redaksi sudah mengisi/menghapusnya sendiri lewat form.
    if (article.status === "PUBLISHED" || article.status === "SCHEDULED") {
      await enrichArticleOnPublish(id, aiSummary !== undefined);
    }

    // Kirim Push Notification HANYA saat artikel breaking BARU terbit —
    // bukan tiap kali artikel yang sudah tayang disunting ulang, supaya
    // pembaca tidak menerima notifikasi berulang untuk berita yang sama.
    const baruTerbit = existing.status !== "PUBLISHED" && article.status === "PUBLISHED";
    if (baruTerbit && article.isBreaking) {
      // Kegagalan kirim tidak boleh menggagalkan penyimpanan artikel
      kirimNotifikasiKeSemua({
        title: "Breaking News",
        body: article.title,
        url: `/berita/${article.slug}`,
      }).catch((err) => console.error("Gagal mengirim push:", err));
    }

    const description = scheduledAt
      ? `Menjadwalkan artikel "${article.title}" untuk terbit ${new Date(scheduledAt).toLocaleString("id-ID")}`
      : status === "IN_REVIEW" && existing.status !== "IN_REVIEW"
      ? `Mengajukan artikel "${article.title}" untuk ditinjau`
      : !isContentEdit && status === "PUBLISHED"
      ? `Menerbitkan artikel "${article.title}"`
      : !isContentEdit && status === "ARCHIVED"
      ? `Mengarsipkan artikel "${article.title}"`
      : `Mengedit artikel "${article.title}"`;

    await logActivity({
      userId: actor.id,
      action: "ARTICLE_UPDATE",
      description,
    });

    return NextResponse.json(article);
  } catch (err) {
    console.error("Gagal memperbarui artikel:", err);
    const detail = process.env.NODE_ENV === "development" && err instanceof Error ? `: ${err.message}` : "";
    return NextResponse.json({ error: `Gagal memperbarui artikel${detail}` }, { status: 500 });
  }
}

// DELETE /api/admin/artikel/[id]
export async function DELETE(_req: NextRequest, { params }: Params) {
  const actor = await getSessionActor();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const existing = await prisma.article.findUnique({
      where: { id },
      select: { authorId: true },
    });
    if (!existing) return NextResponse.json({ error: "Artikel tidak ditemukan" }, { status: 404 });

    // Penulis hanya boleh menghapus tulisannya sendiri
    if (!canDeleteArticle(actor.role, existing.authorId, actor.id)) {
      return NextResponse.json({ error: FORBIDDEN_MESSAGE }, { status: 403 });
    }

    const deleted = await prisma.article.delete({ where: { id } });

    await logActivity({
      userId: actor.id,
      action: "ARTICLE_DELETE",
      description: `Menghapus artikel "${deleted.title}"`,
    });

    return NextResponse.json({ message: "Artikel berhasil dihapus" });
  } catch (err) {
    console.error("Gagal menghapus artikel:", err);
    return NextResponse.json({ error: "Gagal menghapus artikel" }, { status: 500 });
  }
}
