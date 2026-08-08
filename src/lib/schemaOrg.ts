import { absoluteUrl } from "@/lib/utils";
import type { Article } from "@/types";

const SITE_NAME = "LinkProMedia";
const PUBLISHER = {
  "@type": "NewsMediaOrganization",
  name: SITE_NAME,
  url: absoluteUrl(""),
  logo: {
    "@type": "ImageObject",
    // Berkas statis di public/ — rute /icon lama (generator ikon) sudah
    // dihapus saat logo merek dipasang, jadi jangan ditunjuk lagi
    url: absoluteUrl("/icon-512.png"),
  },
  parentOrganization: {
    "@type": "Organization",
    name: "Link Productive",
  },
};

/** Data terstruktur untuk situs secara keseluruhan (dipasang di beranda) */
export function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      { "@context": undefined, ...PUBLISHER, "@id": absoluteUrl("/#organization") },
      {
        "@type": "WebSite",
        "@id": absoluteUrl("/#website"),
        url: absoluteUrl(""),
        name: SITE_NAME,
        inLanguage: "id-ID",
        publisher: { "@id": absoluteUrl("/#organization") },
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: `${absoluteUrl("/cari")}?q={search_term_string}`,
          },
          "query-input": "required name=search_term_string",
        },
      },
    ],
  };
}

/** Data terstruktur NewsArticle + remah roti untuk halaman artikel */
export function newsArticleSchema(article: Article, summaryPoints: string[]) {
  const url = absoluteUrl(`/berita/${article.slug}`);
  const description =
    article.metaDescription ??
    article.excerpt ??
    summaryPoints[0] ??
    article.content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 160);

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "NewsArticle",
        "@id": `${url}#article`,
        headline: article.title.slice(0, 110),
        description,
        url,
        mainEntityOfPage: { "@type": "WebPage", "@id": url },
        inLanguage: "id-ID",
        articleSection: article.category.name,
        ...(article.publishedAt && { datePublished: new Date(article.publishedAt).toISOString() }),
        dateModified: new Date(article.updatedAt).toISOString(),
        author: {
          "@type": "Person",
          name: article.author.name,
        },
        publisher: PUBLISHER,
        // Google mensyaratkan "image" agar artikel memenuhi syarat hasil kaya
        // (Top Stories). Artikel tanpa thumbnail memakai gambar berlogo
        // bawaan situs, bukan menghilangkan field-nya sama sekali.
        image: {
          "@type": "ImageObject",
          url: article.thumbnailUrl?.trim() || absoluteUrl("/opengraph-image"),
          width: 1200,
          height: 630,
        },
        ...(article.tags?.length && {
          keywords: article.tags.map((t) => t.tag.name).join(", "),
        }),
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${url}#breadcrumb`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Beranda", item: absoluteUrl("") },
          {
            "@type": "ListItem",
            position: 2,
            name: article.category.name,
            item: absoluteUrl(`/kategori/${article.category.slug}`),
          },
          { "@type": "ListItem", position: 3, name: article.title, item: url },
        ],
      },
    ],
  };
}
