import { NextRequest } from "next/server";
import { absoluteUrl } from "@/lib/utils";
import { ambilArtikelSitemap, bangunUrlset, HEADER_SITEMAP } from "@/lib/sitemap";

export const revalidate = 3600;

interface Params {
  params: Promise<{ file: string }>;
}

/**
 * GET /sitemap-artikel/[nomor].xml — satu potong sitemap artikel (maks
 * 20.000 URL). URL segmen terakhir ditangkap utuh (mis. "3.xml") lalu
 * angkanya diambil di sini, karena App Router tidak bisa mencampur
 * angka dinamis dengan akhiran literal dalam satu nama folder.
 */
export async function GET(_req: NextRequest, { params }: Params) {
  const { file } = await params;
  const bagian = parseInt(file, 10);

  if (!file.endsWith(".xml") || !Number.isFinite(bagian) || bagian < 1) {
    return new Response('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>', {
      status: 404,
      headers: HEADER_SITEMAP,
    });
  }

  const artikel = await ambilArtikelSitemap(bagian);
  const entri = artikel.map((a) => ({
    loc: absoluteUrl(`/berita/${a.slug}`),
    lastmod: a.updatedAt ?? a.publishedAt,
    changefreq: "weekly" as const,
    priority: 0.8,
  }));

  return new Response(bangunUrlset(entri), { headers: HEADER_SITEMAP });
}
