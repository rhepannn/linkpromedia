import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const offset = Math.max(Number(req.nextUrl.searchParams.get("offset")) || 0, 0);
    const limit = Math.min(Math.max(Number(req.nextUrl.searchParams.get("limit")) || 20, 1), 50);
    const typeParam = req.nextUrl.searchParams.get("type");
    if (typeParam && !["breaking", "live", "semua"].includes(typeParam)) {
      return NextResponse.json({ error: "Tipe filter tidak valid" }, { status: 400 });
    }

    const typeFilter = typeParam === "breaking"
      ? { isBreaking: true }
      : typeParam === "live"
      ? { isLive: true }
      : {};

    const articles = await prisma.article.findMany({
      where: {
        AND: [
          {
            OR: [{ status: "PUBLISHED" }, { status: "SCHEDULED", publishedAt: { lte: new Date() } }],
          },
          { language: "id" },
          typeFilter,
        ],
      },
      orderBy: { publishedAt: "desc" },
      skip: offset,
      take: limit + 1,
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        thumbnailUrl: true,
        isBreaking: true,
        isLive: true,
        publishedAt: true,
        category: { select: { id: true, name: true, slug: true } },
        author: { select: { id: true, name: true } },
        _count: { select: { liveUpdates: true } },
      },
    });

    const hasMore = articles.length > limit;
    const hasil = articles.slice(0, limit).map((a) => ({
      id: a.id,
      title: a.title,
      slug: a.slug,
      excerpt: a.excerpt,
      thumbnailUrl: a.thumbnailUrl,
      publishedAt: a.publishedAt?.toISOString() ?? null,
      isBreaking: a.isBreaking,
      isLive: a.isLive,
      liveUpdateCount: a._count.liveUpdates,
      category: a.category,
      author: a.author,
      type: a.isBreaking ? "breaking" as const : a.isLive ? "live" as const : "article" as const,
    }));

    return NextResponse.json({
      entries: hasil,
      hasMore,
      nextOffset: hasMore ? offset + limit : null,
    });
  } catch (err) {
    console.error("Gagal mengambil kronologi:", err);
    return NextResponse.json({ error: "Gagal mengambil kronologi" }, { status: 500 });
  }
}
