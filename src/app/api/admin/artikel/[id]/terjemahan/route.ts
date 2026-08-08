import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionActor } from "@/lib/sessionRole";
import { canEditArticle, FORBIDDEN_MESSAGE } from "@/lib/permissions";
import { logActivity } from "@/lib/activityLog";
import { countWords } from "@/lib/utils";
import { translateArticle, NAMA_BAHASA_TARGET, type BahasaTarget } from "@/lib/ai";

interface Params {
  params: Promise<{ id: string }>;
}

const BAHASA_VALID: BahasaTarget[] = ["en", "ja", "ar"];

// Menerjemahkan artikel penuh adalah panggilan AI terpanjang di proyek ini —
// jauh melewati batas bawaan Vercel Hobby (~10 dtk); 60 dtk = maksimum Hobby.
export const maxDuration = 60;

/** GET — daftar terjemahan yang sudah ada untuk artikel ini */
export async function GET(_req: NextRequest, { params }: Params) {
  const actor = await getSessionActor();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const terjemahan = await prisma.article.findMany({
    where: { translationOfId: id },
    orderBy: { createdAt: "asc" },
    select: { id: true, title: true, slug: true, language: true, status: true },
  });

  return NextResponse.json(terjemahan);
}

/**
 * POST — terjemahkan artikel ini lalu simpan sebagai artikel terjemahan baru.
 *
 * Terjemahan SELALU berstatus DRAFT: mesin tidak boleh menerbitkan sendiri,
 * hasilnya wajib ditinjau editor dulu — sama seperti AI Draft Writer.
 */
export async function POST(req: NextRequest, { params }: Params) {
  const actor = await getSessionActor();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const { bahasa } = await req.json();
    if (!BAHASA_VALID.includes(bahasa)) {
      return NextResponse.json({ error: "Bahasa tidak didukung" }, { status: 400 });
    }

    const asli = await prisma.article.findUnique({
      where: { id },
      select: {
        id: true, title: true, content: true, excerpt: true, thumbnailUrl: true,
        categoryId: true, authorId: true, language: true, translationOfId: true,
      },
    });
    if (!asli) return NextResponse.json({ error: "Artikel tidak ditemukan" }, { status: 404 });

    if (!canEditArticle(actor.role, asli.authorId, actor.id)) {
      return NextResponse.json({ error: FORBIDDEN_MESSAGE }, { status: 403 });
    }

    // Terjemahan dari terjemahan akan menjauh dari teks aslinya — selalu
    // terjemahkan dari sumber berbahasa Indonesia
    if (asli.translationOfId) {
      return NextResponse.json(
        { error: "Artikel ini sendiri adalah terjemahan. Terjemahkan dari artikel aslinya." },
        { status: 400 }
      );
    }

    const sudahAda = await prisma.article.findFirst({
      where: { translationOfId: id, language: bahasa },
      select: { id: true },
    });
    if (sudahAda) {
      return NextResponse.json(
        { error: `Terjemahan Bahasa ${NAMA_BAHASA_TARGET[bahasa as BahasaTarget]} sudah ada.`, existingId: sudahAda.id },
        { status: 409 }
      );
    }

    const hasil = await translateArticle(asli.title, asli.content, bahasa);
    if (!hasil) {
      return NextResponse.json(
        { error: "Konten terlalu pendek untuk diterjemahkan." },
        { status: 422 }
      );
    }

    // Slug terjemahan diberi akhiran kode bahasa supaya tidak bentrok
    // dengan slug artikel aslinya
    const slugDasar = `${asli.id.slice(-8)}-${bahasa}`;
    let slug = hasil.title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
    // Judul non-Latin (Jepang/Arab) menghasilkan slug kosong setelah disaring
    if (!slug) slug = slugDasar;
    else slug = `${slug}-${bahasa}`;

    const bentrok = await prisma.article.findUnique({ where: { slug }, select: { id: true } });
    if (bentrok) slug = slugDasar;

    const terjemahan = await prisma.article.create({
      data: {
        title: hasil.title,
        slug,
        content: hasil.content,
        wordCount: countWords(hasil.content),
        excerpt: null,
        thumbnailUrl: asli.thumbnailUrl,
        categoryId: asli.categoryId,
        authorId: asli.authorId,
        language: bahasa,
        translationOfId: asli.id,
        status: "DRAFT", // wajib ditinjau editor dulu
        previewToken: crypto.randomUUID(),
        previewTokenExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
      select: { id: true, title: true, slug: true, language: true, status: true },
    });

    // Jejak audit: siapa pun yang membuka artikel ini tahu asalnya terjemahan mesin
    await prisma.articleNote.create({
      data: {
        articleId: terjemahan.id,
        authorId: actor.id,
        isSystem: true,
        body:
          `Artikel ini adalah terjemahan otomatis (AI) ke Bahasa ${NAMA_BAHASA_TARGET[bahasa as BahasaTarget]} ` +
          `dari artikel "${asli.title}". Periksa keakuratan terjemahannya sebelum diterbitkan.`,
      },
    });

    await logActivity({
      userId: actor.id,
      action: "ARTICLE_CREATE",
      description: `Membuat terjemahan ${NAMA_BAHASA_TARGET[bahasa as BahasaTarget]} untuk "${asli.title}"`,
    });

    return NextResponse.json(terjemahan, { status: 201 });
  } catch (err) {
    console.error("Gagal membuat terjemahan:", err);
    return NextResponse.json({ error: "Gagal membuat terjemahan" }, { status: 500 });
  }
}
