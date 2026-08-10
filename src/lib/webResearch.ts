/**
 * Riset web via Tavily (tavily.com) — mesin pencari untuk AI.
 *
 * Ini pelengkap newsDiscovery (RSS): RSS menjawab "apa yang sedang ramai",
 * riset web menjawab "apa kata sumber resmi dan media soal topik X".
 * Hasilnya dirakit jadi BAHAN untuk draftArticleFromSource (jenis
 * "riset-web") — aturan anti-halusinasi tetap berlaku penuh: AI hanya boleh
 * menulis dari cuplikan yang benar-benar ditemukan, dengan atribusi + URL.
 *
 * Kunci API dibaca dari TAVILY_API_KEY. Tanpa kunci, fitur menolak dengan
 * pesan yang menjelaskan cara memasangnya — bukan error membingungkan.
 * Paket gratis Tavily: 1.000 kredit/bulan; satu riset di sini memakai
 * 2 kredit (dua pencarian basic).
 */

export interface SumberRiset {
  judul: string;
  url: string;
  domain: string;
  cuplikan: string;
  /** true bila berasal dari situs resmi pemerintah/lembaga (prioritas Level 1) */
  resmi: boolean;
}

export interface HasilRisetWeb {
  sumber: SumberRiset[];
  jumlahResmi: number;
}

const BATAS_WAKTU_MS = 10_000;

/**
 * Domain resmi yang diprioritaskan sebagai sumber primer (Level 1).
 * Daftar untuk include_domains Tavily; penandaan "resmi" sendiri memakai
 * aturan lebih longgar (semua *.go.id) di tandaiResmi di bawah.
 */
const DOMAIN_RESMI = [
  "bps.go.id",
  "bi.go.id",
  "kemenkeu.go.id",
  "ojk.go.id",
  "bmkg.go.id",
  "bnpb.go.id",
  "kemenkes.go.id",
  "kemendag.go.id",
  "esdm.go.id",
  "setkab.go.id",
  "kpu.go.id",
  "idx.co.id",
];

export function tavilyTersedia(): boolean {
  return !!process.env.TAVILY_API_KEY?.trim();
}

function tandaiResmi(domain: string): boolean {
  return domain.endsWith(".go.id") || domain === "idx.co.id";
}

function ambilDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

interface TavilyResult {
  title?: string;
  url?: string;
  content?: string;
}

async function cariTavily(
  query: string,
  opsi: { includeDomains?: string[]; maksHasil: number; topikBerita: boolean }
): Promise<TavilyResult[]> {
  const pembatal = new AbortController();
  const timer = setTimeout(() => pembatal.abort(), BATAS_WAKTU_MS);
  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.TAVILY_API_KEY}`,
      },
      body: JSON.stringify({
        query,
        search_depth: "basic",
        max_results: opsi.maksHasil,
        include_answer: false,
        // "news" membatasi ke pemberitaan terbaru; pencarian sumber resmi
        // justru butuh cakupan umum (laporan/statistik lama tetap relevan)
        ...(opsi.topikBerita ? { topic: "news", days: 30 } : {}),
        ...(opsi.includeDomains?.length ? { include_domains: opsi.includeDomains } : {}),
        country: "indonesia",
      }),
      signal: pembatal.signal,
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { results?: TavilyResult[] };
    return Array.isArray(data.results) ? data.results : [];
  } catch {
    // Satu pencarian gagal bukan alasan menggagalkan riset — pencarian lain
    // mungkin berhasil; kegagalan total ditangani pemanggil (sumber kosong)
    return [];
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Riset topik: dua pencarian paralel — pemberitaan terbaru + situs resmi —
 * lalu digabung tanpa duplikat, sumber resmi didahulukan.
 */
export async function risetWeb(topik: string): Promise<HasilRisetWeb> {
  const kueri = topik.trim().slice(0, 200);
  const [berita, resmi] = await Promise.all([
    cariTavily(kueri, { maksHasil: 6, topikBerita: true }),
    cariTavily(kueri, { maksHasil: 4, topikBerita: false, includeDomains: DOMAIN_RESMI }),
  ]);

  const perUrl = new Map<string, SumberRiset>();
  // Urutan penting: hasil resmi dimasukkan lebih dulu supaya kalau URL sama
  // muncul di kedua pencarian, versi bertanda resmi yang menang
  for (const r of [...resmi, ...berita]) {
    const url = r.url?.trim();
    const cuplikan = r.content?.replace(/\s+/g, " ").trim() ?? "";
    if (!url || !r.title?.trim() || cuplikan.length < 40 || perUrl.has(url)) continue;
    const domain = ambilDomain(url);
    if (!domain) continue;
    perUrl.set(url, {
      judul: r.title.trim(),
      url,
      domain,
      cuplikan: cuplikan.slice(0, 900),
      resmi: tandaiResmi(domain),
    });
  }

  const sumber = [...perUrl.values()].sort((a, b) => Number(b.resmi) - Number(a.resmi)).slice(0, 8);
  return { sumber, jumlahResmi: sumber.filter((s) => s.resmi).length };
}
