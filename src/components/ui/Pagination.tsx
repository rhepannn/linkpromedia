import Link from "next/link";

interface Props {
  halaman: number;
  totalHalaman: number;
  /** Path dasar tanpa query, mis. "/kategori/nasional" */
  basePath: string;
}

/**
 * Navigasi antar halaman daftar artikel.
 *
 * Memakai tautan biasa (bukan tombol JavaScript) supaya mesin pencari bisa
 * menelusuri arsip lama — kalau halaman 2 dan seterusnya cuma bisa dibuka
 * lewat klik, artikel lama tidak akan pernah terindeks.
 */
export default function Pagination({ halaman, totalHalaman, basePath }: Props) {
  if (totalHalaman <= 1) return null;

  const url = (h: number) => (h === 1 ? basePath : `${basePath}?hal=${h}`);

  // Tampilkan jendela sempit di sekitar halaman aktif supaya tetap ringkas
  // walau arsipnya ratusan halaman
  const nomor: (number | "…")[] = [];
  const awal = Math.max(1, halaman - 2);
  const akhir = Math.min(totalHalaman, halaman + 2);

  if (awal > 1) {
    nomor.push(1);
    if (awal > 2) nomor.push("…");
  }
  for (let i = awal; i <= akhir; i++) nomor.push(i);
  if (akhir < totalHalaman) {
    if (akhir < totalHalaman - 1) nomor.push("…");
    nomor.push(totalHalaman);
  }

  const tautanClass =
    "min-w-9 h-9 px-3 inline-flex items-center justify-center rounded-lg border text-sm transition-colors";

  return (
    <nav aria-label="Navigasi halaman" className="mt-10 flex flex-wrap items-center justify-center gap-2">
      {halaman > 1 && (
        <Link
          href={url(halaman - 1)}
          rel="prev"
          className={`${tautanClass} border-gray-200 text-gray-600 hover:border-primary-500 hover:text-primary-600`}
        >
          ← Sebelumnya
        </Link>
      )}

      {nomor.map((n, i) =>
        n === "…" ? (
          <span key={`sela-${i}`} className="px-1 text-gray-400 text-sm">
            …
          </span>
        ) : n === halaman ? (
          <span
            key={n}
            aria-current="page"
            className={`${tautanClass} border-primary-600 bg-primary-600 text-white font-medium`}
          >
            {n}
          </span>
        ) : (
          <Link
            key={n}
            href={url(n)}
            className={`${tautanClass} border-gray-200 text-gray-600 hover:border-primary-500 hover:text-primary-600`}
          >
            {n}
          </Link>
        )
      )}

      {halaman < totalHalaman && (
        <Link
          href={url(halaman + 1)}
          rel="next"
          className={`${tautanClass} border-gray-200 text-gray-600 hover:border-primary-500 hover:text-primary-600`}
        >
          Berikutnya →
        </Link>
      )}
    </nav>
  );
}
