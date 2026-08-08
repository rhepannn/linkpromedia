/**
 * Format tanggal ke format Indonesia
 * Contoh: "25 Juli 2026"
 */
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "";
  return new Date(date).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/**
 * Format tanggal relatif
 * Contoh: "2 jam lalu", "3 hari lalu"
 */
export function formatRelativeDate(date: Date | string): string {
  const now = new Date();
  const d = new Date(date);
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 60) return `${diffMins} menit lalu`;
  if (diffHours < 24) return `${diffHours} jam lalu`;
  if (diffDays < 7) return `${diffDays} hari lalu`;
  return formatDate(date);
}

/**
 * Format tanggal + jam untuk ditampilkan singkat
 * Contoh: "25 Jul 2026, 14:30"
 */
export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "";
  return new Date(date).toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Konversi Date ke string kompatibel <input type="datetime-local">
 * Contoh: "2026-07-25T14:30"
 */
export function toDatetimeLocalValue(date: Date | string): string {
  const d = new Date(date);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Potong teks ke panjang tertentu
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + "…";
}

/** Hitung jumlah kata dari konten HTML artikel (dipakai untuk deteksi konten tipis) */
export function countWords(html: string): number {
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return text ? text.split(" ").length : 0;
}

/**
 * Ambang batas jumlah kata sebelum artikel dianggap "konten tipis".
 * Artikel di bawah ambang ini tetap tayang untuk pembaca, tapi ditandai
 * noindex dan tidak dimasukkan sitemap — supaya anggaran crawl mesin
 * pencari tidak habis terbuang di ribuan halaman yang isinya cuma
 * beberapa kalimat begitu arsip situs membesar.
 */
export const MIN_INDEXABLE_WORDS = 150;

/**
 * Alamat dasar situs, DINORMALKAN — selalu ber-skema dan tanpa garis miring
 * penutup.
 *
 * Kenapa perlu: di dashboard Vercel orang hampir selalu mengetik env var
 * tanpa "https://" (cukup "situs.vercel.app"). `new URL()` atas nilai
 * seperti itu melempar ERR_INVALID_URL dan MENGGAGALKAN SELURUH BUILD —
 * persis yang terjadi pada deploy pertama proyek ini. Menambahkan skema di
 * sini membuat kesalahan pengisian yang wajar itu tidak lagi fatal.
 */
export function siteBaseUrl(): string {
  const mentah = (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    "https://linkpromedia.id"
  ).trim();
  const berSkema = /^https?:\/\//i.test(mentah) ? mentah : `https://${mentah}`;
  return berSkema.replace(/\/+$/, "");
}

/**
 * Buat URL absolut dari path relatif
 */
export function absoluteUrl(path: string): string {
  return `${siteBaseUrl()}${path}`;
}
