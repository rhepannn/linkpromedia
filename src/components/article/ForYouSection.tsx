"use client";

import { useEffect, useState } from "react";
import ArticleCard from "@/components/article/ArticleCard";
import { getReadingHistory } from "@/lib/clientStorage";
import type { ArticleCard as ArticleCardType } from "@/types";

/**
 * Personalized Homepage — seksi "Untuk Kamu" yang menyesuaikan minat pembaca.
 *
 * Minat dihitung dari riwayat baca yang tersimpan di perangkat pembaca,
 * jadi tidak perlu akun dan tidak ada profil pembaca yang disimpan di server.
 * Konsekuensinya: bagian ini SELALU dimuat di sisi klien (server tidak tahu
 * riwayat pembaca), jadi selalu ada satu pergeseran tata letak yang tidak
 * terhindarkan saat section ini pertama kali muncul.
 *
 * Yang BISA dihindari adalah pergeseran KEDUA (skeleton → kartu asli):
 * begitu kita tahu riwayatnya ada (sinkron, sebelum fetch selesai), langsung
 * sediakan skeleton seukuran grid kartu asli, supaya saat data datang kontennya
 * hanya "terisi", bukan mendorong konten di bawahnya lagi.
 */
export default function ForYouSection() {
  const [adaRiwayat, setAdaRiwayat] = useState<boolean | null>(null);
  const [articles, setArticles] = useState<ArticleCardType[] | null>(null);
  const [berdasarkan, setBerdasarkan] = useState<string[]>([]);

  useEffect(() => {
    const riwayat = getReadingHistory();
    if (riwayat.length === 0) {
      setAdaRiwayat(false);
      return;
    }
    setAdaRiwayat(true);

    fetch("/api/articles/recommendations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slugs: riwayat, limit: 4 }),
    })
      .then((res) => res.json())
      .then((data) => {
        setArticles(Array.isArray(data.articles) ? data.articles : []);
        setBerdasarkan(Array.isArray(data.berdasarkan) ? data.berdasarkan : []);
      })
      .catch(() => setArticles([]));
  }, []);

  // Belum sempat cek localStorage, atau memang tidak ada riwayat —
  // tidak render apa pun, sama seperti HTML dari server
  if (adaRiwayat !== true) return null;

  // Riwayat ada tapi hasil rekomendasi kosong — jarang terjadi, dan karena
  // baru ketahuan setelah fetch, tetap ada pergeseran kecil di sini
  if (articles !== null && articles.length === 0) return null;

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 py-6 border-t border-gray-100">
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <svg className="w-5 h-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
        <h2 className="text-xl font-bold text-heading">Untuk Kamu</h2>
        {/* gray-400 hanya 2,6:1 di atas latar terang — pakai token
            text-muted yang memang disetel lolos AA di kedua tema */}
        {berdasarkan.length > 0 && (
          <span className="text-xs text-text-muted">
            berdasarkan minatmu pada {berdasarkan.join(", ")}
          </span>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {articles === null
          ? Array.from({ length: 4 }, (_, i) => <KartuSkeleton key={i} />)
          : articles.map((a) => <ArticleCard key={a.id} article={a} />)}
      </div>
    </section>
  );
}

/** Bentuknya meniru ArticleCard varian default supaya tingginya sama persis — image h-48 + blok teks */
function KartuSkeleton() {
  return (
    <div className="flex flex-col rounded-xl overflow-hidden border border-gray-100 bg-white animate-pulse" aria-hidden="true">
      <div className="h-48 bg-gray-100" />
      <div className="p-4 flex flex-col flex-1 gap-2">
        <div className="h-4 bg-gray-100 rounded w-full" />
        <div className="h-4 bg-gray-100 rounded w-4/5" />
        <div className="h-3 bg-gray-100 rounded w-full mt-1" />
        <div className="h-3 bg-gray-100 rounded w-2/3" />
        <div className="h-3 bg-gray-100 rounded w-1/3 mt-auto pt-3" />
      </div>
    </div>
  );
}
