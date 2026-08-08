import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { suggestInternalLinks } from "@/lib/ai";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { content, excludeId } = await req.json();
    if (!content?.trim()) return NextResponse.json({ error: "Konten kosong" }, { status: 400 });

    // Kandidat: artikel terbit lainnya, dibatasi 30 terbaru supaya
    // permintaan ke AI tetap ringan
    const kandidat = await prisma.article.findMany({
      where: {
        status: "PUBLISHED",
        ...(typeof excludeId === "string" && excludeId ? { id: { not: excludeId } } : {}),
      },
      orderBy: { publishedAt: "desc" },
      take: 30,
      select: { slug: true, title: true, excerpt: true },
    });

    const links = await suggestInternalLinks(content, kandidat);
    return NextResponse.json({ links });
  } catch (err) {
    console.error("AI internal links error:", err);
    return NextResponse.json({ error: "Gagal menyarankan tautan internal" }, { status: 500 });
  }
}
