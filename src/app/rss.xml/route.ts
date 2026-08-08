import { getPublishedArticles } from "@/lib/articles";
import { absoluteUrl } from "@/lib/utils";

export const revalidate = 900; // segarkan tiap 15 menit

/** Lolos-kan karakter yang punya arti khusus di XML */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

// GET /rss.xml — feed untuk aplikasi pembaca RSS & layanan agregator
export async function GET() {
  const articles = await getPublishedArticles(50);
  const siteUrl = absoluteUrl("");

  const items = articles
    .map((a) => {
      const url = absoluteUrl(`/berita/${a.slug}`);
      const description = a.excerpt ?? stripHtml(a.title);
      const pubDate = a.publishedAt ? new Date(a.publishedAt).toUTCString() : "";

      return `    <item>
      <title>${escapeXml(a.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <description>${escapeXml(description)}</description>
      <category>${escapeXml(a.category.name)}</category>
      <dc:creator>${escapeXml(a.author.name)}</dc:creator>
      ${pubDate ? `<pubDate>${pubDate}</pubDate>` : ""}
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>LinkProMedia</title>
    <link>${siteUrl}</link>
    <description>Berita terkini dan terpercaya dari LinkProMedia</description>
    <language>id-ID</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${absoluteUrl("/rss.xml")}" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=900, s-maxage=900",
    },
  });
}
