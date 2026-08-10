import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getValidUserId } from "@/lib/sessionUser";
import { buatIlustrasi } from "@/lib/aiImage";
import { logActivity } from "@/lib/activityLog";

// Dua panggilan berantai (Groq menyusun prompt + generator merender gambar)
// jauh melewati batas bawaan Vercel Hobby (~10 dtk); 60 dtk = maksimum Hobby.
export const maxDuration = 60;

/**
 * POST /api/admin/ai/gambar — buat ilustrasi AI dari judul artikel, simpan
 * ke Media Library, kembalikan URL-nya. Pembatas laju per akun sudah
 * terpasang terpusat di middleware untuk seluruh /api/admin/ai/*.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { title, excerpt, orientasi } = await req.json();

    if (typeof title !== "string" || title.trim().length < 10) {
      return NextResponse.json(
        { error: "Isi judul artikel dulu (minimal 10 karakter) — ilustrasi dibuat dari judul." },
        { status: 400 }
      );
    }

    const orientasiFinal = orientasi === "potret" ? "potret" : "lanskap";
    const uploadedById = await getValidUserId();
    const hasil = await buatIlustrasi(
      title.trim(),
      typeof excerpt === "string" && excerpt.trim() ? excerpt.trim() : undefined,
      uploadedById,
      orientasiFinal
    );

    if (uploadedById) {
      await logActivity({
        userId: uploadedById,
        action: "MEDIA_UPLOAD",
        description: `Membuat ilustrasi AI${orientasiFinal === "potret" ? " (potret 4:5)" : ""} untuk "${title.trim().slice(0, 60)}"`,
      });
    }

    return NextResponse.json(hasil);
  } catch (err) {
    console.error("AI gambar error:", err);
    const pesan = err instanceof Error ? err.message : "Gagal membuat ilustrasi.";
    return NextResponse.json({ error: pesan }, { status: 502 });
  }
}
