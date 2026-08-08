import { askJson, stripHtml, MIN_CONTENT_LENGTH } from "@/lib/ai";

/**
 * AI Video Article — tahap 1: memecah artikel jadi naskah adegan.
 *
 * Videonya dirakit di BROWSER (canvas + MediaRecorder), bukan di server dan
 * bukan lewat layanan render berbayar — jadi tahap ini cukup menghasilkan
 * data adegan, tidak menyentuh media sama sekali.
 *
 * Versi ini SENGAJA tanpa narasi suara. Text-to-speech yang hasilnya bisa
 * disimpan jadi berkas audio butuh API berbayar (lihat fitur_future.md),
 * sedangkan Web Speech API bawaan browser tidak bisa direkam ke video.
 * Video berita di media sosial mayoritas ditonton tanpa suara, jadi teks
 * layar sudah cukup untuk versi pertama.
 */

export interface AdeganVideo {
  /** Teks yang tampil di layar — sengaja pendek supaya terbaca di ponsel */
  teks: string;
  /** Lama adegan ini tampil */
  detik: number;
}

export interface NaskahVideo {
  /** Kalimat pembuka penarik perhatian */
  hook: string;
  adegan: AdeganVideo[];
  totalDetik: number;
}

/** Batas yang menjaga video tetap seukuran reels dan teksnya terbaca */
const MAKS_ADEGAN = 6;
const MIN_ADEGAN = 3;
/**
 * Ada batas BAWAH, bukan cuma atas. Tanpa itu model cenderung memecah kalimat
 * jadi potongan 3-4 kata ("per Dolar AS") yang bukan pernyataan utuh, dan
 * videonya jadi terasa patah-patah saat ditonton.
 */
const MIN_KATA_PER_ADEGAN = 6;
const MAKS_KATA_PER_ADEGAN = 14;
const DETIK_MIN = 2;
const DETIK_MAKS = 6;

/**
 * Memotong teks yang terlalu panjang di batas kata terdekat. Adegan yang
 * kepanjangan bukan sekadar jelek — teksnya tidak akan muat di layar ponsel
 * dan terpotong saat dirender.
 */
function potongKata(teks: string, maksKata: number): string {
  const kata = teks.trim().split(/\s+/);
  if (kata.length <= maksKata) return teks.trim();
  return kata.slice(0, maksKata).join(" ");
}

function angkaAman(nilai: unknown, bawaan: number): number {
  const n = typeof nilai === "number" ? nilai : Number(nilai);
  if (!Number.isFinite(n)) return bawaan;
  return Math.min(Math.max(Math.round(n), DETIK_MIN), DETIK_MAKS);
}

export async function buatNaskahVideo(judul: string, konten: string): Promise<NaskahVideo | null> {
  const teks = stripHtml(konten).slice(0, 5000);
  if (teks.length < MIN_CONTENT_LENGTH) return null;

  const data = await askJson<{ hook?: string; adegan?: { teks?: string; detik?: number }[] }>(
    [
      "Kamu adalah editor video berita Indonesia yang membuat naskah reels vertikal dari artikel.",
      "",
      "ATURAN MUTLAK — melanggar ini berarti gagal:",
      "1. SELURUH fakta, angka, nama, dan tempat HARUS berasal dari ARTIKEL di bawah.",
      "2. DILARANG KERAS menambah angka, statistik, atau detail yang tidak tertulis di artikel.",
      "3. Dilarang mengarang kutipan.",
      "4. Kalau artikelnya pendek, buat adegan sedikit saja. JANGAN dipanjangkan dengan karangan.",
      "",
      "BENTUK NASKAH:",
      `- Buat ${MIN_ADEGAN}-${MAKS_ADEGAN} adegan. Tiap adegan = satu kartu teks di layar.`,
      `- "teks" tiap adegan ${MIN_KATA_PER_ADEGAN}-${MAKS_KATA_PER_ADEGAN} kata. Ini teks di layar`,
      "  ponsel, bukan paragraf — kalimat pendek, langsung ke inti, tanpa anak kalimat berlapis.",
      "- TIAP adegan WAJIB berupa pernyataan UTUH yang bisa berdiri sendiri, bukan potongan",
      '  kalimat. CONTOH SALAH (dilarang): "per Dolar AS", "Presiden Prabowo", "Target dagang naik".',
      '  CONTOH BENAR: "Rupiah menguat ke Rp15.800 per dolar AS",',
      '  "Lima orang meninggal dalam kebakaran kapal itu".',
      "- Urutkan seperti berita: fakta terpenting di adegan pertama, detail menyusul.",
      `- "detik" adalah lama adegan tampil, antara ${DETIK_MIN}-${DETIK_MAKS}. Adegan berteks`,
      "  lebih panjang diberi waktu lebih lama supaya sempat dibaca.",
      `- "hook" adalah kalimat pembuka penarik perhatian, MAKSIMAL 8 kata, dan tetap`,
      "  berdasarkan isi artikel — bukan clickbait yang menjanjikan hal di luar artikel.",
      "- Bahasa Indonesia baku dan lugas. Tanpa emoji, tanpa tagar.",
      "",
      'Balas HANYA JSON valid: {"hook": string, "adegan": [{"teks": string, "detik": number}]}.',
    ].join(" "),
    `Judul: ${judul}\n\nArtikel:\n${teks}`
  );

  const mentah = Array.isArray(data.adegan) ? data.adegan : [];

  // Backstop di level kode: model sering melewati batas jumlah kata meski
  // sudah diminta di prompt. Kalau dibiarkan, teksnya terpotong saat dirender
  // di canvas — jadi dipangkas di sini, bukan sekadar diharapkan patuh.
  const adegan: AdeganVideo[] = mentah
    .filter((a) => typeof a?.teks === "string" && a.teks.trim().length > 0)
    .slice(0, MAKS_ADEGAN)
    .map((a) => ({
      teks: potongKata(a.teks as string, MAKS_KATA_PER_ADEGAN),
      detik: angkaAman(a.detik, 3),
    }));

  if (adegan.length < MIN_ADEGAN) return null;

  const hook = typeof data.hook === "string" && data.hook.trim()
    ? potongKata(data.hook, 8)
    : potongKata(judul, 8);

  return {
    hook,
    adegan,
    totalDetik: adegan.reduce((t, a) => t + a.detik, 0),
  };
}
