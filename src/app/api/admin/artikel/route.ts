import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activityLog";
import { syncArticleTags } from "@/lib/tags";
import { enrichArticleOnPublish } from "@/lib/autoEnrich";
import { STALE_SESSION_MESSAGE } from "@/lib/sessionUser";
import { getSessionActor } from "@/lib/sessionRole";
import { allowedStatuses, canManageAllArticles } from "@/lib/permissions";
import { countWords } from "@/lib/utils";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

// GET /api/admin/artikel — daftar artikel (termasuk draft)
export async function GET() {
  const actor = await getSessionActor();
  if (!actor) return NextResponse.json({ error: STALE_SESSION_MESSAGE }, { status: 401 });

  try {
    // Penulis hanya boleh melihat tulisannya sendiri — draf orang lain
    // bisa memuat materi yang belum siap terbit
    const articles = await prisma.article.findMany({
      where: canManageAllArticles(actor.role) ? undefined : { authorId: actor.id },
      orderBy: { createdAt: "desc" },
      include: { category: true, author: { select: { id: true, name: true } } },
    });
    return NextResponse.json(articles);
  } catch {
    return NextResponse.json({ error: "Gagal mengambil data artikel" }, { status: 500 });
  }
}

// POST /api/admin/artikel — buat artikel baru
export async function POST(req: NextRequest) {
  // Peran dibaca dari database, bukan token, supaya perubahan izin berlaku seketika
  const actor = await getSessionActor();
  if (!actor) return NextResponse.json({ error: STALE_SESSION_MESSAGE }, { status: 401 });
  const authorId = actor.id;

  try {
    const body = await req.json();
    const { title, slug, excerpt, content, categoryId, status, thumbnailUrl, isBreaking, isEditorsPick, scheduledAt, metaTitle, metaDescription, tags, aiSummary } = body;

    if (!title?.trim()) return NextResponse.json({ error: "Judul wajib diisi" }, { status: 400 });
    if (!content?.trim()) return NextResponse.json({ error: "Konten wajib diisi" }, { status: 400 });
    if (!categoryId) return NextResponse.json({ error: "Kategori wajib dipilih" }, { status: 400 });

    const finalSlug = slug?.trim() || slugify(title);

    const existing = await prisma.article.findUnique({ where: { slug: finalSlug } });
    if (existing) return NextResponse.json({ error: "Slug sudah digunakan" }, { status: 409 });

    // Penulis tidak boleh menerbitkan sendiri — hanya draf atau ajukan ke editor
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

    let finalStatus: "DRAFT" | "IN_REVIEW" | "SCHEDULED" | "PUBLISHED" | "ARCHIVED" =
      status === "PUBLISHED" ? "PUBLISHED" : status === "IN_REVIEW" ? "IN_REVIEW" : "DRAFT";
    let publishedAt: Date | null = finalStatus === "PUBLISHED" ? new Date() : null;

    if (scheduledAt) {
      const scheduledDate = new Date(scheduledAt);
      if (scheduledDate.getTime() <= Date.now()) {
        return NextResponse.json({ error: "Waktu jadwal harus di masa depan" }, { status: 400 });
      }
      finalStatus = "SCHEDULED";
      publishedAt = scheduledDate;
    }

    const article = await prisma.article.create({
      data: {
        title: title.trim(),
        slug: finalSlug,
        excerpt: excerpt?.trim() || null,
        content: content.trim(),
        wordCount: countWords(content),
        thumbnailUrl: thumbnailUrl?.trim() || null,
        categoryId,
        authorId,
        status: finalStatus,
        publishedAt,
        isBreaking: !!isBreaking,
        isEditorsPick: !!isEditorsPick,
        previewToken: crypto.randomUUID(),
        previewTokenExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        metaTitle: metaTitle?.trim() || null,
        metaDescription: metaDescription?.trim() || null,
        aiSummary: Array.isArray(aiSummary) && aiSummary.length > 0 ? JSON.stringify(aiSummary) : null,
      },
      include: { category: true, author: { select: { id: true, name: true } } },
    });

    if (Array.isArray(tags)) {
      await syncArticleTags(article.id, tags);
    }

    // Artikel yang akan tayang dilengkapi Inti Berita + tag otomatis.
    // Inti Berita dilewati kalau redaksi sudah mengisi/menghapusnya sendiri lewat form.
    if (finalStatus === "PUBLISHED" || finalStatus === "SCHEDULED") {
      await enrichArticleOnPublish(article.id, aiSummary !== undefined);
    }

    await logActivity({
      userId: authorId,
      action: "ARTICLE_CREATE",
      description: `Membuat artikel "${article.title}"`,
    });

    return NextResponse.json(article, { status: 201 });
  } catch (err) {
    console.error("Gagal membuat artikel:", err);
    // Detail teknis hanya ditampilkan saat development, supaya mudah didiagnosis
    const detail = process.env.NODE_ENV === "development" && err instanceof Error ? `: ${err.message}` : "";
    return NextResponse.json({ error: `Gagal membuat artikel${detail}` }, { status: 500 });
  }
}
