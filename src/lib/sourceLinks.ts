/**
 * Tautan sumber otomatis untuk draf yang disusun dari bahan media lain
 * (kutipan-media, riset-web) — ditempel MEKANIS ke akhir konten, bukan
 * diminta lewat prompt AI, supaya URL-nya selalu persis yang benar-benar
 * dipakai sebagai bahan, tidak pernah salah ketik atau diarang AI.
 *
 * Alasan pakai ini (bukan cuma atribusi "menurut X" di kalimat): link yang
 * bisa diklik memperkuat posisi kami sebagai perujuk yang mengarahkan
 * traffic balik ke penerbit asli, bukan sekadar menyalin — mengurangi
 * risiko dianggap "kloning berita" tanpa nilai tambah.
 */

export interface SumberTautan {
  nama: string;
  url: string;
}

const MAKS_TAUTAN = 10;

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Menambahkan blok "Sumber:" berisi tautan ke tiap URL asli di akhir
 * content HTML. rel="nofollow": kredit tetap diberikan ke pembaca tanpa
 * meneruskan nilai SEO ke domain lain — praktik umum media saat mengutip.
 */
export function sisipkanTautanSumber(content: string, sumber: SumberTautan[]): string {
  const unik = new Map<string, string>();
  for (const s of sumber) {
    const url = s.url?.trim();
    const nama = s.nama?.trim();
    if (!url || !nama || !/^https:\/\//i.test(url) || unik.has(url)) continue;
    unik.set(url, nama);
  }
  if (unik.size === 0) return content;

  const daftar = [...unik.entries()]
    .slice(0, MAKS_TAUTAN)
    .map(
      ([url, nama]) =>
        `<li><a href="${escapeHtml(url)}" target="_blank" rel="nofollow noopener noreferrer">${escapeHtml(nama)}</a></li>`
    )
    .join("");

  return `${content}<hr><p><strong>Sumber:</strong></p><ul>${daftar}</ul>`;
}
