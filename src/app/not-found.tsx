import Link from "next/link";

export default function NotFound() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-24 text-center">
      <h1 className="text-6xl font-black text-gray-200 mb-4">404</h1>
      <h2 className="text-2xl font-bold text-heading mb-2">Halaman Tidak Ditemukan</h2>
      <p className="text-text-muted mb-8">
        Halaman yang kamu cari mungkin sudah dipindahkan, dihapus, atau
        tidak pernah ada.
      </p>
      <div className="flex items-center justify-center gap-3">
        <Link
          href="/"
          className="bg-primary-600 text-white px-6 py-3 rounded-full font-medium hover:bg-primary-700 transition-colors"
        >
          Ke Beranda
        </Link>
        <Link
          href="/cari"
          className="border border-gray-200 text-gray-600 px-6 py-3 rounded-full font-medium hover:bg-gray-50 transition-colors"
        >
          Cari Berita
        </Link>
      </div>
    </div>
  );
}
