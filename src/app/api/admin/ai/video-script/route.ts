import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { buatNaskahVideo } from "@/lib/videoScript";

// Panggilan AI atas artikel panjang bisa melewati batas bawaan Vercel Hobby
// (~10 dtk); 60 dtk = maksimum Hobby.
export const maxDuration = 60;

/**
 * POST /api/admin/ai/video-script — susun naskah adegan video dari artikel.
 *
 * Tidak menyimpan apa pun dan tidak membuat berkas video: perakitan videonya
 * dikerjakan di browser redaksi (canvas + MediaRecorder), jadi route ini
 * hanya mengembalikan data adegan untuk ditinjau lebih dulu.
 *
 * Pembatas laju sudah dipasang terpusat di middleware untuk /api/admin/ai/*.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { title, content } = await req.json();

    if (typeof content !== "string" || !content.trim()) {
      return NextResponse.json({ error: "Konten artikel kosong" }, { status: 400 });
    }

    const naskah = await buatNaskahVideo(typeof title === "string" ? title : "", content);

    if (!naskah) {
      return NextResponse.json(
        { error: "Artikel terlalu pendek untuk dijadikan video. Lengkapi isinya dulu." },
        { status: 422 }
      );
    }

    return NextResponse.json({ naskah });
  } catch (err) {
    console.error("AI video script error:", err);
    return NextResponse.json({ error: "Gagal menyusun naskah video" }, { status: 500 });
  }
}
