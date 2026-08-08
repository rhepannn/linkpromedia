import { prisma } from "@/lib/prisma";
import { MIN_INDEXABLE_WORDS } from "@/lib/utils";

/**
 * Batas resmi Google: 50.000 URL per sitemap. Dipasang di 20.000 supaya
 * masih longgar dan ukuran berkasnya tetap ringan diunduh perayap.
 */
export const URL_PER_SITEMAP = 20_000;

/**
 * Artikel yang sudah boleh dilihat publik DAN layak diindeks.
 * Konten tipis (di bawah MIN_INDEXABLE_WORDS) sengaja dikecualikan —
 * halamannya sendiri sudah ditandai noindex, jadi mencantumkannya di
 * sitemap hanya membuang anggaran crawl mesin pencari.
 */
const TAYANG = {
  AND: [
    {
      OR: [
        { status: "PUBLISHED" as const },
        { status: "SCHEDULED" as const, publishedAt: { lte: new Date() } },
      ],
    },
    { wordCount: { gte: MIN_INDEXABLE_WORDS } },
  ],
};

export function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Jumlah berkas sitemap artikel yang dibutuhkan saat ini */
export async function hitungBagianArtikel(): Promise<number> {
  const total = await prisma.article.count({ where: TAYANG });
  return Math.max(1, Math.ceil(total / URL_PER_SITEMAP));
}

export interface EntriSitemap {
  loc: string;
  lastmod?: Date | null;
  changefreq?: string;
  priority?: number;
}

/** Ambil satu potong daftar artikel untuk sitemap ke-`bagian` (mulai dari 1) */
export async function ambilArtikelSitemap(bagian: number) {
  return prisma.article.findMany({
    where: TAYANG,
    orderBy: { publishedAt: "desc" },
    skip: (bagian - 1) * URL_PER_SITEMAP,
    take: URL_PER_SITEMAP,
    select: { slug: true, publishedAt: true, updatedAt: true },
  });
}

/** Susun XML urlset dari daftar entri */
export function bangunUrlset(entri: EntriSitemap[]): string {
  const isi = entri
    .map((e) => {
      const baris = [`    <loc>${escapeXml(e.loc)}</loc>`];
      if (e.lastmod) baris.push(`    <lastmod>${new Date(e.lastmod).toISOString()}</lastmod>`);
      if (e.changefreq) baris.push(`    <changefreq>${e.changefreq}</changefreq>`);
      if (e.priority !== undefined) baris.push(`    <priority>${e.priority}</priority>`);
      return `  <url>\n${baris.join("\n")}\n  </url>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${isi}
</urlset>`;
}

/** Susun XML sitemapindex dari daftar alamat sitemap */
export function bangunIndex(alamat: string[]): string {
  const isi = alamat
    .map((a) => `  <sitemap>\n    <loc>${escapeXml(a)}</loc>\n  </sitemap>`)
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${isi}
</sitemapindex>`;
}

/** Header seragam untuk semua respons sitemap */
export const HEADER_SITEMAP = {
  "Content-Type": "application/xml; charset=utf-8",
  "Cache-Control": "public, max-age=3600, s-maxage=3600",
};
