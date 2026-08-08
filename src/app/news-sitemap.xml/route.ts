import { prisma } from "@/lib/prisma";
import { absoluteUrl, MIN_INDEXABLE_WORDS } from "@/lib/utils";

export const revalidate = 900; // segarkan tiap 15 menit

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * GET /news-sitemap.xml — sitemap khusus Google News.
 * Google News hanya menerima artikel 2 hari terakhir, maksimal 1.000 URL.
 */
export async function GET() {
  const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);

  const articles = await prisma.article.findMany({
    where: {
      status: "PUBLISHED",
      publishedAt: { gte: twoDaysAgo, lte: new Date() },
      wordCount: { gte: MIN_INDEXABLE_WORDS },
    },
    orderBy: { publishedAt: "desc" },
    take: 1000,
    select: {
      slug: true,
      title: true,
      publishedAt: true,
      tags: { select: { tag: { select: { name: true } } } },
    },
  });

  const urls = articles
    .map((a) => {
      const keywords = a.tags.map((t) => t.tag.name).join(", ");
      return `  <url>
    <loc>${absoluteUrl(`/berita/${a.slug}`)}</loc>
    <news:news>
      <news:publication>
        <news:name>LinkProMedia</news:name>
        <news:language>id</news:language>
      </news:publication>
      <news:publication_date>${a.publishedAt!.toISOString()}</news:publication_date>
      <news:title>${escapeXml(a.title)}</news:title>
      ${keywords ? `<news:keywords>${escapeXml(keywords)}</news:keywords>` : ""}
    </news:news>
  </url>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${urls}
</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=900, s-maxage=900",
    },
  });
}
