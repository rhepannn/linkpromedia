import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { hexValid, susunVariabelTema, type TemaKustom } from "@/lib/warna";

/**
 * Tema kustom dari halaman Pengaturan admin.
 *
 * Dibaca root layout pada TIAP render, jadi dua hal dijaga ketat di sini:
 * 1. cache() — supaya satu render cuma satu query, bukan per-komponen.
 * 2. Kegagalan DB TIDAK BOLEH menjatuhkan layout: root layout sebelumnya
 *    bebas query DB (halaman login/chatbot sengaja diletakkan di luar grup
 *    (public) justru untuk lolos saat DB mati). Kalau query gagal, kembalikan
 *    null — situs tampil dengan warna bawaan, bukan error 500.
 */
export const getTemaKustom = cache(async (): Promise<TemaKustom | null> => {
  try {
    const baris = await prisma.siteSetting.findMany({
      where: { key: { in: ["warnaPrimer", "warnaAksen"] } },
    });
    const peta = new Map(baris.map((b) => [b.key, b.value]));
    const warnaPrimer = peta.get("warnaPrimer");
    const warnaAksen = peta.get("warnaAksen");
    // Dua-duanya harus ada dan valid; kalau tidak, anggap belum diatur
    if (!warnaPrimer || !warnaAksen || !hexValid(warnaPrimer) || !hexValid(warnaAksen)) {
      return null;
    }
    return { warnaPrimer, warnaAksen };
  } catch {
    return null;
  }
});

/** CSS siap-suntik untuk root layout — null berarti pakai warna bawaan */
export async function cssTemaKustom(): Promise<string | null> {
  const tema = await getTemaKustom();
  if (!tema) return null;
  const vars = susunVariabelTema(tema);
  const isi = Object.entries(vars)
    .map(([k, v]) => `${k}:${v}`)
    .join(";");
  return `:root{${isi}}`;
}
