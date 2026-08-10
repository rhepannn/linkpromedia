/**
 * Rantai penyedia AI teks — supaya kuota gratis tidak jadi titik mati tunggal.
 *
 * Urutan: Groq (utama, teruji) → Cerebras (gpt-oss-120b — katalog Cerebras
 * 2026 tidak lagi memuat llama-3.3-70b) → Gemini (cadangan terakhir).
 * Ketiganya memakai API berformat OpenAI, jadi satu pemanggil cukup.
 * Model cadangan berbeda dari model utama — seluruh aturan keras (anti
 * halusinasi, atribusi) tetap ditegakkan lewat prompt + backstop kode,
 * bukan bergantung pada model tertentu.
 *
 * Aturan pindah penyedia:
 * - 429 (kuota habis) / 5xx / gangguan jaringan → coba penyedia berikutnya.
 * - Penyedia tanpa API key di env dilewati diam-diam — memasang kunci baru
 *   cukup lewat env var, tanpa ubah kode.
 * - Kalau SEMUA gagal, lempar error dari kegagalan TERAKHIR dengan `status`
 *   terjaga — pesanErrorAi di ai.ts mengubah 429 jadi pesan ramah berjam.
 */

export interface PesanChat {
  role: "system" | "user" | "assistant";
  content: string;
}

interface PenyediaAi {
  nama: string;
  url: string;
  model: string;
  kunciEnv: string;
}

const RANTAI_PENYEDIA: PenyediaAi[] = [
  {
    nama: "Groq",
    url: "https://api.groq.com/openai/v1/chat/completions",
    model: "llama-3.3-70b-versatile",
    kunciEnv: "GROQ_API_KEY",
  },
  {
    nama: "Cerebras",
    url: "https://api.cerebras.ai/v1/chat/completions",
    model: "gpt-oss-120b",
    kunciEnv: "CEREBRAS_API_KEY",
  },
  {
    nama: "Gemini",
    url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
    // Alias "latest", bukan versi terpaku: versi lama ditutup bergiliran
    // untuk akun baru (2.0 dan 2.5 sama-sama terbukti ditolak, Agu 2026) —
    // alias ini selalu menunjuk model flash yang sedang berlaku
    model: "gemini-flash-latest",
    kunciEnv: "GEMINI_API_KEY",
  },
];

/** Error dengan status HTTP terjaga supaya penanganan 429 di hulu tetap bekerja */
export class ErrorPenyediaAi extends Error {
  status: number;
  penyedia: string;
  constructor(penyedia: string, status: number, pesan: string) {
    super(pesan);
    this.name = "ErrorPenyediaAi";
    this.status = status;
    this.penyedia = penyedia;
  }
}

const BATAS_WAKTU_MS = 60_000;

export interface OpsiChat {
  messages: PesanChat[];
  temperature: number;
  maxTokens: number;
  /** true = minta JSON object (response_format) */
  json?: boolean;
}

/**
 * Panggil rantai penyedia berurutan; kembalikan isi pesan pertama yang sukses.
 */
export async function chatDenganCadangan(opsi: OpsiChat): Promise<string> {
  const tersedia = RANTAI_PENYEDIA.filter((p) => !!process.env[p.kunciEnv]?.trim());
  if (tersedia.length === 0) {
    throw new ErrorPenyediaAi("(tidak ada)", 500, "Tidak ada API key penyedia AI yang terpasang.");
  }

  let terakhir: ErrorPenyediaAi | null = null;

  for (const p of tersedia) {
    const pembatal = new AbortController();
    const timer = setTimeout(() => pembatal.abort(), BATAS_WAKTU_MS);
    try {
      const res = await fetch(p.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env[p.kunciEnv]}`,
        },
        body: JSON.stringify({
          model: p.model,
          temperature: opsi.temperature,
          max_tokens: opsi.maxTokens,
          ...(opsi.json ? { response_format: { type: "json_object" } } : {}),
          messages: opsi.messages,
        }),
        signal: pembatal.signal,
        cache: "no-store",
      });

      if (!res.ok) {
        const badan = await res.text().catch(() => "");
        terakhir = new ErrorPenyediaAi(p.nama, res.status, `${res.status} ${badan.slice(0, 600)}`);
        // 4xx selain 429 (mis. permintaan tak valid) kemungkinan besar gagal
        // juga di penyedia lain — tapi bisa saja spesifik model (fitur tak
        // didukung), jadi tetap dicoba lanjut; yang penting error terakhir
        // yang dilempar, bukan ditelan.
        continue;
      }

      const data = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const isi = data.choices?.[0]?.message?.content;
      if (typeof isi === "string" && isi.trim()) {
        if (p.nama !== "Groq") {
          // Jejak untuk memantau seberapa sering cadangan terpakai
          console.log(`AI fallback aktif: ${p.nama} (${p.model})`);
        }
        return isi;
      }
      terakhir = new ErrorPenyediaAi(p.nama, 502, "Respons penyedia kosong.");
    } catch (e) {
      if (e instanceof ErrorPenyediaAi) {
        terakhir = e;
      } else {
        terakhir = new ErrorPenyediaAi(p.nama, 503, (e as Error)?.message ?? "Gangguan jaringan.");
      }
    } finally {
      clearTimeout(timer);
    }
  }

  throw terakhir ?? new ErrorPenyediaAi("(tidak ada)", 500, "Semua penyedia AI gagal.");
}
