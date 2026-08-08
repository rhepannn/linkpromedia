import { askJson } from "@/lib/ai";

/**
 * AI Newsroom Assistant — router bahasa alami ke tools AI yang sudah ada.
 *
 * Fungsinya HANYA memilah: apakah pesan ini permintaan alat redaksi tertentu
 * (yang punya fungsi khusus sudah teruji di src/lib/ai.ts), atau obrolan biasa?
 *
 * Alat redaksi dipakai kalau cocok, karena hasilnya terstruktur dan bisa
 * langsung diterapkan ke artikel. Selebihnya jatuh ke "obrolan" dan dijawab
 * bebas oleh model (lihat obrolanBebas di src/lib/ai.ts) — jadi asisten ini
 * tetap bisa menjawab pertanyaan apa pun seperti chatbot pada umumnya.
 *
 * "belum-tersedia" sengaja disisakan HANYA untuk satu aturan keras: AI tidak
 * boleh menulis draf artikel siap terbit dari sekadar topik. Aturan itu
 * ditegakkan di dua lapis (di sini dan di prompt obrolan bebas), karena
 * mengandalkan kepatuhan model saja tidak pernah cukup.
 */
export type ChatIntent =
  | "headlines"
  | "seo"
  | "summary"
  | "summary-variants"
  | "tags"
  | "grammar"
  | "category"
  | "internal-links"
  | "duplicates"
  | "thumbnail"
  | "breaking"
  | "timeline"
  | "translate"
  | "fact-check"
  | "writing"
  | "news-discovery"
  | "belum-tersedia"
  | "obrolan";

export interface HasilKlasifikasi {
  intent: ChatIntent;
  /** Balasan langsung untuk intent "belum-tersedia"/"obrolan" — tidak dipakai intent lain */
  catatan?: string;
  /** Hanya diisi kalau intent === "translate" */
  bahasaTarget?: "en" | "ja" | "ar" | null;
  /** Hanya diisi kalau intent === "news-discovery" dan user menyebut topik tertentu */
  topik?: string | null;
}

const DAFTAR_INTENT = [
  "headlines — minta alternatif/variasi judul artikel",
  "seo — minta meta title, meta description, atau metadata SEO",
  "summary — minta \"Inti Berita\": poin-poin ringkas yang TAMPIL KE PEMBACA di halaman artikel. Contoh: 'buat inti berita', 'buatkan poin penting artikel ini'",
  "summary-variants — minta ringkasan artikel dalam tiga panjang berbeda (pendek/sedang/panjang) untuk dipakai redaksi, BUKAN Inti Berita",
  "tags — minta saran tag/label artikel",
  "grammar — minta cek tata bahasa, typo, atau kalimat rancu",
  "category — minta saran kategori paling cocok untuk artikel",
  "internal-links — minta saran tautan ke artikel lain yang relevan",
  "duplicates — minta cek apakah ada artikel lain yang isinya mirip/duplikat",
  "thumbnail — minta saran gambar thumbnail",
  "breaking — minta cek apakah artikel ini layak ditandai Breaking News",
  "timeline — minta susunan kronologi/timeline dari isi artikel",
  "translate — minta terjemahkan artikel ke bahasa lain (Inggris/Jepang/Arab)",
  "fact-check — minta cek klaim tanpa sumber, angka janggal, atau kutipan tanpa atribusi",
  "writing — minta masukan gaya penulisan: kalimat kepanjangan, paragraf kurang jelas, atau bagian yang perlu diperkuat sumber/kutipan/data",
  "news-discovery — minta dicarikan berita/isu yang sedang ramai di media lain, contoh: 'carikan berita terbaru', 'apa yang lagi hits hari ini', 'berita apa yang belum kita liput', 'cari berita soal pemilu'",
  "belum-tersedia — HANYA untuk permintaan menulis/membuatkan artikel berita siap terbit dari sekadar topik atau judul, tanpa bahan sumber. Contoh: 'tulisin artikel soal banjir Jakarta', 'buatkan berita tentang kenaikan harga BBM'. JANGAN pakai intent ini untuk permintaan lain apa pun.",
  "obrolan — SEMUA hal lain: sapaan, pertanyaan umum, penjelasan konsep, diskusi sudut liputan, bantuan menyusun pertanyaan wawancara, hitung-hitungan, terjemahan istilah, atau obrolan santai. Ini pilihan default kalau ragu.",
].join("\n");

export async function klasifikasiIntent(pesan: string): Promise<HasilKlasifikasi> {
  const data = await askJson<HasilKlasifikasi>(
    [
      "Kamu adalah router perintah untuk asisten redaksi AI di sebuah CMS berita Indonesia.",
      "Tugasmu HANYA mengklasifikasikan pesan pengguna ke SATU intent dari daftar tetap berikut — jangan buat intent baru:",
      DAFTAR_INTENT,
      "",
      "Pilih intent alat redaksi HANYA kalau pesannya memang meminta alat itu. Kalau pesannya pertanyaan",
      "biasa, diskusi, atau apa pun yang tidak jelas masuk alat mana, pilih 'obrolan' — jangan dipaksakan.",
      "Intent 'obrolan' TIDAK perlu \"catatan\"; jawabannya disusun di tahap berikutnya.",
      "",
      "Kalau intent adalah 'belum-tersedia', WAJIB isi \"catatan\": jelaskan dengan ramah bahwa artikel di",
      "redaksi ini harus ditulis dari bahan sumber (siaran pers, wawancara, data, dokumen resmi) lewat fitur",
      "Draf dari Bahan, dan tawarkan bantuan menyusun kerangka atau sudut liputannya.",
      "",
      "Kalau intent adalah 'translate' (menerjemahkan ISI ARTIKEL yang sedang dibuka), WAJIB isi",
      "\"bahasaTarget\" dengan salah satu: \"en\" (Inggris), \"ja\" (Jepang), atau \"ar\" (Arab). Kalau pengguna",
      "minta bahasa lain, atau cuma minta terjemahan kata/istilah biasa, pakai 'obrolan' saja.",
      "",
      "Kalau intent adalah 'news-discovery' DAN pengguna menyebut topik/bidang tertentu (mis. 'berita",
      "soal pemilu', 'kabar ekonomi terbaru'), isi \"topik\" dengan kata kunci topiknya saja (1-3 kata,",
      "tanpa kata perintah). Kalau pengguna hanya minta berita terbaru secara umum, kosongkan \"topik\".",
      "",
      'Balas HANYA JSON valid: {"intent": string, "catatan": string (opsional), "bahasaTarget": string (opsional), "topik": string (opsional)}.',
    ].join(" "),
    pesan
  );

  return data;
}
