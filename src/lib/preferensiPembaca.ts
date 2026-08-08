import { cookies } from "next/headers";

/**
 * Baca preferensi kategori pembaca dari cookie lp-pref.
 * Dihasilkan oleh PreferensiRecorder di sisi klien — server cukup membaca cookie.
 */
export async function getPreferensiKategori(): Promise<string[]> {
  try {
    const store = await cookies();
    const raw = store.get("lp-pref")?.value;
    if (!raw) return [];
    return decodeURIComponent(raw)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}
