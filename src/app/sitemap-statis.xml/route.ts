import { getCategories } from "@/lib/categories";
import { absoluteUrl } from "@/lib/utils";
import { bangunUrlset, HEADER_SITEMAP } from "@/lib/sitemap";

export const revalidate = 3600;

/** GET /sitemap-statis.xml — beranda & halaman kategori (jumlahnya selalu kecil, tidak perlu dipecah) */
export async function GET() {
  const categories = await getCategories();

  const entri = [
    { loc: absoluteUrl(""), changefreq: "hourly", priority: 1.0 },
    { loc: absoluteUrl("/kronologi"), changefreq: "daily", priority: 0.7 },
    { loc: absoluteUrl("/tentang"), changefreq: "monthly", priority: 0.3 },
    { loc: absoluteUrl("/redaksi"), changefreq: "monthly", priority: 0.3 },
    { loc: absoluteUrl("/pedoman-media"), changefreq: "monthly", priority: 0.3 },
    { loc: absoluteUrl("/kebijakan-privasi"), changefreq: "monthly", priority: 0.3 },
    ...categories.map((cat) => ({
      loc: absoluteUrl(`/kategori/${cat.slug}`),
      changefreq: "daily" as const,
      priority: 0.6,
    })),
  ];

  return new Response(bangunUrlset(entri), { headers: HEADER_SITEMAP });
}
