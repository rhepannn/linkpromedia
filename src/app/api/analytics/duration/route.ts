import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/analytics/duration — catat lama pembaca berada di halaman.
 *
 * Dipakai lewat navigator.sendBeacon (yang selalu POST), sehingga tetap
 * terkirim walau pembaca sudah menutup tab.
 */
export async function POST(req: NextRequest) {
  try {
    const { viewId, duration } = await req.json();

    if (typeof viewId !== "string" || typeof duration !== "number") {
      return NextResponse.json({ error: "Data tidak lengkap" }, { status: 400 });
    }

    // Batasi 2 jam supaya tab yang ditinggal terbuka semalaman
    // tidak merusak rata-rata waktu baca
    const safeDuration = Math.min(Math.max(Math.round(duration), 0), 7200);

    await prisma.pageView.update({
      where: { id: viewId },
      data: { duration: safeDuration },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Gagal mencatat durasi baca:", err);
    return NextResponse.json({ error: "Gagal mencatat durasi" }, { status: 500 });
  }
}
