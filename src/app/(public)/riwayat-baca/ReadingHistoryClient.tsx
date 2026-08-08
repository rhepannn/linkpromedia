"use client";

import { useEffect, useState } from "react";
import ArticleCard from "@/components/article/ArticleCard";
import KondisiKosong from "@/components/ui/KondisiKosong";
import KerangkaKartu from "@/components/ui/KerangkaKartu";
import { getReadingHistory, clearReadingHistory } from "@/lib/clientStorage";
import type { ArticleCard as ArticleCardType } from "@/types";

export default function ReadingHistoryClient() {
  const [articles, setArticles] = useState<ArticleCardType[] | null>(null);

  function load() {
    const slugs = getReadingHistory();
    if (slugs.length === 0) {
      setArticles([]);
      return;
    }
    fetch(`/api/articles/by-slugs?slugs=${slugs.join(",")}`)
      .then((res) => res.json())
      .then((data) => setArticles(Array.isArray(data) ? data : []));
  }

  useEffect(() => {
    load();
  }, []);

  function handleClear() {
    if (!confirm("Hapus semua riwayat baca di perangkat ini?")) return;
    clearReadingHistory();
    setArticles([]);
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-heading">Riwayat Baca</h1>
          <p className="text-sm text-gray-500 mt-1">
            Artikel yang baru dibaca di perangkat ini, urut dari terakhir dilihat.
          </p>
        </div>
        {articles && articles.length > 0 && (
          <button
            onClick={handleClear}
            className="text-sm text-red-500 hover:text-red-600 font-medium"
          >
            Hapus Riwayat
          </button>
        )}
      </div>

      {articles === null ? (
        <KerangkaKartu jumlah={3} />
      ) : articles.length === 0 ? (
        <KondisiKosong
          ikon="riwayat"
          judul="Belum ada riwayat baca"
          keterangan="Artikel yang kamu buka akan tercatat di sini supaya mudah ditemukan kembali."
          aksi={{ teks: "Mulai membaca", href: "/" }}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {articles.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      )}
    </div>
  );
}
