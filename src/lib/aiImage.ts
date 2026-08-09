import { askJson } from "@/lib/ai";
import { prisma } from "@/lib/prisma";
import { supabaseAdmin, THUMBNAIL_BUCKET } from "@/lib/supabaseAdmin";

/**
 * Ilustrasi AI untuk thumbnail artikel.
 *
 * Penyedia: Pollinations (image.pollinations.ai) — generator gambar gratis
 * tanpa API key, berbasis model Flux. Dipilih karena satu-satunya opsi tanpa
 * biaya & tanpa pendaftaran; konsekuensinya layanan komunitas seperti ini
 * bisa lambat atau mati sewaktu-waktu, jadi SEMUA kegagalan di sini harus
 * berujung pesan yang jelas, bukan menggantung.
 *
 * Etika redaksi yang dipagari lewat prompt:
 * - Gambar bergaya ILUSTRASI editorial, bukan meniru foto jurnalistik —
 *   pembaca tidak boleh terkecoh mengira ini foto peristiwa sungguhan.
 * - Dilarang menampilkan wajah tokoh nyata.
 * - Tanpa teks/tulisan di gambar (model gagal menulis dengan benar).
 * Hasilnya disimpan ke Media Library dengan awalan "ai-ilustrasi-" supaya
 * selalu bisa dibedakan dari foto asli.
 */

const BATAS_WAKTU_MS = 45_000;
const MAKS_BYTE = 5 * 1024 * 1024;
const LEBAR = 1200;
const TINGGI = 750; // rasio 16:10, sama dengan kartu artikel

async function buatPromptGambar(judul: string, ringkasan?: string): Promise<string> {
  const data = await askJson<{ prompt?: string }>(
    [
      "You write prompts for an image generator, for an Indonesian news site's article thumbnails.",
      "Given a news headline (and optional summary), produce ONE English image prompt that:",
      "- depicts the TOPIC as a tasteful editorial ILLUSTRATION (clean, modern, muted colors),",
      "  never as a fake news photograph;",
      "- contains NO text, NO watermark, NO logos;",
      "- contains NO recognizable real person or their likeness — use objects, places,",
      "  silhouettes, or symbolic imagery instead;",
      "- avoids gore or graphic depiction of victims even for disaster/crime news —",
      "  show the location, objects, or aftermath symbolically.",
      "Maximum 40 words.",
      'Reply ONLY with valid JSON: {"prompt": string}.',
    ].join(" "),
    `Headline: ${judul}\n${ringkasan ? `Summary: ${ringkasan}` : ""}`
  );

  const hasil = typeof data.prompt === "string" ? data.prompt.trim() : "";
  // Cadangan mekanis kalau model gagal — tetap aman walau kurang spesifik
  return hasil || `editorial illustration about ${judul}, clean modern style, muted colors, no text`;
}

export interface HasilIlustrasi {
  url: string;
  promptDipakai: string;
}

export async function buatIlustrasi(
  judul: string,
  ringkasan: string | undefined,
  uploadedById: string | null
): Promise<HasilIlustrasi> {
  const prompt = await buatPromptGambar(judul, ringkasan);

  // "nologo" menghilangkan watermark penyedia; seed acak supaya dua artikel
  // berjudul mirip tidak mendapat gambar kembar
  const seed = Math.floor(Math.random() * 1_000_000);
  const urlGenerator =
    `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}` +
    `?width=${LEBAR}&height=${TINGGI}&nologo=true&seed=${seed}`;

  const pembatal = new AbortController();
  const timer = setTimeout(() => pembatal.abort(), BATAS_WAKTU_MS);
  let respons: Response;
  try {
    respons = await fetch(urlGenerator, { signal: pembatal.signal, cache: "no-store" });
  } catch {
    throw new Error("Layanan gambar tidak merespons. Coba lagi sebentar lagi.");
  } finally {
    clearTimeout(timer);
  }

  if (!respons.ok) {
    throw new Error("Layanan gambar sedang bermasalah. Coba lagi sebentar lagi.");
  }

  const buffer = Buffer.from(await respons.arrayBuffer());

  // Validasi isi sungguhan, bukan cuma header respons: layanan gratis kadang
  // mengirim halaman error HTML dengan status 200
  const jpegValid = buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (!jpegValid || buffer.length < 5_000 || buffer.length > MAKS_BYTE) {
    throw new Error("Hasil dari layanan gambar tidak valid. Coba lagi.");
  }

  const filename = `ai-ilustrasi-${Date.now()}-${crypto.randomUUID()}.jpg`;

  const { error: uploadError } = await supabaseAdmin.storage
    .from(THUMBNAIL_BUCKET)
    .upload(filename, buffer, { contentType: "image/jpeg", cacheControl: "31536000" });
  if (uploadError) {
    console.error("Gagal simpan ilustrasi AI:", uploadError);
    throw new Error("Gambar berhasil dibuat tapi gagal disimpan ke penyimpanan.");
  }

  const { data } = supabaseAdmin.storage.from(THUMBNAIL_BUCKET).getPublicUrl(filename);

  await prisma.media.create({
    data: {
      url: data.publicUrl,
      filename,
      mimeType: "image/jpeg",
      size: buffer.length,
      uploadedById,
    },
  });

  return { url: data.publicUrl, promptDipakai: prompt };
}
