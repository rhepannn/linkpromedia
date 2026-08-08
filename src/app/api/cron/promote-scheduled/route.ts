import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Jadwal di vercel.json sengaja HARIAN ("0 0 * * *"), bukan tiap menit:
 * paket Vercel Hobby hanya mengizinkan cron sekali sehari — jadwal per menit
 * membuat deploy ditolak. Artikel terjadwal tetap terbit tepat waktu karena
 * promoteScheduledArticles() juga dipanggil setiap layout admin dimuat;
 * cron ini cuma jaring pengaman saat tidak ada admin yang membuka dashboard.
 * Kalau proyek naik ke paket Pro, jadwalnya boleh dikembalikan ke "* * * * *".
 */

export async function GET(req: NextRequest) {
  // Vercel Cron mengirim header "Authorization: Bearer <CRON_SECRET>" secara
  // otomatis kalau env CRON_SECRET diset. Tanpa pemeriksaan ini, siapa pun
  // yang tahu URL-nya bisa memicu query DB berulang kali (beban, bukan bocor
  // data — operasinya idempoten). Di dev tanpa CRON_SECRET, tetap diizinkan.
  const rahasia = process.env.CRON_SECRET;
  if (rahasia && req.headers.get("authorization") !== `Bearer ${rahasia}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [promoted, cleaned] = await Promise.all([
      prisma.article.updateMany({
        where: { status: "SCHEDULED", publishedAt: { lte: new Date() } },
        data: { status: "PUBLISHED" },
      }),
      prisma.pushSubscription.deleteMany({
        where: { lastSeenAt: { lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
      }),
    ]);
    return NextResponse.json({ promoted: promoted.count, staleSubscriptionsCleaned: cleaned.count });
  } catch (err) {
    console.error("Cron promote-scheduled error:", err);
    return NextResponse.json({ error: "Gagal memproses cron" }, { status: 500 });
  }
}
