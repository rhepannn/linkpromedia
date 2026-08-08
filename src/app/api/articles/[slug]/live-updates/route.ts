import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface Params {
  params: Promise<{ slug: string }>;
}

/**
 * GET /api/articles/[slug]/live-updates — update kronologis untuk pembaca.
 *
 * Endpoint publik terpisah supaya halaman artikel boleh disajikan dari cache
 * tanpa membuat update langsung ikut basi: timeline mengambil datanya sendiri
 * dari sini setiap beberapa detik.
 */
export async function GET(_req: NextRequest, { params }: Params) {
  const { slug } = await params;

  try {
    const article = await prisma.article.findUnique({
      where: { slug },
      select: { id: true, isLive: true, status: true, publishedAt: true },
    });

    // Hanya artikel live yang sudah tayang yang boleh dibaca publik
    const tayang =
      article?.status === "PUBLISHED" ||
      (article?.status === "SCHEDULED" && !!article.publishedAt && article.publishedAt <= new Date());

    if (!article || !article.isLive || !tayang) {
      return NextResponse.json({ updates: [] });
    }

    const updates = await prisma.articleLiveUpdate.findMany({
      where: { articleId: article.id },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        content: true,
        createdAt: true,
        author: { select: { name: true } },
      },
    });

    return NextResponse.json({ updates });
  } catch (err) {
    console.error("Gagal mengambil update langsung:", err);
    return NextResponse.json({ updates: [] }, { status: 500 });
  }
}
