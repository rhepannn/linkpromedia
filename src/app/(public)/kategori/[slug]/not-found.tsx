import Link from "next/link";

export default function CategoryNotFound() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-24 text-center">
      <h1 className="text-6xl font-black text-gray-200 mb-4">404</h1>
      <h2 className="text-2xl font-bold text-gray-800 mb-2">Kategori Tidak Ditemukan</h2>
      <p className="text-gray-500 mb-8">
        Kategori yang kamu cari tidak tersedia.
      </p>
      <Link
        href="/"
        className="inline-flex items-center gap-2 bg-primary-600 text-white px-6 py-3 rounded-full font-medium hover:bg-primary-700 transition-colors"
      >
        ← Kembali ke Beranda
      </Link>
    </div>
  );
}
