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

/**
 * Gaya ditempel mekanis DI DEPAN prompt, bukan diserahkan ke model: generator
 * memberi bobot terbesar ke kata-kata awal, dan tanpa kata gaya sama sekali
 * Flux jatuh ke foto realistis — persis yang dilarang etika redaksi. Kata
 * "minimalist"/"flat vector" sengaja dihindari: pada pengujian, gaya itu
 * menghapus hampir seluruh detail adegan.
 */
const GAYA_ILUSTRASI =
  "Editorial illustration, stylized digital painting, soft muted color palette, clean composition, no text: ";

async function buatPromptGambar(judul: string, ringkasan?: string): Promise<string> {
  const data = await askJson<{ prompt?: string }>(
    [
      "You describe news scenes for an illustrator, for an Indonesian news site's article thumbnails.",
      "From the headline and summary, extract the CONCRETE visual scene: the specific place,",
      "objects, weather, and activity mentioned in the news — not generic symbols.",
      "Produce ONE English scene description that:",
      "- names the real setting when the news gives one (city, landmark, environment) and",
      "  2-4 specific visual elements taken from the news itself;",
      "- shows people only from behind, from afar, or as silhouettes — never a recognizable",
      "  face or a real person's likeness;",
      "- avoids gore or victims even for disaster/crime news — show the place, objects,",
      "  or aftermath instead;",
      "- contains NO text, NO watermark, NO logos, and NO art-style words (style is added later).",
      "25 to 45 words.",
      'Reply ONLY with valid JSON: {"prompt": string}.',
    ].join(" "),
    `Headline: ${judul}\n${ringkasan ? `Summary: ${ringkasan}` : ""}`
  );

  const adegan = typeof data.prompt === "string" ? data.prompt.trim() : "";
  // Cadangan mekanis kalau model gagal — tetap aman walau kurang spesifik
  return GAYA_ILUSTRASI + (adegan || `a scene about ${judul}`);
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
