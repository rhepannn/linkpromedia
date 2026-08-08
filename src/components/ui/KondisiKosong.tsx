import Link from "next/link";

interface Props {
  ikon: "bookmark" | "riwayat" | "cari" | "offline";
  judul: string;
  keterangan: string;
  aksi?: { teks: string; href: string };
}

/**
 * Tampilan saat tidak ada isi.
 *
 * Sebelumnya memakai emoji besar sebagai ilustrasi. Emoji digambar berbeda
 * di tiap sistem operasi, tidak bisa diwarnai mengikuti tema, dan pada
 * ukuran besar justru jadi elemen paling mencolok di halaman yang isinya
 * kosong — perhatian tertuju ke hiasan, bukan ke jalan keluarnya.
 *
 * Diganti ikon garis yang mewarisi warna teks, dan yang lebih penting:
 * selalu ada satu langkah lanjut supaya halaman ini tidak jadi jalan buntu.
 */
const IKON: Record<Props["ikon"], React.ReactNode> = {
  bookmark: (
    <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
  ),
  riwayat: (
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
  ),
  cari: (
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
  ),
  offline: (
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M3 3l18 18" />
  ),
};

export default function KondisiKosong({ ikon, judul, keterangan, aksi }: Props) {
  return (
    <div className="text-center py-16 px-4 max-w-sm mx-auto">
      <div
        className="mx-auto mb-5 w-14 h-14 rounded-full flex items-center justify-center bg-primary-50 text-primary-600"
        aria-hidden="true"
      >
        <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          {IKON[ikon]}
        </svg>
      </div>

      <p className="judul-kartu text-heading mb-1.5">{judul}</p>
      <p className="deck">{keterangan}</p>

      {aksi && (
        <Link
          href={aksi.href}
          className="inline-flex items-center gap-1.5 mt-5 bg-primary-600 text-white text-sm font-semibold px-4 py-2.5 rounded-lg hover:bg-primary-700 transition-colors"
        >
          {aksi.teks}
          <span aria-hidden="true">→</span>
        </Link>
      )}
    </div>
  );
}
