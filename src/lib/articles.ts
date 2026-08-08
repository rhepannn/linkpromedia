import { cache } from "react";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import type { Article, ArticleCard } from "@/types";

const CARD_SELECT = {
  id: true,
  title: true,
  slug: true,
  excerpt: true,
  thumbnailUrl: true,
  status: true,
  isBreaking: true,
  isEditorsPick: true,
  isLive: true,
  viewCount: true,
  publishedAt: true,
  category: { select: { id: true, name: true, slug: true } },
  author: { select: { id: true, name: true, image: true } },
} as const;

/**
 * Kondisi "terlihat oleh publik": PUBLISHED, atau SCHEDULED yang waktunya sudah tiba.
 * Dipakai di semua query publik supaya artikel terjadwal otomatis tampil tanpa aksi manual.
 */
function publicVisibleWhere(): Prisma.ArticleWhereInput {
  return {
    OR: [{ status: "PUBLISHED" }, { status: "SCHEDULED", publishedAt: { lte: new Date() } }],
  };
}

/**
 * Kondisi untuk DAFTAR artikel publik (beranda, kategori, pencarian, RSS, dll):
 * sama seperti publicVisibleWhere TAPI hanya artikel berbahasa Indonesia.
 *
 * Terjemahan sengaja tidak ikut muncul di daftar supaya satu berita tidak
 * tampil berkali-kali dalam bahasa berbeda. Terjemahan tetap bisa dibuka
 * langsung lewat pengalih bahasa di halaman artikel aslinya.
 */
function daftarPublikWhere(): Prisma.ArticleWhereInput {
  return { AND: [publicVisibleWhere(), { language: "id" }] };
}

/**
 * "Naikkan" artikel terjadwal yang waktunya sudah lewat menjadi PUBLISHED sungguhan.
 * Dipanggil di layout publik & admin supaya status di DB ikut sinkron (bukan cuma tampilan).
 */
export async function promoteScheduledArticles(): Promise<void> {
  await prisma.article.updateMany({
    where: { status: "SCHEDULED", publishedAt: { lte: new Date() } },
    data: { status: "PUBLISHED" },
  });
}

/**
 * Ambil semua artikel terpublish, diurutkan dari terbaru
 */
export async function getPublishedArticles(limit?: number): Promise<ArticleCard[]> {
  return prisma.article.findMany({
    where: daftarPublikWhere(),
    orderBy: { publishedAt: "desc" },
    take: limit,
    select: CARD_SELECT,
  });
}

/**
 * Ambil semua artikel (semua status) untuk daftar di panel admin
 */
export async function getAllArticles(): Promise<ArticleCard[]> {
  return prisma.article.findMany({
    orderBy: { createdAt: "desc" },
    select: CARD_SELECT,
  });
}

/**
 * Ambil artikel milik satu penulis saja — dipakai di panel admin supaya
 * penulis hanya melihat tulisannya sendiri.
 */
export async function getArticlesByAuthor(authorId: string): Promise<ArticleCard[]> {
  return prisma.article.findMany({
    where: { authorId },
    orderBy: { createdAt: "desc" },
    select: CARD_SELECT,
  });
}

/**
 * Ambil artikel TERBIT (bukan draft/arsip) milik satu penulis — dipakai di
 * halaman profil publik penulis, supaya draf tidak ikut bocor ke pembaca.
 */
export async function getPublishedArticlesByAuthor(authorId: string, limit?: number): Promise<ArticleCard[]> {
  return prisma.article.findMany({
    where: { AND: [daftarPublikWhere(), { authorId }] },
    orderBy: { publishedAt: "desc" },
    take: limit,
    select: CARD_SELECT,
  });
}

export interface VersiBahasa {
  language: string;
  slug: string;
}

/**
 * Semua versi bahasa yang TERBIT dari satu berita — dipakai pengalih bahasa
 * di halaman artikel. Menerima artikel asli maupun terjemahannya, dan selalu
 * mengembalikan seluruh keluarganya (asli + semua terjemahan).
 */
export async function getVersiBahasa(article: {
  id: string;
  language?: string;
  translationOfId?: string | null;
}): Promise<VersiBahasa[]> {
  const idAsli = article.translationOfId ?? article.id;

  const [asli, terjemahan] = await Promise.all([
    prisma.article.findFirst({
      where: { AND: [publicVisibleWhere(), { id: idAsli }] },
      select: { language: true, slug: true },
    }),
    prisma.article.findMany({
      where: { AND: [publicVisibleWhere(), { translationOfId: idAsli }] },
      orderBy: { language: "asc" },
      select: { language: true, slug: true },
    }),
  ]);

  const semua = [...(asli ? [asli] : []), ...terjemahan];
  // Cuma satu versi berarti tidak ada pilihan bahasa untuk ditawarkan
  return semua.length > 1 ? semua : [];
}

export interface AuthorProfile {
  id: string;
  name: string;
  slug: string;
  bio: string | null;
  image: string | null;
  isVerified: boolean;
  role: "ADMIN" | "EDITOR" | "AUTHOR";
}

/** Ambil profil penulis lewat slug publiknya — null kalau tidak ada/belum punya slug */
export const getAuthorBySlug = cache(async (slug: string): Promise<AuthorProfile | null> => {
  return prisma.user.findFirst({
    where: { slug },
    select: { id: true, name: true, slug: true, bio: true, image: true, isVerified: true, role: true },
  }) as Promise<AuthorProfile | null>;
});

/**
 * Ambil artikel headline (artikel terbaru/utama)
 */
export async function getHeadlineArticles(limit = 5): Promise<ArticleCard[]> {
  return getPublishedArticles(limit);
}

/**
 * Ambil artikel yang ditandai Breaking News, untuk ticker
 */
export async function getBreakingArticles(limit = 5): Promise<ArticleCard[]> {
  return prisma.article.findMany({
    where: { AND: [daftarPublikWhere(), { isBreaking: true }] },
    orderBy: { publishedAt: "desc" },
    take: limit,
    select: CARD_SELECT,
  });
}

/**
 * Ambil artikel pilihan redaksi (Editor's Pick)
 */
export async function getEditorsPicks(limit = 5): Promise<ArticleCard[]> {
  return prisma.article.findMany({
    where: { AND: [daftarPublikWhere(), { isEditorsPick: true }] },
    orderBy: { publishedAt: "desc" },
    take: limit,
    select: CARD_SELECT,
  });
}

/**
 * Ambil artikel berdasarkan kategori
 */
export async function getArticlesByCategory(
  categorySlug: string,
  limit?: number
): Promise<ArticleCard[]> {
  return prisma.article.findMany({
    where: { AND: [daftarPublikWhere(), { category: { slug: categorySlug } }] },
    orderBy: { publishedAt: "desc" },
    take: limit,
    select: CARD_SELECT,
  });
}

/** Jumlah artikel per halaman pada daftar kategori & topik */
export const ARTIKEL_PER_HALAMAN = 24;

export interface HalamanArtikel {
  articles: ArticleCard[];
  total: number;
  halaman: number;
  totalHalaman: number;
}

/**
 * Ambil satu halaman artikel sebuah kategori.
 *
 * Daftar kategori WAJIB dibatasi: tanpa ini satu kunjungan menarik seluruh
 * arsip kategori sekaligus, yang akan melumpuhkan halaman begitu artikelnya
 * mencapai ribuan.
 */
export async function getArticlesByCategoryPaged(
  categorySlug: string,
  halaman = 1,
  perHalaman = ARTIKEL_PER_HALAMAN
): Promise<HalamanArtikel> {
  const where = { AND: [daftarPublikWhere(), { category: { slug: categorySlug } }] };
  const halamanAman = Math.max(1, Math.floor(halaman) || 1);

  const [articles, total] = await Promise.all([
    prisma.article.findMany({
      where,
      orderBy: { publishedAt: "desc" },
      skip: (halamanAman - 1) * perHalaman,
      take: perHalaman,
      select: CARD_SELECT,
    }),
    prisma.article.count({ where }),
  ]);

  return {
    articles,
    total,
    halaman: halamanAman,
    totalHalaman: Math.max(1, Math.ceil(total / perHalaman)),
  };
}

/**
 * Ambil satu artikel terpublish berdasarkan slug (untuk halaman publik)
 * Dibungkus cache() agar generateMetadata & komponen halaman tidak query dua kali
 */
export const getArticleBySlug = cache(async (slug: string): Promise<Article | null> => {
  return prisma.article.findFirst({
    where: { AND: [publicVisibleWhere(), { slug }] },
    include: {
      category: true,
      author: { select: { id: true, name: true, image: true, slug: true, isVerified: true } },
      tags: { include: { tag: true } },
    },
  });
});

/**
 * Tambah 1 hitungan pembaca (View Counter). Dipanggil sekali saat halaman artikel dirender.
 */
export async function incrementViewCount(id: string): Promise<void> {
  await prisma.article.update({
    where: { id },
    data: { viewCount: { increment: 1 } },
  });
}

/**
 * Ambil artikel paling banyak dibaca (Trending)
 */
export async function getTrendingArticles(limit = 5): Promise<ArticleCard[]> {
  return prisma.article.findMany({
    where: daftarPublikWhere(),
    orderBy: { viewCount: "desc" },
    take: limit,
    select: CARD_SELECT,
  });
}

/**
 * Ambil satu artikel berdasarkan ID, tanpa filter status (untuk admin/edit)
 */
export async function getArticleById(id: string): Promise<Article | null> {
  return prisma.article.findUnique({
    where: { id },
    include: {
      category: true,
      author: { select: { id: true, name: true, image: true } },
      tags: { include: { tag: true } },
    },
  });
}

/**
 * Cari artikel berdasarkan query
 */
export async function searchArticles(
  query: string,
  page = 1,
  perPage = 24
): Promise<{ articles: ArticleCard[]; total: number }> {
  if (!query.trim()) return { articles: [], total: 0 };
  const safePage = Math.max(1, Math.floor(page) || 1);

  const where = {
    AND: [
      daftarPublikWhere(),
      {
        OR: [
          { title: { contains: query, mode: "insensitive" as const } },
          { excerpt: { contains: query, mode: "insensitive" as const } },
          { content: { contains: query, mode: "insensitive" as const } },
        ],
      },
    ],
  };

  const [articles, total] = await Promise.all([
    prisma.article.findMany({
      where,
      orderBy: { publishedAt: "desc" },
      skip: (safePage - 1) * perPage,
      take: perPage,
      select: CARD_SELECT,
    }),
    prisma.article.count({ where }),
  ]);

  return { articles, total };
}

/**
 * Ambil artikel terkait berdasarkan kemiripan isi (tag yang sama), bukan hanya kategori.
 * Artikel dengan tag yang sama diprioritaskan; sisanya diisi dari kategori yang sama.
 */
export async function getRelatedArticles(
  categorySlug: string,
  excludeSlug: string,
  limit = 4,
  tagNames: string[] = []
): Promise<ArticleCard[]> {
  let byTag: ArticleCard[] = [];

  if (tagNames.length > 0) {
    // Peringkat berdasarkan BERAPA BANYAK tag yang sama — makin banyak tag
    // yang beririsan, makin mirip isinya.
    const overlaps = await prisma.articleTag.groupBy({
      by: ["articleId"],
      where: {
        tag: { name: { in: tagNames } },
        article: { AND: [daftarPublikWhere(), { slug: { not: excludeSlug } }] },
      },
      _count: { tagId: true },
      orderBy: { _count: { tagId: "desc" } },
      take: limit,
    });

    if (overlaps.length > 0) {
      const found = await prisma.article.findMany({
        where: { id: { in: overlaps.map((o) => o.articleId) } },
        select: CARD_SELECT,
      });
      const rank = new Map(overlaps.map((o, i) => [o.articleId, i]));
      byTag = found.sort((a, b) => (rank.get(a.id) ?? 0) - (rank.get(b.id) ?? 0));
    }
  }

  if (byTag.length >= limit) return byTag;

  const seen = new Set(byTag.map((a) => a.slug));
  const byCategory = await prisma.article.findMany({
    where: {
      AND: [
        daftarPublikWhere(),
        { category: { slug: categorySlug }, slug: { notIn: [excludeSlug, ...seen] } },
      ],
    },
    orderBy: { publishedAt: "desc" },
    take: limit - byTag.length,
    select: CARD_SELECT,
  });

  return [...byTag, ...byCategory];
}

/**
 * Ambil artikel apa pun (semua status) berdasarkan token preview — untuk Draft Preview
 */
export async function getArticleByPreviewToken(token: string): Promise<Article | null> {
  return prisma.article.findUnique({
    where: { previewToken: token },
    include: {
      category: true,
      author: { select: { id: true, name: true, image: true } },
      tags: { include: { tag: true } },
    },
  });
}

/**
 * Ambil beberapa artikel terpublish berdasarkan daftar slug (untuk Bookmark & Reading History)
 */
export async function getArticlesBySlugs(slugs: string[]): Promise<ArticleCard[]> {
  if (slugs.length === 0) return [];
  const articles = await prisma.article.findMany({
    where: { AND: [publicVisibleWhere(), { slug: { in: slugs } }] },
    select: CARD_SELECT,
  });
  // Pertahankan urutan sesuai daftar slug yang diminta (mis. terbaru dibaca duluan)
  const order = new Map(slugs.map((s, i) => [s, i]));
  return articles.sort((a, b) => (order.get(a.slug) ?? 0) - (order.get(b.slug) ?? 0));
}

export interface LiveUpdateEntry {
  id: string;
  content: string;
  createdAt: Date;
  author: { name: string } | null;
}

/**
 * Ambil semua update kronologis sebuah artikel live, terbaru dulu
 */
export async function getLiveUpdates(articleId: string): Promise<LiveUpdateEntry[]> {
  return prisma.articleLiveUpdate.findMany({
    where: { articleId },
    orderBy: { createdAt: "desc" },
    select: { id: true, content: true, createdAt: true, author: { select: { name: true } } },
  });
}
