import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

const PUSH_SERVICE_PATTERNS = [
  /^https:\/\/fcm\.googleapis\.com\//,
  /^https:\/\/updates\.push\.services\.mozilla\.com\//,
  /^https:\/\/.*\.notify\.windows\.com\//,
  /^https:\/\/.*\.push\.apple\.com\//,
  /^https:\/\/wns2-.*\.send\.windows\.com\//,
];

function isValidPushEndpoint(endpoint: string): boolean {
  return PUSH_SERVICE_PATTERNS.some((p) => p.test(endpoint));
}

/**
 * POST /api/push/subscribe — daftarkan perangkat untuk menerima Breaking News.
 *
 * Endpoint publik (pembaca tidak perlu akun). Yang disimpan hanya alamat
 * push dari browser + kunci enkripsinya — tidak ada email, nama, atau IP.
 */
export async function POST(req: NextRequest) {
  const boleh = checkRateLimit(`push-subscribe:${getClientIp(req)}`, 10, 60_000);
  if (!boleh) {
    return NextResponse.json({ error: "Terlalu banyak permintaan." }, { status: 429 });
  }

  try {
    const { endpoint, keys } = await req.json();

    if (typeof endpoint !== "string" || !endpoint.startsWith("https://")) {
      return NextResponse.json({ error: "Endpoint tidak valid" }, { status: 400 });
    }
    if (!isValidPushEndpoint(endpoint)) {
      return NextResponse.json({ error: "Endpoint tidak dikenali" }, { status: 400 });
    }
    if (!keys?.p256dh || !keys?.auth) {
      return NextResponse.json({ error: "Kunci langganan tidak lengkap" }, { status: 400 });
    }

    // upsert: browser bisa memperbarui kunci untuk endpoint yang sama
    await prisma.pushSubscription.upsert({
      where: { endpoint },
      update: { p256dh: keys.p256dh, auth: keys.auth, lastSeenAt: new Date() },
      create: { endpoint, p256dh: keys.p256dh, auth: keys.auth },
    });

    return NextResponse.json({ message: "Notifikasi diaktifkan." }, { status: 201 });
  } catch (err) {
    console.error("Gagal mendaftarkan push:", err);
    return NextResponse.json({ error: "Gagal mengaktifkan notifikasi" }, { status: 500 });
  }
}

/** DELETE — cabut langganan perangkat ini */
export async function DELETE(req: NextRequest) {
  try {
    const { endpoint } = await req.json();
    if (typeof endpoint !== "string") {
      return NextResponse.json({ error: "Endpoint tidak valid" }, { status: 400 });
    }

    await prisma.pushSubscription.deleteMany({ where: { endpoint } });
    return NextResponse.json({ message: "Notifikasi dimatikan." });
  } catch {
    return NextResponse.json({ error: "Gagal mematikan notifikasi" }, { status: 500 });
  }
}
