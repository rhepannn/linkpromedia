/**
 * Utilitas tema kustom: dari SATU warna merek pilihan pemilik, turunkan
 * seluruh rampa primary-50..800 supaya hubungan terang-gelap antar langkah
 * tetap sama seperti palet bawaan. Pemilik cukup memilih satu warna —
 * bukan sembilan — dan seluruh situs tetap konsisten.
 *
 * Berkas ini dipakai server (menyusun <style> dari pengaturan DB) dan
 * client (pratinjau langsung di halaman Pengaturan), jadi tanpa dependensi.
 */

export interface Hsl {
  h: number;
  s: number;
  l: number;
}

export function hexValid(hex: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(hex.trim());
}

export function hexKeHsl(hex: string): Hsl {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const maks = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (maks + min) / 2;
  if (maks === min) return { h: 0, s: 0, l: l * 100 };
  const d = maks - min;
  const s = l > 0.5 ? d / (2 - maks - min) : d / (maks + min);
  let h: number;
  if (maks === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
  else if (maks === g) h = ((b - r) / d + 2) * 60;
  else h = ((r - g) / d + 4) * 60;
  return { h, s: s * 100, l: l * 100 };
}

export function hslKeHex({ h, s, l }: Hsl): string {
  const sN = s / 100;
  const lN = l / 100;
  const c = (1 - Math.abs(2 * lN - 1)) * sN;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lN - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const ke = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, "0");
  return `#${ke(r)}${ke(g)}${ke(b)}`;
}

/**
 * Tingkat terang tiap langkah, DIUKUR dari palet navy bawaan — bukan angka
 * kira-kira. Dengan mempertahankan kurva ini, semua rasio kontras yang sudah
 * lolos audit (teks putih di atas 600, primary-300 di latar gelap, dst.)
 * ikut terjaga untuk warna merek apa pun yang dipilih pemilik.
 */
const KURVA_TERANG: Record<string, number> = {
  "50": 94,
  "100": 87,
  "200": 74,
  "300": 61,
  "400": 48,
  "500": 37,
  "600": 27,
  "700": 19,
  "800": 13,
};

export type RampaPrimer = Record<keyof typeof KURVA_TERANG, string>;

/** Warna dasar dianggap sebagai "600" (warna merek utama), sisanya diturunkan */
export function buatRampaPrimer(hexDasar: string): RampaPrimer {
  const { h, s } = hexKeHsl(hexDasar);
  const rampa = {} as RampaPrimer;
  for (const [langkah, l] of Object.entries(KURVA_TERANG)) {
    // Langkah sangat terang sedikit dilunakkan saturasinya supaya tidak neon
    const sFinal = Number(langkah) <= 100 ? Math.min(s, 65) : s;
    rampa[langkah as keyof RampaPrimer] = hslKeHex({ h, s: sFinal, l });
  }

  // Jaminan keras, bukan sekadar kurva: teks putih di atas 600 (tombol,
  // badge kategori) WAJIB ≥ 4.5:1. Hijau/kuning neon sangat luminan sehingga
  // kurva bawaan bisa meleset tipis (terukur 4.4996 pada #39ff14) — gelapkan
  // 600 selangkah demi selangkah sampai lolos, langkah lain tidak disentuh.
  let l600 = KURVA_TERANG["600"];
  while (rasioKontras("#ffffff", rampa["600"]) < 4.5 && l600 > 8) {
    l600 -= 1;
    rampa["600"] = hslKeHex({ h, s, l: l600 });
  }
  return rampa;
}

/**
 * Teks senada untuk dipakai DI ATAS warna aksen (badge). Normalnya versi
 * gelap pekat; tapi kalau aksennya sendiri gelap (mis. hitam/navy) versi
 * gelap tidak terbaca (terukur 1.23:1 pada aksen hitam) — beralih ke versi
 * terang senada supaya keterbacaan terjamin untuk aksen apa pun.
 */
export function turunkanAksenText(hexAksen: string): string {
  const { h, s } = hexKeHsl(hexAksen);
  const gelap = hslKeHex({ h, s: Math.min(s, 90), l: 8 });
  // Versi gelap dipertahankan selama lolos (estetika badge bawaan); kalau
  // tidak, pakai kandidat dengan kontras TERTINGGI — aksen abu-abu tengah
  // tidak bisa mencapai 4.5 dari dua arah, jadi "yang terbaik" adalah
  // jaminan maksimal yang mungkin, dan halaman Pengaturan tetap menampilkan
  // peringatan kontras kepada admin untuk kasus seperti itu.
  if (rasioKontras(gelap, hexAksen) >= 4.5) return gelap;
  const terang = hslKeHex({ h, s: Math.min(s, 60), l: 96 });
  return rasioKontras(terang, hexAksen) > rasioKontras(gelap, hexAksen) ? terang : gelap;
}

/** Luminansi relatif WCAG */
function luminansi(hex: string): number {
  const kanal = [hex.slice(1, 3), hex.slice(3, 5), hex.slice(5, 7)].map((c) => {
    const v = parseInt(c, 16) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * kanal[0] + 0.7152 * kanal[1] + 0.0722 * kanal[2];
}

export function rasioKontras(hexA: string, hexB: string): number {
  const l1 = luminansi(hexA);
  const l2 = luminansi(hexB);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

export interface TemaKustom {
  warnaPrimer: string;
  warnaAksen: string;
}

/**
 * Susun deklarasi CSS variable dari tema kustom. Dipakai server (inject di
 * layout) dan client (pratinjau) — HARUS menghasilkan properti yang sama.
 */
export function susunVariabelTema(tema: TemaKustom): Record<string, string> {
  const rampa = buatRampaPrimer(tema.warnaPrimer);
  const vars: Record<string, string> = {};
  for (const [langkah, hex] of Object.entries(rampa)) {
    vars[`--color-primary-${langkah}`] = hex;
  }
  vars["--color-accent"] = tema.warnaAksen;
  vars["--color-accent-text"] = turunkanAksenText(tema.warnaAksen);
  return vars;
}
