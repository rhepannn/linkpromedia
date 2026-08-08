/**
 * Serah-terima data draf antar halaman admin lewat sessionStorage, bukan
 * query string: isinya bisa beberapa ribu karakter (bahan mentah atau isi
 * artikel HTML) dan tidak seharusnya muncul di URL. Tiap fungsi "ambil"
 * menghapus datanya segera setelah dibaca, supaya tidak dipakai ulang kalau
 * halaman tujuan dibuka lagi nanti secara terpisah.
 */

const KUNCI_BAHAN = "linkpromedia:bahan-draf";
const KUNCI_DRAFT_SIAP = "linkpromedia:draft-siap-isi";

/** Bahan mentah untuk halaman Tulis dengan AI (tempel manual) */
export interface BahanDraf {
  bahan: string;
  jenis: string;
  arahan?: string;
}

export function kirimBahanDraf(data: BahanDraf): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(KUNCI_BAHAN, JSON.stringify(data));
}

export function ambilBahanDraf(): BahanDraf | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(KUNCI_BAHAN);
    if (!raw) return null;
    window.sessionStorage.removeItem(KUNCI_BAHAN);
    const data = JSON.parse(raw);
    if (typeof data?.bahan !== "string" || typeof data?.jenis !== "string") return null;
    return data;
  } catch {
    return null;
  }
}

/** Draf yang SUDAH disusun AI (dari ChatBot) untuk langsung mengisi form Artikel Baru */
export interface DraftSiapIsi {
  title: string;
  excerpt: string;
  content: string;
  perluDiverifikasi: string[];
  /** Kategori pilihan AI — hanya diisi kalau keyakinannya tinggi */
  categoryId?: string;
  categoryNama?: string;
}

export function kirimDraftSiapIsi(data: DraftSiapIsi): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(KUNCI_DRAFT_SIAP, JSON.stringify(data));
}

export function ambilDraftSiapIsi(): DraftSiapIsi | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(KUNCI_DRAFT_SIAP);
    if (!raw) return null;
    window.sessionStorage.removeItem(KUNCI_DRAFT_SIAP);
    const data = JSON.parse(raw);
    if (typeof data?.title !== "string" || typeof data?.content !== "string") return null;
    return {
      title: data.title,
      excerpt: typeof data.excerpt === "string" ? data.excerpt : "",
      content: data.content,
      perluDiverifikasi: Array.isArray(data.perluDiverifikasi)
        ? data.perluDiverifikasi.filter((v: unknown) => typeof v === "string")
        : [],
      ...(typeof data.categoryId === "string" && { categoryId: data.categoryId }),
      ...(typeof data.categoryNama === "string" && { categoryNama: data.categoryNama }),
    };
  } catch {
    return null;
  }
}
