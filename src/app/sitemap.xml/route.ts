import { absoluteUrl } from "@/lib/utils";
import { hitungBagianArtikel, bangunIndex, HEADER_SITEMAP } from "@/lib/sitemap";

export const revalidate = 3600;

/**
 * GET /sitemap.xml — indeks yang menunjuk ke sitemap statis/kategori dan
 * ke sitemap artikel yang terpecah per 20.000 URL.
 *
 * Kalau sitemap artikel langsung memuat semuanya tanpa dipecah, situs akan
 * melewati batas 50.000 URL Google begitu arsipnya besar — dan sitemap
 * yang melewati batas itu DITOLAK SELURUHNYA, bukan dipotong sebagian.
 */
export async function GET() {
  const bagian = await hitungBagianArtikel();

  const alamat = [
    absoluteUrl("/sitemap-statis.xml"),
    ...Array.from({ length: bagian }, (_, i) => absoluteUrl(`/sitemap-artikel/${i + 1}.xml`)),
  ];

  return new Response(bangunIndex(alamat), { headers: HEADER_SITEMAP });
}
