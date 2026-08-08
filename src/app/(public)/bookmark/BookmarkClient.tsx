"use client";

import { useEffect, useState } from "react";
import ArticleCard from "@/components/article/ArticleCard";
import KondisiKosong from "@/components/ui/KondisiKosong";
import KerangkaKartu from "@/components/ui/KerangkaKartu";
import { getBookmarks, onBookmarksChange } from "@/lib/clientStorage";
import type { ArticleCard as ArticleCardType } from "@/types";

export default function BookmarkClient() {
  const [articles, setArticles] = useState<ArticleCardType[] | null>(null);

  useEffect(() => {
    function load() {
      const slugs = getBookmarks();
      if (slugs.length === 0) {
        setArticles([]);
        return;
      }
      fetch(`/api/articles/by-slugs?slugs=${slugs.join(",")}`)
        .then((res) => res.json())
        .then((data) => setArticles(Array.isArray(data) ? data : []));
    }
    load();
    return onBookmarksChange(load);
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-heading">Artikel Tersimpan</h1>
        <p className="text-sm text-gray-500 mt-1">
          Disimpan di perangkat ini saja — tidak tersinkron antar perangkat.
        </p>
      </div>

      {articles === null ? (
        <KerangkaKartu jumlah={3} />
      ) : articles.length === 0 ? (
        <KondisiKosong
          ikon="bookmark"
          judul="Belum ada artikel tersimpan"
          keterangan="Tekan ikon penanda di sudut kartu berita untuk menyimpannya dan membacanya lagi nanti."
          aksi={{ teks: "Jelajahi berita terbaru", href: "/" }}
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
