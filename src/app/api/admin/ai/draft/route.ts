import { NextRequest, NextResponse } from "next/server";
import { draftArticleFromSource, suggestCategory, pesanErrorAi, type JenisBahan } from "@/lib/ai";
import { getSessionActor } from "@/lib/sessionRole";
import { prisma } from "@/lib/prisma";

const JENIS_VALID: JenisBahan[] = [
  "siaran-pers",
  "catatan-lapangan",
  "data",
  "dokumen",
  "kutipan-media",
  "riset-web",
];

// Dua panggilan AI berantai (susun draf lalu pilih kategori) bisa melewati
// batas bawaan Vercel Hobby (~10 dtk); 60 dtk = maksimum Hobby.
export const maxDuration = 60;

/**
 * Ambang keyakinan untuk MEMILIHKAN kategori secara otomatis. suggestCategory
 * sendiri sudah membuang saran di bawah 40, tapi untuk mengisi form tanpa
 * ditanya perlu keyakinan lebih tinggi — salah kategori otomatis lebih
 * merepotkan daripada kolom yang dibiarkan kosong untuk dipilih penulis.
 */
const AMBANG_PILIH_OTOMATIS = 70;

/**
 * POST /api/admin/ai/draft — susun draf artikel dari bahan yang dikirim redaksi.
 * Tidak menyimpan apa pun; hasilnya dikembalikan untuk ditinjau lebih dulu.
 */
export async function POST(req: NextRequest) {
  const actor = await getSessionActor();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { bahan, jenis, arahan } = await req.json();

    if (typeof bahan !== "string" || bahan.trim().length < 250) {
      return NextResponse.json(
        { error: "Bahan terlalu sedikit. Tempel minimal beberapa paragraf agar AI punya cukup fakta." },
        { status: 400 }
      );
    }

    const jenisBahan: JenisBahan = JENIS_VALID.includes(jenis) ? jenis : "catatan-lapangan";
    const draf = await draftArticleFromSource(bahan, jenisBahan, typeof arahan === "string" ? arahan : undefined);

    if (!draf) {
      return NextResponse.json({ error: "AI tidak berhasil menyusun draf dari bahan ini." }, { status: 422 });
    }

    // Sekalian pilihkan kategorinya supaya penulis tidak perlu menebak sendiri
    // setelah draf jadi. Kegagalan di sini tidak boleh menggagalkan draf —
    // kolom kategori tinggal dibiarkan kosong untuk dipilih manual.
    let kategori: { id: string; nama: string; yakin: number } | null = null;
    try {
      const daftar = await prisma.category.findMany({ select: { id: true, name: true, slug: true } });
      const saran = await suggestCategory(draf.title, draf.content, daftar);
      const teratas = saran[0];
      if (teratas && teratas.yakin >= AMBANG_PILIH_OTOMATIS) {
        const cocok = daftar.find((c) => c.slug === teratas.slug);
        if (cocok) kategori = { id: cocok.id, nama: cocok.name, yakin: teratas.yakin };
      }
    } catch (err) {
      console.error("Gagal menyarankan kategori untuk draf:", err);
    }

    return NextResponse.json({ draf, kategori });
  } catch (err) {
    console.error("AI draft error:", err);
    const pesanKuota = pesanErrorAi(err);
    return NextResponse.json(
      { error: pesanKuota ?? "Gagal menyusun draf artikel" },
      { status: pesanKuota ? 429 : 500 }
    );
  }
}
