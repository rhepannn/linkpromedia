import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rateLimit";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// POST /api/newsletter — daftar berlangganan newsletter
export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  // Cegah spam pendaftaran: maksimal 5 percobaan per IP tiap 10 menit
  if (!checkRateLimit(`newsletter:${ip}`, 5, 10 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Terlalu banyak percobaan. Coba lagi beberapa menit lagi." },
      { status: 429 }
    );
  }

  try {
    const { email } = await req.json();
    const cleanEmail = typeof email === "string" ? email.trim().toLowerCase() : "";

    if (!EMAIL_PATTERN.test(cleanEmail)) {
      return NextResponse.json({ error: "Format email tidak valid." }, { status: 400 });
    }

    const existing = await prisma.newsletterSubscriber.findUnique({ where: { email: cleanEmail } });

    if (existing) {
      if (!existing.isActive) {
        await prisma.newsletterSubscriber.update({
          where: { email: cleanEmail },
          data: { isActive: true, unsubscribedAt: null },
        });
        return NextResponse.json({ message: "Langganan kamu sudah diaktifkan kembali." });
      }
      // Jawaban sama dengan pendaftaran baru, supaya tidak membocorkan siapa saja yang terdaftar
      return NextResponse.json({ message: "Terima kasih! Email kamu sudah terdaftar." });
    }

    await prisma.newsletterSubscriber.create({ data: { email: cleanEmail } });
    return NextResponse.json({ message: "Terima kasih! Email kamu berhasil didaftarkan." }, { status: 201 });
  } catch (err) {
    console.error("Gagal mendaftar newsletter:", err);
    return NextResponse.json({ error: "Gagal mendaftarkan email." }, { status: 500 });
  }
}
