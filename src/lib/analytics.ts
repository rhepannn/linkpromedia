import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";

/**
 * Sidik pengunjung yang anonim.
 *
 * IP & user agent TIDAK disimpan — hanya hasil hash-nya, dan hash itu diberi
 * "garam" tanggal sehingga berganti setiap hari. Cukup untuk menghitung
 * pengunjung unik harian, tapi tidak bisa dipakai melacak orang antar hari.
 */
export function makeVisitorId(ip: string, userAgent: string): string {
  const today = new Date().toISOString().slice(0, 10);
  const secret = process.env.AUTH_SECRET ?? "linkpromedia";
  return createHash("sha256").update(`${ip}|${userAgent}|${today}|${secret}`).digest("hex").slice(0, 32);
}

/** Kelompokkan asal kunjungan dari header referrer */
export function detectSource(referrer: string | null, siteHost: string): string {
  if (!referrer) return "langsung";

  let host: string;
  try {
    host = new URL(referrer).hostname.replace(/^www\./, "");
  } catch {
    return "langsung";
  }

  if (host === siteHost.replace(/^www\./, "")) return "internal";
  if (/google\./.test(host)) return "google";
  if (/bing\.|duckduckgo\.|yahoo\./.test(host)) return "mesin pencari lain";
  if (/facebook\.|fb\.|instagram\./.test(host)) return "facebook/instagram";
  if (/twitter\.|x\.com|t\.co/.test(host)) return "x (twitter)";
  if (/whatsapp\.|wa\.me/.test(host)) return "whatsapp";
  if (/tiktok\./.test(host)) return "tiktok";
  if (/youtube\.|youtu\.be/.test(host)) return "youtube";
  if (/t\.me|telegram\./.test(host)) return "telegram";
  return "rujukan lain";
}

export interface AnalyticsSummary {
  totalViews: number;
  uniqueVisitors: number;
  avgReadSeconds: number;
  bounceRate: number;
  sources: { source: string; count: number }[];
  topArticles: { title: string; slug: string; views: number; avgSeconds: number }[];
  dailyViews: { date: string; views: number }[];
  byCategory: { name: string; views: number; articles: number }[];
  byAuthor: { name: string; views: number; articles: number }[];
}

/** Kumpulkan seluruh statistik untuk rentang beberapa hari terakhir */
export async function getAnalyticsSummary(days = 30): Promise<AnalyticsSummary> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const where = { createdAt: { gte: since } };

  const [totalViews, uniqueVisitorRows, sessionGroups, sourceGroups, articleGroups, views] =
    await Promise.all([
      prisma.pageView.count({ where }),
      prisma.pageView.findMany({ where, distinct: ["visitorId"], select: { visitorId: true } }),
      prisma.pageView.groupBy({ by: ["sessionId"], where, _count: { id: true } }),
      prisma.pageView.groupBy({ by: ["source"], where, _count: { id: true } }),
      prisma.pageView.groupBy({
        by: ["articleId"],
        where: { ...where, articleId: { not: null } },
        _count: { id: true },
        _avg: { duration: true },
        orderBy: { _count: { id: "desc" } },
        take: 10,
      }),
      prisma.pageView.findMany({
        where: { ...where, duration: { gt: 0 } },
        select: { duration: true },
      }),
    ]);

  // Rata-rata waktu baca — hanya dari kunjungan yang durasinya sempat terekam
  const avgReadSeconds =
    views.length > 0 ? Math.round(views.reduce((sum, v) => sum + v.duration, 0) / views.length) : 0;

  // Bounce = sesi yang hanya membuka satu halaman lalu pergi
  const bounced = sessionGroups.filter((s) => s._count.id === 1).length;
  const bounceRate = sessionGroups.length > 0 ? Math.round((bounced / sessionGroups.length) * 100) : 0;

  // Ambil judul artikel terpopuler
  const articleIds = articleGroups.map((g) => g.articleId!).filter(Boolean);
  const articles = articleIds.length
    ? await prisma.article.findMany({
        where: { id: { in: articleIds } },
        select: { id: true, title: true, slug: true },
      })
    : [];
  const articleMap = new Map(articles.map((a) => [a.id, a]));

  const topArticles = articleGroups
    .map((g) => {
      const article = articleMap.get(g.articleId!);
      if (!article) return null;
      return {
        title: article.title,
        slug: article.slug,
        views: g._count.id,
        avgSeconds: Math.round(g._avg.duration ?? 0),
      };
    })
    .filter((a): a is NonNullable<typeof a> => a !== null);

  // Grafik kunjungan harian. Hari TANPA kunjungan wajib ikut muncul dengan
  // nilai 0 — kalau cuma hari yang punya data yang dimasukkan, sumbu waktunya
  // jadi tidak linear (dua hari yang terpaut seminggu tampil bersebelahan
  // seolah berurutan), dan grafik garis/area membaca itu sebagai kenaikan
  // padahal sebenarnya ada hari-hari kosong di antaranya.
  const daily = await prisma.pageView.findMany({ where, select: { createdAt: true } });
  const dayMap = new Map<string, number>();
  for (const v of daily) {
    const key = v.createdAt.toISOString().slice(0, 10);
    dayMap.set(key, (dayMap.get(key) ?? 0) + 1);
  }
  const dailyViews: { date: string; views: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const tgl = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    dailyViews.push({ date: tgl, views: dayMap.get(tgl) ?? 0 });
  }

  // Performa per kategori & per penulis — kunjungan artikel dikelompokkan
  // lewat relasi artikelnya
  const articleViews = await prisma.pageView.findMany({
    where: { ...where, articleId: { not: null } },
    select: {
      articleId: true,
      article: {
        select: {
          category: { select: { name: true } },
          author: { select: { name: true } },
        },
      },
    },
  });

  const catViews = new Map<string, { views: number; articles: Set<string> }>();
  const authorViews = new Map<string, { views: number; articles: Set<string> }>();

  for (const v of articleViews) {
    if (!v.article || !v.articleId) continue;

    const cat = v.article.category.name;
    const catEntry = catViews.get(cat) ?? { views: 0, articles: new Set<string>() };
    catEntry.views += 1;
    catEntry.articles.add(v.articleId);
    catViews.set(cat, catEntry);

    const author = v.article.author.name;
    const authorEntry = authorViews.get(author) ?? { views: 0, articles: new Set<string>() };
    authorEntry.views += 1;
    authorEntry.articles.add(v.articleId);
    authorViews.set(author, authorEntry);
  }

  const toSortedList = (map: Map<string, { views: number; articles: Set<string> }>) =>
    Array.from(map.entries())
      .map(([name, v]) => ({ name, views: v.views, articles: v.articles.size }))
      .sort((a, b) => b.views - a.views);

  return {
    totalViews,
    uniqueVisitors: uniqueVisitorRows.length,
    avgReadSeconds,
    bounceRate,
    byCategory: toSortedList(catViews),
    byAuthor: toSortedList(authorViews),
    sources: sourceGroups
      .map((g) => ({ source: g.source, count: g._count.id }))
      .sort((a, b) => b.count - a.count),
    topArticles,
    dailyViews,
  };
}
