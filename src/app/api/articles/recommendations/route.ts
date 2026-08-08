import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/articles/recommendations — rekomendasi artikel berdasarkan
 * riwayat baca pembaca.
 *
 * Riwayat dikirim dari browser (localStorage), tidak disimpan di server,
 * sehingga personalisasi berjalan tanpa perlu akun maupun profil pembaca.
 */
export async function POST(req: NextRequest) {
  try {
    const { slugs, limit } = await req.json();

    const riwayat: string[] = Array.isArray(slugs)
      ? slugs.filter((s) => typeof s === "string").slice(0, 20)
      : [];
    const jumlah = Math.min(Math.max(Number(limit) || 6, 1), 12);

    // Belum ada riwayat → tidak ada yang bisa dipersonalisasi
    if (riwayat.length === 0) {
      return NextResponse.json({ articles: [], berdasarkan: [] });
    }

    // Pelajari minat pembaca dari kategori & tag artikel yang pernah dibaca
    const dibaca = await prisma.article.findMany({
      where: { slug: { in: riwayat } },
      select: {
        categoryId: true,
        category: { select: { name: true } },
        tags: { select: { tagId: true, tag: { select: { name: true } } } },
      },
    });

    if (dibaca.length === 0) {
      return NextResponse.json({ articles: [], berdasarkan: [] });
    }

    // Hitung minat: kategori & tag yang paling sering muncul
    const skorKategori = new Map<string, number>();
    const skorTag = new Map<string, number>();
    const namaMinat = new Map<string, number>();

    for (const a of dibaca) {
      skorKategori.set(a.categoryId, (skorKategori.get(a.categoryId) ?? 0) + 1);
      namaMinat.set(a.category.name, (namaMinat.get(a.category.name) ?? 0) + 1);
      for (const t of a.tags) {
        skorTag.set(t.tagId, (skorTag.get(t.tagId) ?? 0) + 1);
        namaMinat.set(t.tag.name, (namaMinat.get(t.tag.name) ?? 0) + 1);
      }
    }

    const kategoriDiminati = Array.from(skorKategori.keys());
    const tagDiminati = Array.from(skorTag.keys());

    // Cari artikel yang cocok minat, kecuali yang sudah dibaca
    const kandidat = await prisma.article.findMany({
      where: {
        AND: [
          {
            OR: [
              { status: "PUBLISHED" },
              { status: "SCHEDULED", publishedAt: { lte: new Date() } },
            ],
          },
          { slug: { notIn: riwayat } },
          {
            OR: [
              { categoryId: { in: kategoriDiminati } },
              ...(tagDiminati.length ? [{ tags: { some: { tagId: { in: tagDiminati } } } }] : []),
            ],
          },
        ],
      },
      orderBy: { publishedAt: "desc" },
      take: 40,
      select: {
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
        categoryId: true,
        category: { select: { id: true, name: true, slug: true } },
        author: { select: { id: true, name: true, image: true } },
        tags: { select: { tagId: true } },
      },
    });

    // Beri skor: kecocokan tag dinilai lebih tinggi daripada kategori,
    // karena tag lebih spesifik menggambarkan topik
    const berskor = kandidat.map((a) => {
      const skorKat = skorKategori.get(a.categoryId) ?? 0;
      const skorTg = a.tags.reduce((sum, t) => sum + (skorTag.get(t.tagId) ?? 0) * 2, 0);
      return { kartu: { ...a, categoryId: undefined, tags: undefined }, skor: skorKat + skorTg };
    });

    const articles = berskor
      .filter((b) => b.skor > 0)
      .sort((a, b) => b.skor - a.skor)
      .slice(0, jumlah)
      .map((b) => b.kartu);

    // Tampilkan dasar rekomendasi supaya pembaca tahu kenapa artikel ini muncul
    const berdasarkan = Array.from(namaMinat.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([nama]) => nama);

    return NextResponse.json({ articles, berdasarkan });
  } catch (err) {
    console.error("Gagal menyusun rekomendasi:", err);
    return NextResponse.json({ error: "Gagal menyusun rekomendasi" }, { status: 500 });
  }
}
