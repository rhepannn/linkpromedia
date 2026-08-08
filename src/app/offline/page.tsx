import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Tidak Ada Koneksi",
  robots: { index: false, follow: false },
};

/**
 * Halaman penyelamat saat pembaca membuka artikel yang belum pernah dibuka
 * sebelumnya dalam kondisi tanpa jaringan. Sengaja dibuat statis penuh
 * (tanpa query database) supaya bisa disimpan Service Worker.
 */
export default function OfflinePage() {
  return (
    <div className="max-w-lg mx-auto px-4 py-20 text-center">
      <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-5">
        <svg className="w-7 h-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 5.636a9 9 0 010 12.728m-12.728 0a9 9 0 010-12.728m9.9 9.9a5 5 0 010-7.072m-7.072 0a5 5 0 010 7.072M13 12a1 1 0 11-2 0 1 1 0 012 0z" />
        </svg>
      </div>

      <h1 className="text-xl font-bold text-heading mb-2">Tidak ada koneksi internet</h1>
      <p className="text-sm text-text-muted mb-6">
        Halaman ini belum pernah kamu buka sebelumnya, jadi belum tersimpan di perangkat.
        Artikel yang sudah pernah dibaca tetap bisa dibuka meski sedang offline.
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
        >
          Ke Beranda
        </Link>
        <Link
          href="/riwayat-baca"
          className="border border-gray-200 text-gray-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          Riwayat Baca
        </Link>
      </div>
    </div>
  );
}
