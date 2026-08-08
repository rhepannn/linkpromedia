import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { detectDuplicates } from "@/lib/ai";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { title, content, excludeId } = await req.json();
    if (!content?.trim()) return NextResponse.json({ error: "Konten kosong" }, { status: 400 });

    // Duplikasi liputan biasanya terjadi pada berita berdekatan waktunya,
    // jadi cukup periksa 90 hari terakhir
    const sejak = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    const kandidat = await prisma.article.findMany({
      where: {
        status: { in: ["PUBLISHED", "SCHEDULED", "IN_REVIEW"] },
        createdAt: { gte: sejak },
        ...(typeof excludeId === "string" && excludeId ? { id: { not: excludeId } } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: { slug: true, title: true, excerpt: true },
    });

    const matches = await detectDuplicates(title ?? "", content, kandidat);
    return NextResponse.json({ matches, diperiksa: kandidat.length });
  } catch (err) {
    console.error("AI duplicate detection error:", err);
    return NextResponse.json({ error: "Gagal memeriksa duplikasi" }, { status: 500 });
  }
}
