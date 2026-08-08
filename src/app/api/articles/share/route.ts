import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rateLimit";

/**
 * POST /api/articles/share — catat bahwa sebuah artikel dibagikan.
 *
 * Dipakai sebagai salah satu sinyal peringkat tren: berita yang dibagikan
 * menandakan minat lebih kuat daripada sekadar dibuka.
 */
export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  // Cegah angka share digelembungkan dengan klik berulang
  if (!checkRateLimit(`share:${ip}`, 30, 10 * 60 * 1000)) {
    return NextResponse.json({ ok: false }, { status: 429 });
  }

  try {
    const { slug } = await req.json();
    if (typeof slug !== "string" || !slug) {
      return NextResponse.json({ error: "Slug tidak valid" }, { status: 400 });
    }

    await prisma.article.updateMany({
      where: { slug },
      data: { shareCount: { increment: 1 } },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Gagal mencatat share:", err);
    return NextResponse.json({ error: "Gagal mencatat share" }, { status: 500 });
  }
}
