import { prisma } from "@/lib/prisma";
import type { ArticleCard } from "@/types";

/**
 * Bobot tiap sinyal dalam skor tren.
 * Waktu baca dan share diberi bobot lebih besar dari sekadar klik, karena
 * keduanya menandakan pembaca benar-benar tertarik — bukan hanya lewat.
 */
const BOBOT = {
  kunjungan: 1,
  pembacaTuntas: 3, // kunjungan dengan durasi baca memadai
  share: 5,
};

/** Seberapa cepat berita "menua". Makin besar, makin cepat tergeser berita baru. */
const GRAVITASI = 1.5;

/** Durasi minimal (detik) sebelum kunjungan dianggap benar-benar dibaca */
const AMBANG_BACA = 30;

export interface TrendingArticle extends ArticleCard {
  skor: number;
  kunjungan: number;
}

/**
 * Trending Algorithm — memeringkat artikel dari gabungan beberapa sinyal,
 * bukan sekadar jumlah klik terbanyak sepanjang masa.
 *
 * Rumusnya meniru pendekatan peringkat Hacker News:
 *
 *     skor = bobot_sinyal / (umur_jam + 2) ^ gravitasi
 *
 * Pembagi umur membuat berita lama luruh dengan sendirinya, sehingga
 * artikel viral tahun lalu tidak selamanya menempel di daftar tren.
 */
export async function getTrendingArticles(limit = 6, periodeJam = 72): Promise<TrendingArticle[]> {
  const sejak = new Date(Date.now() - periodeJam * 60 * 60 * 1000);

  // Hanya hitung kunjungan dalam periode ini — tren adalah soal "sedang ramai",
  // bukan akumulasi sepanjang masa
  const kunjungan = await prisma.pageView.findMany({
    where: { createdAt: { gte: sejak }, articleId: { not: null } },
    select: { articleId: true, duration: true },
  });

  if (kunjungan.length === 0) return [];

  const statistik = new Map<string, { kunjungan: number; tuntas: number }>();
  for (const k of kunjungan) {
    if (!k.articleId) continue;
    const s = statistik.get(k.articleId) ?? { kunjungan: 0, tuntas: 0 };
    s.kunjungan += 1;
    if (k.duration >= AMBANG_BACA) s.tuntas += 1;
    statistik.set(k.articleId, s);
  }

  const artikel = await prisma.article.findMany({
    where: {
      id: { in: Array.from(statistik.keys()) },
      OR: [{ status: "PUBLISHED" }, { status: "SCHEDULED", publishedAt: { lte: new Date() } }],
    },
    select: {
      id: true,
      title: true,
      slug: true,
      excerpt: true,
      thumbnailUrl: true,
      status: true,
      isBreaking: true,
      isEditorsPick: true,
      viewCount: true,
      shareCount: true,
      publishedAt: true,
      category: { select: { id: true, name: true, slug: true } },
      author: { select: { id: true, name: true, image: true } },
    },
  });

  const sekarang = Date.now();

  const berskor = artikel.map((a) => {
    const s = statistik.get(a.id)!;
    const sinyal =
      s.kunjungan * BOBOT.kunjungan + s.tuntas * BOBOT.pembacaTuntas + a.shareCount * BOBOT.share;

    const umurJam = a.publishedAt
      ? Math.max(0, (sekarang - new Date(a.publishedAt).getTime()) / (1000 * 60 * 60))
      : periodeJam;

    const skor = sinyal / Math.pow(umurJam + 2, GRAVITASI);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { shareCount: _shareCount, ...kartu } = a;
    return { ...kartu, skor: Math.round(skor * 1000) / 1000, kunjungan: s.kunjungan };
  });

  return berskor.sort((a, b) => b.skor - a.skor).slice(0, limit);
}
