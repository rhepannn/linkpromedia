/**
 * AI News Discovery — mengintip berita yang sedang ramai di media lain.
 *
 * Sumbernya RSS publik, bukan API berita berbayar. Konsekuensinya kita HANYA
 * dapat judul, ringkasan pendek, dan tautan — bukan isi artikel penuh.
 *
 * Hasilnya BOLEH dijadikan "bahan" untuk AI Draft Writer (lewat jenis bahan
 * "kutipan-media" di src/lib/ai.ts), tapi dengan pagar yang sama seperti
 * bahan lain: tetap harus melalui alur draf-tinjau-simpan manual di halaman
 * Tulis dengan AI, dan prompt jenis "kutipan-media" mewajibkan atribusi ke
 * media asal di tiap kalimat serta memaksa "perluDiverifikasi" berisi
 * peringatan bahwa ini rangkuman pemberitaan lain, bukan liputan independen.
 * Redaksi tetap wajib memverifikasi dan melengkapi liputannya sendiri
 * sebelum terbit — fitur ini mempercepat riset & draf awal, bukan
 * menggantikan kerja jurnalistik.
 */

import { prisma } from "@/lib/prisma";
import { askJson } from "@/lib/ai";

export interface BeritaEksternal {
  judul: string;
  sumber: string;
  url: string;
  ringkasan: string;
  waktu: string | null;
  /** Thumbnail resmi dari feed penerbit — pratinjau riset saja, lihat ambilGambar() */
  gambar: string | null;
}

interface SumberRss {
  nama: string;
  url: string;
}

/**
 * Feed yang sudah diverifikasi bisa diakses. Beberapa media besar
 * (Detik, Kompas, Bisnis) memblokir permintaan dari server, jadi tidak
 * dimasukkan — beritanya biasanya tetap terjaring lewat Google News.
 */
const SUMBER_UMUM: SumberRss[] = [
  { nama: "Google News", url: "https://news.google.com/rss?hl=id&gl=ID&ceid=ID:id" },
  { nama: "Antara", url: "https://www.antaranews.com/rss/terkini.xml" },
  { nama: "CNN Indonesia", url: "https://www.cnnindonesia.com/nasional/rss" },
  { nama: "Tempo", url: "https://rss.tempo.co/nasional" },
  { nama: "Republika", url: "https://www.republika.co.id/rss" },
  { nama: "Okezone", url: "https://sindikasi.okezone.com/index.php/rss/1/RSS2.0" },
];

const BATAS_WAKTU_MS = 8000;
const MAKS_PER_SUMBER = 15;

function decodeEntitas(teks: string): string {
  return teks
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");
}

/**
 * Sebagian feed (Google News) mengirim HTML yang di-escape, jadi tag baru
 * muncul SETELAH entitas didekode. Karena itu tag dibuang dua kali:
 * sebelum dan sesudah dekode.
 */
function bersihkanTeks(mentah: string): string {
  return decodeEntitas(decodeEntitas(mentah.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")).replace(/<[^>]+>/g, " "))
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function ambilTag(item: string, tag: string): string {
  const cocok = item.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, "i"));
  return cocok ? bersihkanTeks(cocok[1]) : "";
}

/**
 * Thumbnail RESMI yang disertakan penerbit di feed-nya sendiri
 * (<enclosure>, <media:content>, atau <media:thumbnail>). Dipakai HANYA
 * sebagai pratinjau kecil di panel riset admin — tidak pernah diunduh,
 * tidak masuk Media Library, tidak dipakai di artikel: menyalin foto media
 * lain adalah pelanggaran hak cipta (fotonya berlisensi, beda dari faktanya).
 */
function ambilGambar(item: string): string | null {
  const pola = [
    /<enclosure[^>]+url="([^"]+)"[^>]*type="image\/[^"]*"/i,
    /<media:content[^>]+url="([^"]+)"[^>]*(?:medium="image"|type="image\/[^"]*")/i,
    /<media:thumbnail[^>]+url="([^"]+)"/i,
    /<enclosure[^>]+url="([^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/i,
  ];
  for (const p of pola) {
    const cocok = item.match(p);
    if (cocok && /^https:\/\//i.test(cocok[1])) return decodeEntitas(cocok[1]);
  }
  return null;
}

function uraikanFeed(xml: string, namaSumber: string): BeritaEksternal[] {
  const items = xml.match(/<item(?:\s[^>]*)?>[\s\S]*?<\/item>/gi) ?? [];
  const hasil: BeritaEksternal[] = [];

  for (const item of items.slice(0, MAKS_PER_SUMBER)) {
    const judulMentah = ambilTag(item, "title");
    const url = ambilTag(item, "link");
    if (!judulMentah || !url) continue;

    // Google News mencantumkan media aslinya di <source> dan mengulangnya
    // sebagai akhiran " - Nama Media" pada judul. Nama media asli jauh lebih
    // berguna bagi redaksi daripada label "Google News".
    const sumberPenuh = ambilTag(item, "source") || namaSumber;
    const akhiran = ` - ${sumberPenuh}`;
    const judul = judulMentah.endsWith(akhiran)
      ? judulMentah.slice(0, -akhiran.length).trim()
      : judulMentah;
    // Sebagian media mendaftarkan nama panjang berisi tagline
    // ("detikFinance - Berita Ekonomi Bisnis, dan Investasi Hari Ini")
    const sumber = sumberPenuh.split(" - ")[0].trim();

    hasil.push({
      judul,
      sumber,
      url,
      ringkasan: ambilTag(item, "description").slice(0, 300),
      waktu: ambilTag(item, "pubDate") || null,
      gambar: ambilGambar(item),
    });
  }
  return hasil;
}

async function ambilSatuFeed(sumber: SumberRss): Promise<BeritaEksternal[]> {
  const pembatal = new AbortController();
  const timer = setTimeout(() => pembatal.abort(), BATAS_WAKTU_MS);
  try {
    const res = await fetch(sumber.url, {
      signal: pembatal.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; LinkProMedia/1.0)" },
      cache: "no-store",
    });
    if (!res.ok) return [];
    return uraikanFeed(await res.text(), sumber.nama);
  } catch {
    // Feed mati/diblokir tidak boleh menggagalkan seluruh riset
    return [];
  } finally {
    clearTimeout(timer);
  }
}

/** Judul yang sama sering muncul di beberapa feed sekaligus (Google News + aslinya) */
function kunciJudul(judul: string): string {
  return judul
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);
}

export interface HasilPencarian {
  berita: BeritaEksternal[];
  sumberBerhasil: string[];
  sumberGagal: string[];
}

/**
 * @param topik Kalau diisi, pencarian diarahkan ke topik itu lewat Google News
 *              search; kalau kosong, ambil headline umum dari semua feed.
 */
export async function cariBeritaEksternal(topik?: string): Promise<HasilPencarian> {
  const daftarSumber: SumberRss[] = topik?.trim()
    ? [
        {
          nama: "Google News",
          url: `https://news.google.com/rss/search?q=${encodeURIComponent(topik.trim())}&hl=id&gl=ID&ceid=ID:id`,
        },
        ...SUMBER_UMUM.filter((s) => s.nama !== "Google News"),
      ]
    : SUMBER_UMUM;

  const hasil = await Promise.all(daftarSumber.map((s) => ambilSatuFeed(s)));

  const sumberBerhasil: string[] = [];
  const sumberGagal: string[] = [];
  daftarSumber.forEach((s, i) => {
    (hasil[i].length > 0 ? sumberBerhasil : sumberGagal).push(s.nama);
  });

  // Saat mencari topik, feed umum ikut disaring supaya hasilnya tetap relevan
  const kataTopik = topik?.trim().toLowerCase().split(/\s+/).filter((k) => k.length > 3) ?? [];
  const relevan = (b: BeritaEksternal) =>
    kataTopik.length === 0 ||
    kataTopik.some((k) => `${b.judul} ${b.ringkasan}`.toLowerCase().includes(k));

  const terlihat = new Set<string>();
  const berita: BeritaEksternal[] = [];
  for (const b of hasil.flat()) {
    if (!relevan(b)) continue;
    const kunci = kunciJudul(b.judul);
    if (terlihat.has(kunci)) continue;
    terlihat.add(kunci);
    berita.push(b);
  }

  return { berita, sumberBerhasil, sumberGagal };
}

export interface TopikRamai {
  judul: string;
  ringkasan: string;
  jumlahMedia: number;
  /** Total berita di topik ini — bisa lebih banyak dari yang ditampilkan */
  jumlahBerita: number;
  berita: BeritaEksternal[];
  sudahDiliput: boolean;
  artikelKita: { id: string; title: string }[];
}

export interface HasilRiset {
  topik: TopikRamai[];
  /** Topik ramai yang disembunyikan karena sudah kita liput */
  jumlahSudahDiliput: number;
  totalBerita: number;
  sumberBerhasil: string[];
  sumberGagal: string[];
  topik_dicari?: string;
}

/** Kandidat yang diproses — lebih banyak dari yang ditampilkan, sebagai cadangan */
const MAKS_KANDIDAT = 10;
/** Topik yang benar-benar ditampilkan ke redaksi */
const MAKS_TAMPIL = 6;

/** Berapa headline yang dikirim ke AI untuk dikelompokkan */
const MAKS_DIKIRIM_KE_AI = 50;

interface KelompokAi {
  judul: string;
  ringkasan: string;
  kataKunci: string[];
  indeks: number[];
}

/**
 * AI HANYA mengelompokkan dan memberi label headline yang kita kirim, lalu
 * mengembalikan NOMOR URUT-nya. Judul, tautan, dan nama media tetap diambil
 * dari data asli hasil RSS — bukan dari tulisan AI. Dengan begitu tautan
 * palsu atau judul karangan tidak mungkin lolos ke redaksi.
 */
async function kelompokkanTopik(berita: BeritaEksternal[]): Promise<KelompokAi[]> {
  const daftar = berita
    .slice(0, MAKS_DIKIRIM_KE_AI)
    .map((b, i) => `${i}. [${b.sumber}] ${b.judul}`)
    .join("\n");

  const data = await askJson<{ topik: KelompokAi[] }>(
    [
      "Kamu adalah redaktur yang memantau pemberitaan media lain untuk rapat redaksi.",
      "Kamu diberi daftar judul berita bernomor dari berbagai media.",
      // Diminta lebih banyak dari yang akhirnya ditampilkan (6), karena topik
      // yang sudah kita liput nanti dibuang — tanpa cadangan, daftarnya jadi
      // menyusut alih-alih terisi topik lain
      "Tugasmu: KELOMPOKKAN judul-judul itu menjadi 5-10 topik.",
      "ATURAN MUTLAK: hanya gunakan judul yang ada di daftar. DILARANG menambah peristiwa,",
      "angka, nama, atau detail apa pun yang tidak tertulis di daftar. Kamu tidak tahu apa pun",
      "di luar daftar ini.",
      "SATU TOPIK = SATU PERISTIWA SPESIFIK yang sama, bukan kategori luas.",
      'Contoh topik BENAR: "Kebakaran KMP Mutiara Sentosa", "Kunjungan PM Thailand ke RI".',
      'Contoh topik SALAH (terlalu luas, dilarang): "Kriminal", "Olahraga", "Ekonomi", "Internasional".',
      "Sebuah judul hanya boleh masuk kelompok kalau benar-benar membahas peristiwa yang SAMA.",
      "JANGAN memaksakan judul masuk kelompok hanya karena temanya mirip. Lebih baik 3 topik",
      "yang rapat daripada 6 topik yang isinya campur aduk. Judul yang berdiri sendiri diabaikan saja.",
      "Untuk setiap topik isi: \"judul\" (nama peristiwa, maks 8 kata), \"ringkasan\" (1 kalimat,",
      "maks 25 kata, hanya menyimpulkan judul-judul yang masuk kelompok itu),",
      "\"kataKunci\" (2-4 kata kunci khas peristiwa itu — nama orang, tempat, atau lembaga yang",
      "muncul di judulnya, bukan kata umum seperti \"berita\" atau \"kasus\"),",
      "dan \"indeks\" (array NOMOR judul yang masuk kelompok ini).",
      "Urutkan topik dari yang paling banyak diberitakan.",
      'Balas HANYA JSON valid: {"topik": [{"judul": string, "ringkasan": string, "kataKunci": string[], "indeks": number[]}]}.',
    ].join(" "),
    daftar
  );

  return Array.isArray(data.topik) ? data.topik : [];
}

/**
 * Mencari artikel kita sendiri yang sudah membahas topik ini. Ini bagian
 * paling berguna bagi redaksi: bukan sekadar "apa yang ramai", tapi
 * "apa yang ramai TAPI belum kita liput".
 */
async function cariLiputanKita(kataKunci: string[]): Promise<{ id: string; title: string }[]> {
  const kata = kataKunci.filter((k) => k.trim().length > 3).slice(0, 4);
  if (kata.length === 0) return [];

  const sejak = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const kandidat = await prisma.article.findMany({
    where: {
      status: { in: ["PUBLISHED", "SCHEDULED", "IN_REVIEW", "DRAFT"] },
      createdAt: { gte: sejak },
      OR: kata.map((k) => ({ title: { contains: k, mode: "insensitive" as const } })),
    },
    take: 10,
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true },
  });

  // Query di atas memakai OR, jadi SATU kata kunci umum saja sudah menarik
  // artikel yang peristiwanya sama sekali berbeda — kata "kebakaran" pernah
  // membuat topik kebakaran gunung dianggap sudah diliput karena kita punya
  // artikel kebakaran KAPAL. Salah klaim begini berbahaya: redaksi bisa
  // melewatkan berita yang sebenarnya belum diliput.
  //
  // Karena itu keanggotaan diverifikasi ulang di kode: kalau kata kuncinya
  // lebih dari satu, artikel wajib memuat MINIMAL DUA di antaranya.
  const minCocok = kata.length >= 2 ? 2 : 1;
  return kandidat
    .filter((a) => {
      const judul = a.title.toLowerCase();
      const cocok = kata.filter((k) => judul.includes(k.toLowerCase())).length;
      return cocok >= minCocok;
    })
    .slice(0, 3);
}

/**
 * Penyaring di level kode. AI tetap sering menyelipkan judul yang temanya
 * mirip tapi peristiwanya beda (mis. "Hutan Bromo Terbakar" ikut masuk topik
 * kapal terbakar), jadi keanggotaan diverifikasi ulang secara mekanis:
 * judul wajib benar-benar memuat salah satu kata khas topiknya.
 */
function anggotaBenarBenarCocok(berita: BeritaEksternal, judulTopik: string, kataKunci: string[]): boolean {
  const teks = berita.judul.toLowerCase();
  const penanda = [...kataKunci, ...judulTopik.split(/\s+/)]
    .map((k) => k.toLowerCase().replace(/[^a-z0-9]/g, ""))
    .filter((k) => k.length > 3);

  if (penanda.length === 0) return true;
  return penanda.some((k) => teks.includes(k));
}

/**
 * Kata yang menandakan judul topik cuma keranjang serba-ada, bukan satu
 * peristiwa — mis. "Kebakaran di Berbagai Lokasi" atau "Olahraga Lainnya".
 */
const PENANDA_KERANJANG = [
  "berbagai",
  "lainnya",
  "beragam",
  "aneka",
  "seputar",
  "sekitar",
  "dan lain",
  "terkini",
  "terbaru",
  "update",
];

/**
 * Prompt SUDAH melarang topik payung ("SATU TOPIK = SATU PERISTIWA SPESIFIK"),
 * tapi model tetap sesekali mengelompokkan peristiwa berbeda jadi satu — mis.
 * kebakaran gunung digabung kebakaran kapal dengan judul "Kebakaran di
 * Berbagai Lokasi". Topik seperti itu tidak berguna bagi redaksi: tidak bisa
 * jadi satu artikel, dan cek liputannya pasti melenceng. Jadi dibuang di kode,
 * bukan sekadar diminta lewat prompt.
 */
function topikTerlaluLuas(judul: string): boolean {
  const j = judul.toLowerCase();
  return PENANDA_KERANJANG.some((p) => j.includes(p));
}

export async function risetBeritaEksternal(topik?: string): Promise<HasilRiset> {
  const { berita, sumberBerhasil, sumberGagal } = await cariBeritaEksternal(topik);

  if (berita.length === 0) {
    return {
      topik: [],
      jumlahSudahDiliput: 0,
      totalBerita: 0,
      sumberBerhasil,
      sumberGagal,
      topik_dicari: topik,
    };
  }

  const kelompok = await kelompokkanTopik(berita);

  const hasil = await Promise.all(
    kelompok.slice(0, MAKS_KANDIDAT).map(async (k) => {
      if (topikTerlaluLuas(k.judul ?? "")) return null;

      // Indeks di luar jangkauan diabaikan, bukan dipaksakan jadi data kosong
      const anggota = (Array.isArray(k.indeks) ? k.indeks : [])
        .filter((i) => Number.isInteger(i) && i >= 0 && i < berita.length)
        .map((i) => berita[i])
        .filter((b) => anggotaBenarBenarCocok(b, k.judul ?? "", k.kataKunci ?? []));
      if (anggota.length === 0) return null;

      const artikelKita = await cariLiputanKita(k.kataKunci ?? []);
      return {
        judul: k.judul,
        ringkasan: k.ringkasan,
        jumlahMedia: new Set(anggota.map((a) => a.sumber)).size,
        jumlahBerita: anggota.length,
        berita: anggota.slice(0, 5),
        sudahDiliput: artikelKita.length > 0,
        artikelKita,
      };
    })
  );

  // "Ramai" diukur dari berapa MEDIA yang meliput, bukan berapa artikel.
  // Lima artikel dari satu media saja bukan pertanda isu besar; dua media
  // berbeda yang mengangkat hal sama jauh lebih layak jadi perhatian redaksi.
  const semua = hasil
    .filter((t): t is TopikRamai => t !== null)
    .sort((a, b) => b.jumlahMedia - a.jumlahMedia || b.jumlahBerita - a.jumlahBerita);

  // Gunanya fitur ini adalah menemukan yang TERLEWAT, jadi topik yang sudah
  // kita liput disembunyikan dan slotnya diisi topik berikutnya. Jumlah yang
  // disembunyikan tetap dilaporkan — daftar yang diam-diam dipangkas bikin
  // redaksi mengira memang cuma segitu yang ramai hari ini.
  const belumDiliput = semua.filter((t) => !t.sudahDiliput);
  const jumlahDisembunyikan = semua.length - belumDiliput.length;

  return {
    topik: belumDiliput.slice(0, MAKS_TAMPIL),
    jumlahSudahDiliput: jumlahDisembunyikan,
    totalBerita: berita.length,
    sumberBerhasil,
    sumberGagal,
    topik_dicari: topik,
  };
}
