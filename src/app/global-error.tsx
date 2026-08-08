"use client";

import Link from "next/link";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="id">
      <head>
        <meta charSet="utf-8" />
        <title>Kesalahan — LinkProMedia</title>
      </head>
      <body className="bg-surface text-foreground font-sans antialiased">
        <div className="max-w-2xl mx-auto px-4 py-24 text-center">
          <h1 className="text-6xl font-black text-gray-200 mb-4">500</h1>
          <h2 className="text-2xl font-bold text-heading mb-2">Terjadi Kesalahan</h2>
          <p className="text-text-muted mb-8">
            Maaf, terjadi kesalahan yang tidak terduga. Silakan coba lagi
            beberapa saat.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => reset()}
              className="bg-primary-600 text-white px-6 py-3 rounded-full font-medium hover:bg-primary-700 transition-colors"
            >
              Coba Lagi
            </button>
            <Link
              href="/"
              className="border border-gray-200 text-gray-600 px-6 py-3 rounded-full font-medium hover:bg-gray-50 transition-colors"
            >
              Ke Beranda
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
