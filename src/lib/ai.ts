import Groq from "groq-sdk";

const MODEL = "llama-3.3-70b-versatile";

// Client dibuat saat dipakai, bukan saat impor — supaya env var sudah termuat
let client: Groq | null = null;
function getGroq(): Groq {
  if (!client) client = new Groq({ apiKey: process.env.GROQ_API_KEY });
  return client;
}

export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function askJson<T>(systemPrompt: string, userPrompt: string): Promise<T> {
  const res = await getGroq().chat.completions.create({
    model: MODEL,
    temperature: 0.4,
    // 2048, bukan 1024: draf kutipan-media kini 4-7 paragraf, dan JSON yang
    // terpotong di tengah bukan sekadar pendek — gagal di-parse seluruhnya
    max_tokens: 2048,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });
  const raw = res.choices[0]?.message?.content ?? "{}";
  return JSON.parse(raw) as T;
}

/**
 * Ambang minimal isi artikel sebelum AI boleh dipakai. Di bawah ini, AI cenderung
 * mengarang karena tidak ada bahan yang cukup untuk diolah.
 */
export const MIN_CONTENT_LENGTH = 250;

/** Panjang teks artikel setelah tag HTML dibuang */
export function plainTextLength(content: string): number {
  return stripHtml(content).length;
}

/**
 * AI Summary — poin-poin inti berita yang DITAMPILKAN KE PEMBACA di halaman artikel,
 * supaya pembaca cepat menangkap intinya tanpa membaca seluruh artikel.
 */
export async function generateSummary(content: string): Promise<string[]> {
  const text = stripHtml(content).slice(0, 6000);

  // Artikel terlalu pendek untuk diringkas — memaksa AI meringkas teks sependek ini
  // hanya akan memancing karangan. Lebih baik tidak menampilkan apa-apa.
  if (text.length < MIN_CONTENT_LENGTH) return [];

  const data = await askJson<{ points: string[] }>(
    [
      "Kamu adalah editor berita Indonesia yang menulis rangkuman untuk pembaca.",
      "Rangkum artikel menjadi maksimal 3 poin inti terpenting.",
      "LARANGAN MUTLAK: dilarang keras menambahkan informasi, angka, nama, atau peristiwa",
      "yang TIDAK tertulis di artikel. Setiap kata dalam poinmu harus bisa ditelusuri ke isi artikel.",
      "Kalau artikel tidak memuat cukup informasi untuk diringkas, balas {\"points\": []}.",
      "ATURAN setiap poin:",
      "1. Kalimat UTUH dengan subjek dan predikat, bukan frasa/label singkat.",
      '2. Panjang 80-160 karakter. Hindari poin pendek seperti "iOS 20 dirilis".',
      "3. Pakai detail konkret yang MEMANG ADA di artikel (angka, nama, tempat, dampak).",
      "4. Bisa dipahami sendiri tanpa membaca artikel.",
      'Balas HANYA JSON valid: {"points": string[]}.',
    ].join(" "),
    text
  );
  return (data.points ?? []).map((p) => p.trim()).filter(Boolean).slice(0, 3);
}

export interface SeoMetadata {
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
}

/**
 * AI SEO Metadata — meta title, meta description, keyword
 */
export async function generateSeoMetadata(title: string, content: string): Promise<SeoMetadata> {
  const text = stripHtml(content).slice(0, 6000);

  // Isi terlalu pendek — AI akan mengarang deskripsi. Biarkan redaksi isi manual.
  if (text.length < MIN_CONTENT_LENGTH) {
    return { metaTitle: "", metaDescription: "", keywords: [] };
  }

  return askJson<SeoMetadata>(
    'Kamu adalah pakar SEO untuk media berita Indonesia. Berdasarkan judul & isi artikel, buat metadata SEO. Balas HANYA JSON valid dengan format persis: {"metaTitle": string (maks 60 karakter), "metaDescription": string (maks 160 karakter), "keywords": string[] (5-8 kata kunci)}.',
    `Judul: ${title}\n\nIsi artikel: ${text}`
  );
}

/**
 * AI Auto Tag — saran tag relevan berdasarkan isi artikel
 */
export async function generateTags(title: string, content: string): Promise<string[]> {
  const text = stripHtml(content).slice(0, 6000);
  const data = await askJson<{ tags: string[] }>(
    'Kamu adalah editor berita Indonesia. Berdasarkan judul & isi artikel, sarankan 3-6 tag/topik relevan (kata atau frasa pendek, huruf kecil, tanpa tanda pagar). Balas HANYA JSON valid dengan format persis: {"tags": string[]}.',
    `Judul: ${title}\n\nIsi artikel: ${text}`
  );
  return (data.tags ?? []).map((t) => t.trim().toLowerCase()).filter(Boolean);
}

export interface GrammarIssue {
  excerpt: string;
  suggestion: string;
  reason: string;
}

/**
 * AI Grammar Checker — deteksi typo/kalimat kurang efektif
 */
export async function checkGrammar(content: string): Promise<GrammarIssue[]> {
  const text = stripHtml(content).slice(0, 6000);
  const data = await askJson<{ issues: GrammarIssue[] }>(
    'Kamu adalah editor bahasa Indonesia yang teliti. Periksa teks berikut untuk typo, kesalahan ejaan (sesuai EYD/PUEBI), dan kalimat yang kurang efektif. Balas HANYA JSON valid dengan format persis: {"issues": [{"excerpt": string (potongan asli bermasalah, maks 80 karakter), "suggestion": string (perbaikannya), "reason": string (alasan singkat)}]}. Kalau tidak ada masalah, balas {"issues": []}. Maksimal 10 temuan paling penting.',
    text
  );
  return data.issues ?? [];
}

// ─────────────────────────────────────────────────────────────
// PHASE 6 — AI NEWSROOM
// ─────────────────────────────────────────────────────────────

export interface HeadlineOption {
  headline: string;
  gaya: string;
}

/**
 * AI Headline Generator — beberapa alternatif judul dengan gaya berbeda,
 * supaya redaksi bisa memilih yang paling pas.
 */
export async function generateHeadlines(content: string): Promise<HeadlineOption[]> {
  const text = stripHtml(content).slice(0, 6000);
  if (text.length < MIN_CONTENT_LENGTH) return [];

  const data = await askJson<{ options: HeadlineOption[] }>(
    [
      "Kamu adalah editor berita Indonesia berpengalaman.",
      "Buat 5 alternatif judul untuk artikel ini, masing-masing dengan gaya berbeda:",
      "lugas, mengandung angka/data, menekankan dampak ke pembaca, kutipan/pernyataan, dan rasa penasaran.",
      "ATURAN WAJIB setiap judul:",
      "1. Panjang 45-90 karakter. Judul di bawah 45 karakter DITOLAK.",
      "2. Harus kalimat utuh yang berdiri sendiri, memuat subjek DAN peristiwanya.",
      '3. DILARANG judul buntung seperti "Subsidi Transportasi Umum" atau "Apa yang Berubah?" —',
      'yang benar seperti "Pemerintah Kucurkan Rp4,2 Triliun untuk Subsidi Transportasi 12 Kota".',
      "4. Wajib akurat sesuai isi artikel. Dilarang mengarang fakta atau clickbait menyesatkan.",
      "5. Untuk gaya 'mengandung angka/data': HANYA pakai angka yang benar-benar tertulis di artikel",
      "(harga, persentase, jumlah, tanggal, dll). Kalau tidak ada angka yang cocok untuk dipakai,",
      "JANGAN mengarang angka baru — ganti dengan sudut pandang lain yang tetap akurat.",
      'Balas HANYA JSON valid: {"options": [{"headline": string, "gaya": string}]}.',
    ].join(" "),
    text
  );

  // Saring judul buntung — model kadang mengabaikan batas panjang
  return (data.options ?? [])
    .filter((o) => o.headline?.trim() && o.headline.trim().length >= 40)
    .slice(0, 5);
}

export interface SummaryVariants {
  pendek: string;
  sedang: string;
  panjang: string;
}

/**
 * AI Summary Variants — ringkasan tiga panjang berbeda untuk keperluan berbeda
 * (notifikasi, kartu artikel, dan pengantar).
 */
export async function generateSummaryVariants(content: string): Promise<SummaryVariants | null> {
  const text = stripHtml(content).slice(0, 6000);
  if (text.length < MIN_CONTENT_LENGTH) return null;

  const data = await askJson<SummaryVariants>(
    [
      "Kamu adalah editor berita Indonesia. Buat TIGA versi ringkasan artikel ini:",
      '"pendek" (satu kalimat, maks 90 karakter, untuk notifikasi),',
      '"sedang" (2 kalimat, maks 200 karakter, untuk kartu artikel),',
      '"panjang" (3-4 kalimat, maks 400 karakter, sebagai pengantar).',
      "Semua harus akurat sesuai isi artikel, jangan mengarang.",
      'Balas HANYA JSON valid: {"pendek": string, "sedang": string, "panjang": string}.',
    ].join(" "),
    text
  );
  if (!data?.pendek && !data?.sedang && !data?.panjang) return null;
  return data;
}

export interface CategorySuggestion {
  slug: string;
  alasan: string;
  yakin: number;
}

/**
 * AI Suggested Categories — rekomendasi kategori paling sesuai.
 * Hanya boleh memilih dari kategori yang benar-benar ada di situs.
 */
export async function suggestCategory(
  title: string,
  content: string,
  categories: { name: string; slug: string }[]
): Promise<CategorySuggestion[]> {
  const text = stripHtml(content).slice(0, 4000);
  if (categories.length === 0) return [];

  const daftar = categories.map((c) => `${c.slug} (${c.name})`).join(", ");
  const data = await askJson<{ suggestions: CategorySuggestion[] }>(
    [
      "Kamu adalah editor berita Indonesia.",
      `Pilih kategori paling sesuai untuk artikel ini. Kategori yang TERSEDIA: ${daftar}.`,
      'Nilai "slug" WAJIB salah satu dari daftar itu — dilarang membuat kategori baru.',
      "Urutkan dari yang paling cocok, maksimal 3 saran.",
      '"yakin" adalah angka 0-100 seberapa yakin kamu.',
      "HANYA sertakan kategori yang benar-benar cocok. Kategori yang tidak relevan",
      "jangan dimasukkan sama sekali — lebih baik memberi 1 saran tepat daripada 3 saran asal.",
      'Balas HANYA JSON valid: {"suggestions": [{"slug": string, "alasan": string, "yakin": number}]}.',
    ].join(" "),
    `Judul: ${title}\n\nIsi: ${text}`
  );

  const valid = new Set(categories.map((c) => c.slug));
  return (data.suggestions ?? [])
    .filter((s) => valid.has(s.slug))
    // Buang saran berkeyakinan rendah — hanya jadi gangguan bagi redaksi
    .filter((s) => typeof s.yakin === "number" && s.yakin >= 40)
    .sort((a, b) => b.yakin - a.yakin)
    .slice(0, 3);
}

export interface InternalLinkSuggestion {
  slug: string;
  judul: string;
  frasa: string;
  alasan: string;
}

/**
 * AI Internal Linking — menyarankan artikel lain yang layak ditautkan,
 * sekaligus frasa mana di artikel ini yang cocok dijadikan tautan.
 */
export async function suggestInternalLinks(
  content: string,
  kandidat: { slug: string; title: string; excerpt: string | null }[]
): Promise<InternalLinkSuggestion[]> {
  const text = stripHtml(content).slice(0, 4000);
  if (text.length < MIN_CONTENT_LENGTH || kandidat.length === 0) return [];

  const daftar = kandidat
    .map((k, i) => `${i + 1}. [${k.slug}] ${k.title}${k.excerpt ? ` — ${k.excerpt.slice(0, 100)}` : ""}`)
    .join("\n");

  const data = await askJson<{ links: InternalLinkSuggestion[] }>(
    [
      "Kamu adalah editor berita Indonesia yang ahli menautkan artikel terkait.",
      "Dari DAFTAR ARTIKEL di bawah, pilih maksimal 3 yang benar-benar relevan dengan ISI ARTIKEL.",
      '"frasa" harus potongan kata yang BENAR-BENAR ADA di isi artikel (salin persis, maks 60 karakter)',
      "dan cocok dijadikan teks tautan.",
      '"slug" WAJIB dari daftar. Kalau tidak ada yang relevan, balas {"links": []}.',
      'Balas HANYA JSON valid: {"links": [{"slug": string, "judul": string, "frasa": string, "alasan": string}]}.',
    ].join(" "),
    `DAFTAR ARTIKEL:\n${daftar}\n\nISI ARTIKEL:\n${text}`
  );

  const valid = new Map(kandidat.map((k) => [k.slug, k.title]));
  return (data.links ?? [])
    .filter((l) => valid.has(l.slug))
    .map((l) => ({ ...l, judul: valid.get(l.slug)! }))
    .slice(0, 3);
}

export interface DuplicateMatch {
  slug: string;
  judul: string;
  kemiripan: number;
  alasan: string;
}

/**
 * AI Duplicate Detection — mendeteksi artikel lama yang isinya terlalu mirip,
 * supaya redaksi tidak menerbitkan berita ganda.
 */
export async function detectDuplicates(
  title: string,
  content: string,
  kandidat: { slug: string; title: string; excerpt: string | null }[]
): Promise<DuplicateMatch[]> {
  const text = stripHtml(content).slice(0, 3000);
  if (kandidat.length === 0) return [];

  const daftar = kandidat
    .map((k, i) => `${i + 1}. [${k.slug}] ${k.title}${k.excerpt ? ` — ${k.excerpt.slice(0, 150)}` : ""}`)
    .join("\n");

  const data = await askJson<{ matches: DuplicateMatch[] }>(
    [
      "Kamu adalah editor berita Indonesia yang memeriksa duplikasi liputan.",
      "Bandingkan ARTIKEL BARU dengan DAFTAR ARTIKEL LAMA.",
      'Laporkan hanya yang membahas PERISTIWA YANG SAMA dengan "kemiripan" minimal 60.',
      "Topik sejenis tapi peristiwa berbeda BUKAN duplikat — jangan dilaporkan.",
      '"slug" WAJIB dari daftar. Kalau tidak ada duplikat, balas {"matches": []}.',
      'Balas HANYA JSON valid: {"matches": [{"slug": string, "judul": string, "kemiripan": number, "alasan": string}]}.',
    ].join(" "),
    `ARTIKEL BARU:\nJudul: ${title}\nIsi: ${text}\n\nDAFTAR ARTIKEL LAMA:\n${daftar}`
  );

  const valid = new Map(kandidat.map((k) => [k.slug, k.title]));
  return (data.matches ?? [])
    .filter((m) => valid.has(m.slug) && m.kemiripan >= 60)
    .map((m) => ({ ...m, judul: valid.get(m.slug)! }))
    .sort((a, b) => b.kemiripan - a.kemiripan)
    .slice(0, 5);
}

export interface ArticleDraft {
  title: string;
  excerpt: string;
  content: string;
  /** Hal yang belum jelas dari bahan dan perlu dicek wartawan sebelum terbit */
  perluDiverifikasi: string[];
}

export type JenisBahan =
  | "siaran-pers"
  | "catatan-lapangan"
  | "data"
  | "dokumen"
  | "kutipan-media"
  | "riset-web";

const PANDUAN_BAHAN: Record<JenisBahan, string> = {
  "kutipan-media":
    "Bahan ini RANGKUMAN PEMBERITAAN MEDIA LAIN — cuma judul dan cuplikan singkat tiap media, BUKAN " +
    "artikel penuh dan BUKAN hasil liputan redaksi sendiri. ATURAN ATRIBUSI MUTLAK: setiap fakta WAJIB " +
    "disebutkan sumber medianya langsung di kalimat, contoh 'menurut CNN Indonesia...', 'sebagaimana " +
    "dilaporkan Antara...', 'dikutip dari Tempo...'. DILARANG KERAS menulis seolah ini hasil liputan " +
    "independen LinkProMedia. " +
    "PANJANG & STRUKTUR: manfaatkan SEMUA butir bahan sampai habis — jangan berhenti setelah dua " +
    "paragraf kalau bahannya masih menyisakan fakta yang belum terpakai. Susun 4-7 paragraf: " +
    "(1) lead berisi fakta terpenting; (2-…) kembangkan TIAP judul/cuplikan jadi paragraf atau " +
    "gabungan paragrafnya sendiri — setiap media yang melaporkan sudut berbeda diceritakan sudutnya, " +
    "termasuk perbedaan penekanan antar media bila ada ('CNN Indonesia menyoroti X, sementara Antara " +
    "menekankan Y'); (terakhir) paragraf penutup yang merangkum apa yang belum diketahui berdasarkan " +
    "bahan. Panjang tetap DIBATASI BAHAN: kalau bahannya cuma dua butir, hasilnya memang pendek — " +
    "DILARANG mengarang detail, kutipan narasumber, latar belakang, atau angka tambahan supaya " +
    "terasa lebih lengkap. " +
    '"content" HANYA berisi isi beritanya sendiri (paragraf berita biasa dengan atribusi di dalam kalimat ' +
    "seperti contoh di atas) — DILARANG KERAS menambahkan kalimat disclaimer, peringatan, atau catatan " +
    "meta apa pun tentang status bahan ini (mis. 'ini rangkuman', 'perlu diverifikasi') ke dalam \"content\"; " +
    'catatan semacam itu HANYA boleh muncul di "perluDiverifikasi", tidak pernah di isi berita.',
  "riset-web":
    "Bahan ini HASIL PENELUSURAN WEB — kumpulan cuplikan dari beberapa situs (media dan situs resmi), " +
    "BUKAN artikel penuh dan BUKAN liputan redaksi sendiri. ATURAN ATRIBUSI MUTLAK: setiap fakta WAJIB " +
    "menyebut sumbernya langsung di kalimat ('menurut data BPS...', 'sebagaimana dilaporkan Kompas...'). " +
    "PRIORITAS SUMBER: bila fakta yang sama tersedia dari situs resmi (bertanda [RESMI]) dan media, " +
    "pakai versi situs resmi sebagai rujukan utama. " +
    "ANGKA BERBEDA ANTAR SUMBER: JANGAN memilih salah satu diam-diam — tulis keduanya dengan sumber " +
    "masing-masing dan sebutkan bahwa perbedaannya bisa berkaitan dengan periode, definisi, cakupan, " +
    "atau metode pengukuran yang berbeda. " +
    "STRUKTUR: lead fakta terpenting; kembangkan tiap sumber yang membawa fakta baru; boleh <h2> untuk " +
    "bagian Data, Dampak, atau kelompok isu bila bahannya memang cukup; tutup dengan paragraf apa yang " +
    "belum diketahui dari bahan. Panjang DIBATASI BAHAN — cuplikan sedikit berarti berita pendek, " +
    "DILARANG mengarang pelengkap. " +
    '"content" HANYA isi beritanya — tanpa disclaimer/meta apa pun (itu tempatnya di "perluDiverifikasi"). ' +
    'Pada "perluDiverifikasi" WAJIB ada butir: buka dan baca sumber aslinya satu per satu — AI hanya ' +
    "membaca cuplikan pendek, bukan halaman penuhnya.",
  "siaran-pers":
    "Bahan ini SIARAN PERS — sudut pandangnya memihak pihak yang merilis. " +
    "Tulis ulang sebagai berita netral, jangan menyalin nada promosinya. " +
    "Klaim mereka WAJIB diberi atribusi (mis. 'menurut Dinas...', 'pihaknya menyatakan'), " +
    "jangan ditulis seolah fakta yang sudah terverifikasi. " +
    'Pada "perluDiverifikasi" WAJIB cantumkan minimal dua hal yang perlu dikonfirmasi ke pihak ' +
    "independen atau pihak terdampak — siaran pers tidak pernah cukup sebagai sumber tunggal.",
  "catatan-lapangan":
    "Bahan ini CATATAN LAPANGAN wartawan. Susun jadi berita utuh dengan alur yang runut.",
  data:
    "Bahan ini DATA/ANGKA. Sajikan angkanya dengan akurat dan jelaskan artinya bagi pembaca. " +
    "Dilarang menambah analisis atau prediksi yang tidak ada dalam data.",
  dokumen:
    "Bahan ini DOKUMEN RESMI/LAPORAN. Sarikan poin pentingnya jadi berita yang mudah dipahami pembaca umum. " +
    "WAJIB cantumkan NOMOR DOKUMEN/PUTUSAN/PERKARA ITU SENDIRI (yang jadi identitas resmi bahan ini, biasanya " +
    "di judul/kop bahan) beserta tanggalnya, dan nama pihak/pejabat yang terlibat — detail identitas itu wajib " +
    "bagi berita hukum/resmi, jangan dihilangkan demi keringkasan.",
};

/**
 * AI Draft Writer — menyusun draf artikel HANYA dari bahan yang disediakan redaksi.
 *
 * Ini BUKAN alat untuk mengarang berita: model tidak punya akses ke peristiwa nyata,
 * jadi seluruh fakta wajib berasal dari bahan yang dikirim wartawan. Prompt-nya
 * dirancang untuk menolak menambah fakta, dan mengembalikan daftar hal yang masih
 * perlu diverifikasi manusia sebelum terbit.
 */
export async function draftArticleFromSource(
  bahan: string,
  jenis: JenisBahan,
  arahan?: string
): Promise<ArticleDraft | null> {
  const sumber = bahan.trim().slice(0, 12000);
  if (sumber.length < MIN_CONTENT_LENGTH) return null;

  const data = await askJson<ArticleDraft>(
    [
      "Kamu adalah wartawan Indonesia yang menulis berita dari bahan mentah.",
      PANDUAN_BAHAN[jenis],
      "",
      "ATURAN MUTLAK — melanggar ini berarti gagal:",
      "1. SELURUH fakta, angka, nama, tanggal, dan kutipan HARUS berasal dari BAHAN.",
      "2. DILARANG KERAS menambah latar belakang, konteks sejarah, perbandingan, atau detail",
      "   apa pun yang tidak tertulis di BAHAN — sekalipun kamu merasa tahu.",
      "3. Kalau bahannya sedikit, tulis berita pendek. JANGAN dipanjang-panjangkan dengan karangan.",
      "4. Dilarang mengarang kutipan. Kutip hanya yang benar-benar ada di BAHAN.",
      "",
      "GAYA PENULISAN:",
      "- WAJIB tulis ulang dengan kalimatmu sendiri. DILARANG menyalin kalimat bahan apa adanya —",
      "  yang dipertahankan persis hanyalah kutipan langsung di dalam tanda petik.",
      "- Susun ulang urutannya secara piramida terbalik: fakta terpenting di paragraf pertama,",
      "  bukan mengikuti urutan bahan aslinya.",
      "- LEAD: paragraf pertama menjawab APA yang terjadi dan MENGAPA penting bagi pembaca,",
      "  sejauh bahan menyediakannya. Hindari pembukaan umum yang berputar-putar.",
      "- ANGKA: setiap angka penting ditulis lengkap dengan satuan, periode, dan sumbernya",
      "  sebagaimana tertera di bahan. Perbandingan/tren hanya boleh ditulis bila bahan memuatnya.",
      "- FAKTA vs PENILAIAN: penilaian, prediksi, atau opini yang ada di bahan WAJIB beratribusi",
      "  ('menurut...', 'dinilai...', 'data menunjukkan...') — jangan ditulis sebagai fakta pasti.",
      "- Bahasa Indonesia baku sesuai kaidah jurnalistik.",
      "- Kalimat pendek dan lugas. Netral, tanpa opini penulis.",
      '- "content" berupa HTML sederhana: hanya tag <p>, dan <h2> bila perlu subjudul.',
      '- "title" 45-90 karakter, faktual, tanpa clickbait. "excerpt" maksimal 200 karakter.',
      '- "perluDiverifikasi" berisi hal yang masih kabur/kurang dari bahan dan perlu dicek wartawan.',
      "  Periksa juga: unsur 5W1H (apa/siapa/kapan/di mana/mengapa/bagaimana) yang TIDAK terjawab",
      "  oleh bahan, dan — untuk isu yang menyudutkan/berdampak ke pihak tertentu — tanggapan pihak",
      "  itu bila belum ada di bahan. JANGAN mengarang jawabannya di content; cukup catat di sini.",
      "",
      'Balas HANYA JSON valid: {"title": string, "excerpt": string, "content": string, "perluDiverifikasi": string[]}.',
    ].join(" "),
    `${arahan?.trim() ? `ARAHAN REDAKSI: ${arahan.trim()}\n\n` : ""}BAHAN:\n${sumber}`
  );

  if (!data?.title?.trim() || !data?.content?.trim()) return null;

  const perluDiverifikasi = Array.isArray(data.perluDiverifikasi)
    ? data.perluDiverifikasi.filter((v) => typeof v === "string" && v.trim())
    : [];

  // Backstop kode: prompt SUDAH menyuruh model menaruh peringatan ini sebagai
  // butir pertama untuk bahan "kutipan-media", tapi model terbukti kadang
  // mengabaikannya (diverifikasi lewat pengujian nyata — model langsung lompat
  // ke daftar hal teknis yang perlu dicek, tanpa peringatan sumbernya). Karena
  // ini peringatan yang PALING penting di jenis bahan paling berisiko, tidak
  // boleh bergantung pada kepatuhan model — dipaksakan di kode sebagai butir
  // pertama, bukan sekadar diminta lewat prompt.
  const PERINGATAN_KUTIPAN_MEDIA =
    "Ini rangkuman dari pemberitaan media lain, bukan liputan independen — wajib verifikasi dan " +
    "lakukan liputan/konfirmasi sendiri ke pihak terkait sebelum diterbitkan.";
  if (jenis === "kutipan-media" && !perluDiverifikasi.some((v) => v.toLowerCase().includes("bukan liputan"))) {
    perluDiverifikasi.unshift(PERINGATAN_KUTIPAN_MEDIA);
  }

  // Backstop yang sama untuk riset web: prompt mewajibkan butir "baca sumber
  // aslinya", tapi pengujian nyata menunjukkan model melewatkannya — padahal
  // inilah keterbatasan paling penting dari bahan riset (AI hanya membaca
  // cuplikan pendek, bukan halaman penuh).
  const PERINGATAN_RISET_WEB =
    "Buka dan baca sumber aslinya satu per satu sebelum terbit — draf ini disusun hanya dari " +
    "cuplikan pendek tiap halaman, bukan isi penuhnya.";
  if (jenis === "riset-web" && !perluDiverifikasi.some((v) => v.toLowerCase().includes("sumber asli"))) {
    perluDiverifikasi.unshift(PERINGATAN_RISET_WEB);
  }

  let content = data.content.trim();
  if (jenis === "kutipan-media") {
    // Backstop kedua: pengujian nyata menunjukkan model kadang ikut menulis
    // kalimat peringatan ini ke paragraf PERTAMA "content" juga — bukan cuma
    // di perluDiverifikasi seperti diminta. Kalimat itu meta-komentar
    // redaksional, bukan bagian dari berita; kalau lolos dan draf disimpan
    // apa adanya, pembaca akan melihatnya sebagai paragraf pembuka berita.
    // Paragraf pertama dibuang kalau isinya jelas kalimat disclaimer, bukan
    // teks berita.
    content = content.replace(
      /^<p>[^<]*(rangkuman[^<]*(liputan independen|verifikasi)|liputan independen[^<]*rangkuman)[^<]*<\/p>\s*/i,
      ""
    );
  }

  return {
    title: data.title.trim(),
    excerpt: (data.excerpt ?? "").trim().slice(0, 300),
    content,
    perluDiverifikasi: perluDiverifikasi.slice(0, 6),
  };
}

export interface BreakingAssessment {
  layak: boolean;
  skor: number;
  alasan: string;
  indikator: string[];
}

/**
 * Automatic Breaking Detection — menilai apakah artikel layak ditandai
 * sebagai Breaking News, supaya redaksi tidak kelewatan berita penting
 * dan sebaliknya tidak menandai berita biasa sebagai "breaking".
 */
export async function assessBreakingNews(
  title: string,
  content: string
): Promise<BreakingAssessment | null> {
  const text = stripHtml(content).slice(0, 5000);
  if (text.length < MIN_CONTENT_LENGTH) return null;

  const data = await askJson<BreakingAssessment>(
    [
      "Kamu adalah redaktur pelaksana media berita Indonesia yang memutuskan status Breaking News.",
      "Nilai apakah artikel ini layak jadi Breaking News.",
      "LAYAK breaking: peristiwa besar yang baru terjadi dan berdampak luas —",
      "bencana, kecelakaan besar, keputusan pemerintah mendadak, kematian tokoh penting,",
      "hasil pertandingan/pemilu penting, krisis mendesak.",
      "TIDAK layak: analisis, opini, tips, tren gaya hidup, berita ringan,",
      "peristiwa yang sudah lama berlalu, atau pengumuman rutin.",
      '"skor" 0-100 seberapa kuat kelayakannya. "layak" true hanya bila skor minimal 70.',
      '"indikator" adalah 2-4 alasan singkat berbentuk frasa.',
      'Balas HANYA JSON valid: {"layak": boolean, "skor": number, "alasan": string, "indikator": string[]}.',
    ].join(" "),
    `Judul: ${title}\n\nIsi: ${text}`
  );

  if (typeof data?.skor !== "number") return null;

  // Tegakkan ambang di kode — model kadang menandai "layak" walau skornya rendah
  return {
    skor: Math.round(data.skor),
    layak: data.skor >= 70,
    alasan: data.alasan ?? "",
    indikator: Array.isArray(data.indikator) ? data.indikator.slice(0, 4) : [],
  };
}

export interface ThumbnailSuggestion {
  /** Gambar dari Media Library yang cocok dipakai */
  media: { url: string; filename: string; alasan: string }[];
  /** Kata kunci untuk mencari gambar baru bila belum ada yang cocok */
  kataKunci: string[];
}

/**
 * AI Thumbnail Suggestion — mencarikan gambar dari Media Library yang cocok
 * dengan isi artikel, plus kata kunci untuk mencari gambar baru.
 *
 * Catatan: model teks tidak bisa "melihat" gambar, jadi pencocokan dilakukan
 * lewat nama berkas. Karena itu penamaan berkas yang deskriptif sangat membantu.
 */
export async function suggestThumbnail(
  title: string,
  content: string,
  media: { url: string; filename: string }[]
): Promise<ThumbnailSuggestion> {
  const text = stripHtml(content).slice(0, 3000);

  const daftar = media.length
    ? media.map((m, i) => `${i + 1}. [${m.filename}]`).join("\n")
    : "(media library masih kosong)";

  const data = await askJson<{
    media: { filename: string; alasan: string }[];
    kataKunci: string[];
  }>(
    [
      "Kamu adalah editor foto media berita Indonesia.",
      "Tugas 1: dari DAFTAR BERKAS GAMBAR, pilih maksimal 3 yang namanya menunjukkan isi yang cocok untuk artikel ini.",
      'Kalau tidak ada yang cocok, kembalikan "media": [].',
      "Tugas 2: buat 5 kata kunci pencarian gambar (bahasa Indonesia) yang cocok untuk artikel ini.",
      '"filename" WAJIB persis dari daftar.',
      'Balas HANYA JSON valid: {"media": [{"filename": string, "alasan": string}], "kataKunci": string[]}.',
    ].join(" "),
    `Judul: ${title}\n\nIsi: ${text}\n\nDAFTAR BERKAS GAMBAR:\n${daftar}`
  );

  const byFilename = new Map(media.map((m) => [m.filename, m.url]));
  return {
    media: (data.media ?? [])
      .filter((m) => byFilename.has(m.filename))
      .map((m) => ({ url: byFilename.get(m.filename)!, filename: m.filename, alasan: m.alasan }))
      .slice(0, 3),
    kataKunci: (data.kataKunci ?? []).map((k) => String(k).trim()).filter(Boolean).slice(0, 5),
  };
}

// ─────────────────────────────────────────────────────────────
// PHASE 8 — AI NEWSROOM ASSISTANT
// ─────────────────────────────────────────────────────────────

export interface TimelineEntry {
  waktu: string;
  peristiwa: string;
}

/**
 * AI Timeline Generator — menyusun kronologi waktu-peristiwa yang DISEBUTKAN
 * SECARA EKSPLISIT di isi artikel. Tidak menyusun urutan kronologis dari
 * artikel yang tidak menyebutkan waktu sama sekali (return kosong).
 */
export async function generateTimeline(content: string): Promise<TimelineEntry[]> {
  const text = stripHtml(content).slice(0, 6000);
  if (text.length < MIN_CONTENT_LENGTH) return [];

  const data = await askJson<{ entri: TimelineEntry[] }>(
    [
      "Kamu adalah editor berita Indonesia.",
      "Baca artikel ini dan susun kronologi waktu-peristiwa yang DISEBUTKAN SECARA EKSPLISIT di dalamnya.",
      "DILARANG KERAS mengarang waktu atau peristiwa yang tidak tertulis di artikel.",
      "Kalau artikel TIDAK menyebutkan penanda waktu (jam/tanggal/'kemudian'/'sebelumnya') sama sekali,",
      'balas array kosong — jangan memaksakan kronologi yang tidak benar-benar ada.',
      '"waktu" ditulis persis seperti disebut di artikel (jam, tanggal, atau kata penanda urutan).',
      '"peristiwa" ringkasan kejadian pada waktu itu, maksimal 15 kata, berdasarkan isi artikel saja.',
      "Urutkan dari yang paling awal ke paling akhir.",
      'Balas HANYA JSON valid: {"entri": [{"waktu": string, "peristiwa": string}]}.',
    ].join(" "),
    text
  );

  return Array.isArray(data.entri) ? data.entri.slice(0, 15) : [];
}

export type BahasaTarget = "en" | "ja" | "ar";

export const NAMA_BAHASA_TARGET: Record<BahasaTarget, string> = {
  en: "Inggris",
  ja: "Jepang",
  ar: "Arab",
};

export interface HasilTerjemahan {
  title: string;
  content: string;
}

/**
 * AI Translation — menerjemahkan judul & isi artikel. HANYA menerjemahkan;
 * dilarang menambah, menghapus, atau menafsirkan ulang fakta apa pun.
 */
export async function translateArticle(
  title: string,
  content: string,
  target: BahasaTarget
): Promise<HasilTerjemahan | null> {
  const text = stripHtml(content).slice(0, 6000);
  if (text.length < MIN_CONTENT_LENGTH) return null;

  const namaBahasa = NAMA_BAHASA_TARGET[target];
  const data = await askJson<HasilTerjemahan>(
    [
      `Terjemahkan judul dan isi artikel berita Indonesia ini ke Bahasa ${namaBahasa}.`,
      "ATURAN MUTLAK: HANYA menerjemahkan — dilarang menambah, menghapus, meringkas, atau",
      "menafsirkan ulang fakta apa pun yang tidak ada di teks asli.",
      "Pertahankan nama orang, tempat, lembaga, dan angka persis seperti aslinya.",
      '"content" tetap berupa HTML sederhana (hanya tag <p>), jumlah paragraf sama seperti aslinya.',
      'Balas HANYA JSON valid: {"title": string, "content": string}.',
    ].join(" "),
    `Judul: ${title}\n\nIsi:\n${text}`
  );

  if (!data?.title?.trim() || !data?.content?.trim()) return null;
  return { title: data.title.trim(), content: data.content.trim() };
}

export interface FactWarning {
  jenis: "klaim-tanpa-sumber" | "angka-tidak-konsisten" | "tanggal-tidak-sesuai" | "kutipan-tanpa-referensi";
  kutipan: string;
  catatan: string;
}

/**
 * AI Fact Reminder — menandai pola penulisan yang biasanya butuh dicek ulang
 * redaksi (klaim tanpa sumber, angka tak konsisten, kutipan tanpa atribusi).
 *
 * PENTING: ini HANYA menandai POLA TULISAN yang mencurigakan, BUKAN
 * memverifikasi kebenaran fakta — itu tetap sepenuhnya tanggung jawab
 * wartawan. AI tidak tahu apakah suatu klaim benar atau salah.
 */
export async function checkFacts(content: string): Promise<FactWarning[]> {
  const text = stripHtml(content).slice(0, 6000);
  if (text.length < MIN_CONTENT_LENGTH) return [];

  const data = await askJson<{ peringatan: FactWarning[] }>(
    [
      "Kamu adalah pemeriksa kualitas naskah di ruang redaksi media Indonesia.",
      "Tandai bagian artikel ini yang POLA PENULISANNYA berpotensi butuh dicek ulang:",
      "(1) klaim tegas tanpa disebutkan sumbernya, (2) angka yang tidak konsisten satu sama lain",
      "di dalam artikel yang sama, (3) tanggal/waktu yang janggal atau tidak masuk akal secara logika,",
      "(4) kutipan langsung (dalam tanda petik) tanpa disebutkan siapa yang mengucapkannya.",
      "PENTING: kamu TIDAK memverifikasi apakah faktanya benar atau salah — kamu hanya menandai POLA",
      "penulisan yang lazimnya perlu di-double-check redaksi. Jangan menuduh sesuatu itu salah.",
      "Kalau tidak ada yang mencurigakan, balas array kosong — jangan mengada-ada supaya terlihat menemukan sesuatu.",
      '"jenis" salah satu persis: klaim-tanpa-sumber, angka-tidak-konsisten, tanggal-tidak-sesuai, kutipan-tanpa-referensi.',
      '"kutipan" potongan asli dari artikel yang dimaksud (maks 100 karakter).',
      '"catatan" alasan singkat kenapa ini perlu dicek, bukan pernyataan bahwa itu salah.',
      'Balas HANYA JSON valid: {"peringatan": [{"jenis": string, "kutipan": string, "catatan": string}]}.',
    ].join(" "),
    text
  );

  return Array.isArray(data.peringatan) ? data.peringatan.slice(0, 8) : [];
}

export interface WritingSuggestion {
  jenis: "kalimat-panjang" | "paragraf-tidak-jelas" | "perlu-sumber" | "perlu-kutipan" | "perlu-data";
  kutipan: string;
  saran: string;
}

/**
 * AI Writing Assistant — masukan gaya penulisan & kelengkapan naskah
 * (kalimat kepanjangan, paragraf kurang jelas, bagian yang akan lebih kuat
 * kalau diberi sumber/kutipan/data).
 *
 * PENTING: ini menandai LOKASI yang bisa diperkuat, TIDAK mengarang isi
 * sumber/kutipan/data yang disarankan — itu tetap sepenuhnya tugas wartawan
 * mencari & menambahkan sendiri.
 */
export async function reviewWriting(content: string): Promise<WritingSuggestion[]> {
  const text = stripHtml(content).slice(0, 6000);
  if (text.length < MIN_CONTENT_LENGTH) return [];

  const data = await askJson<{ saran: WritingSuggestion[] }>(
    [
      "Kamu adalah editor bahasa & gaya penulisan media berita Indonesia.",
      "Beri masukan penulisan untuk artikel ini:",
      "(1) kalimat yang terlalu panjang/berbelit sehingga sulit dibaca,",
      "(2) paragraf yang kurang jelas maksudnya atau melompat-lompat,",
      "(3) klaim penting yang akan lebih kuat kalau disebutkan sumbernya,",
      "(4) bagian yang akan lebih hidup kalau ada kutipan langsung narasumber,",
      "(5) pernyataan umum yang akan lebih meyakinkan kalau didukung angka/data.",
      "ATURAN MUTLAK: untuk (3)(4)(5), HANYA tunjukkan DI MANA tambahan itu akan membantu —",
      "DILARANG KERAS mengarang sumber, kutipan, atau angka yang disarankan itu sendiri.",
      "Kalau tulisannya sudah baik, balas array kosong — jangan mencari-cari masalah yang tidak ada.",
      '"jenis" salah satu persis: kalimat-panjang, paragraf-tidak-jelas, perlu-sumber, perlu-kutipan, perlu-data.',
      '"kutipan" potongan asli dari artikel yang dimaksud (maks 100 karakter).',
      '"saran" penjelasan singkat perbaikannya (bukan contoh isi yang dikarang).',
      'Balas HANYA JSON valid: {"saran": [{"jenis": string, "kutipan": string, "saran": string}]}. Maksimal 8 masukan.',
    ].join(" "),
    text
  );

  const saran = Array.isArray(data.saran) ? data.saran.slice(0, 8) : [];

  // Deteksi kalimat kepanjangan itu murni mekanis (hitung kata), tapi model
  // kadang tidak konsisten menandainya sendiri. Tegakkan di kode sebagai
  // jaring pengaman — sama seperti filter panjang judul di generateHeadlines.
  const AMBANG_KATA_KALIMAT = 40;
  const sudahAdaKalimatPanjang = saran.some((s) => s.jenis === "kalimat-panjang");
  if (!sudahAdaKalimatPanjang) {
    const kalimatTerpanjang = text
      .split(/(?<=[.!?])\s+/)
      .map((k) => k.trim())
      .filter(Boolean)
      .reduce<{ teks: string; jumlahKata: number } | null>((terpanjang, k) => {
        const jumlahKata = k.split(/\s+/).length;
        return !terpanjang || jumlahKata > terpanjang.jumlahKata ? { teks: k, jumlahKata } : terpanjang;
      }, null);

    if (kalimatTerpanjang && kalimatTerpanjang.jumlahKata > AMBANG_KATA_KALIMAT) {
      saran.unshift({
        jenis: "kalimat-panjang",
        kutipan: kalimatTerpanjang.teks.slice(0, 100),
        saran: `Kalimat ini ${kalimatTerpanjang.jumlahKata} kata — pertimbangkan dipecah jadi beberapa kalimat.`,
      });
    }
  }

  return saran.slice(0, 8);
}

// ---------------------------------------------------------------------------
// Obrolan bebas
// ---------------------------------------------------------------------------

export interface PesanObrolan {
  peran: "user" | "ai";
  teks: string;
}

/** Riwayat yang dikirim ke model dibatasi supaya biaya token tidak membengkak */
const MAKS_RIWAYAT = 10;

/**
 * Obrolan bebas layaknya ChatGPT/Claude — bisa menjawab pertanyaan apa pun,
 * bukan cuma perintah yang terdaftar.
 *
 * Batasan yang tetap dipegang, karena ini hidup di dalam CMS berita:
 * 1. TIDAK menulis draf artikel siap terbit dari sekadar topik. Artikel wajib
 *    ditulis dari bahan sumber redaksi (lihat draftArticleFromSource).
 * 2. TIDAK mengaku tahu peristiwa terkini — model tidak punya akses internet,
 *    jadi untuk kabar hari ini pengguna diarahkan ke fitur riset berita.
 * 3. Jujur saat tidak tahu, alih-alih mengarang nama/angka/tanggal yang
 *    terdengar meyakinkan — kesalahan seperti itu paling berbahaya di redaksi.
 */
export async function obrolanBebas(riwayat: PesanObrolan[], pesan: string): Promise<string> {
  const sistem = [
    "Kamu adalah asisten AI di dalam CMS berita LinkProMedia. Lawan bicaramu adalah wartawan dan editor.",
    "Jawablah dengan Bahasa Indonesia yang natural dan enak dibaca. Boleh membahas topik apa pun:",
    "menjelaskan konsep, bertukar pikiran soal sudut liputan, membantu merumuskan pertanyaan wawancara,",
    "merapikan kalimat, menghitung, menerjemahkan istilah, atau sekadar mengobrol.",
    "",
    "TIGA HAL YANG TIDAK BOLEH KAMU LAKUKAN:",
    "1. JANGAN menulis draf artikel berita yang siap terbit hanya dari sebuah topik. Kalau diminta,",
    "   jelaskan bahwa artikel di redaksi ini wajib ditulis dari bahan sumber (siaran pers, wawancara,",
    "   data, dokumen resmi) lewat fitur Draf dari Bahan. Kamu tetap boleh membantu menyusun kerangka,",
    "   daftar pertanyaan, atau sudut pandang liputan.",
    "2. JANGAN mengaku tahu peristiwa terbaru. Kamu tidak punya akses internet dan pengetahuanmu punya",
    "   batas waktu. Untuk kabar hari ini, arahkan pengguna memakai perintah 'Carikan berita terbaru'",
    "   yang membaca RSS media lain secara langsung.",
    "3. JANGAN mengarang nama orang, angka, tanggal, kutipan, atau nama lembaga supaya jawaban terdengar",
    "   meyakinkan. Kalau tidak tahu atau tidak yakin, katakan terus terang bahwa kamu tidak tahu.",
    "",
    "Kalau kamu menyampaikan sesuatu dari ingatanmu yang perlu dicek ulang sebelum dipakai di berita,",
    "sebutkan itu apa adanya. Jawab ringkas dan langsung ke inti; panjangkan hanya kalau memang perlu.",
  ].join("\n");

  const percakapan = riwayat.slice(-MAKS_RIWAYAT).map((p) => ({
    role: p.peran === "user" ? ("user" as const) : ("assistant" as const),
    content: p.teks,
  }));

  const res = await getGroq().chat.completions.create({
    model: MODEL,
    temperature: 0.7,
    max_tokens: 1200,
    messages: [{ role: "system", content: sistem }, ...percakapan, { role: "user", content: pesan }],
  });

  return (
    res.choices[0]?.message?.content?.trim() ||
    "Maaf, saya tidak berhasil menyusun jawaban. Coba tanyakan sekali lagi."
  );
}
