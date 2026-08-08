import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { makeVisitorId, detectSource } from "@/lib/analytics";
import { checkRateLimit } from "@/lib/rateLimit";

/**
 * POST /api/analytics — rekam satu kunjungan halaman.
 * Dipanggil dari browser pembaca; tidak butuh login.
 */
export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const userAgent = req.headers.get("user-agent") ?? "unknown";

    // Batasi supaya tidak bisa dibanjiri: 120 kunjungan per IP tiap 10 menit
    if (!checkRateLimit(`analytics:${ip}`, 120, 10 * 60 * 1000)) {
      return NextResponse.json({ ok: false }, { status: 429 });
    }

    const { path, sessionId, referrer } = await req.json();

    if (typeof path !== "string" || typeof sessionId !== "string" || !sessionId) {
      return NextResponse.json({ error: "Data tidak lengkap" }, { status: 400 });
    }

    const siteHost = new URL(req.nextUrl.origin).hostname;
    const source = detectSource(typeof referrer === "string" ? referrer : null, siteHost);

    // Kalau ini halaman artikel, cari artikelnya dari slug supaya statistik
    // per artikel ikut terkumpul tanpa perlu dikirim dari browser.
    let articleId: string | null = null;
    const match = path.match(/^\/berita\/([^/?#]+)/);
    if (match) {
      const article = await prisma.article.findUnique({
        where: { slug: decodeURIComponent(match[1]) },
        select: { id: true },
      });
      articleId = article?.id ?? null;
    }

    const view = await prisma.pageView.create({
      data: {
        visitorId: makeVisitorId(ip, userAgent),
        sessionId: sessionId.slice(0, 64),
        path: path.slice(0, 500),
        source,
        referrer: typeof referrer === "string" ? referrer.slice(0, 500) : null,
        articleId,
      },
      select: { id: true },
    });

    // Penghitung baca dinaikkan di sini, bukan saat halaman dirender, supaya
    // halaman artikel boleh disajikan dari cache tanpa mematikan hitungannya.
    if (articleId) {
      await prisma.article.update({
        where: { id: articleId },
        data: { viewCount: { increment: 1 } },
      });
    }

    return NextResponse.json({ viewId: view.id });
  } catch (err) {
    console.error("Gagal merekam kunjungan:", err);
    return NextResponse.json({ error: "Gagal merekam kunjungan" }, { status: 500 });
  }
}
