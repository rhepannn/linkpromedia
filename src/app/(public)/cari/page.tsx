import type { Metadata } from "next";
import { searchArticles } from "@/lib/articles";
import ArticleCard from "@/components/article/ArticleCard";
import KondisiKosong from "@/components/ui/KondisiKosong";
import Pagination from "@/components/ui/Pagination";
import SearchForm from "./SearchForm";

interface Props {
  searchParams: Promise<{ q?: string; hal?: string }>;
}

const PER_PAGE = 24;

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { q } = await searchParams;
  if (!q) {
    return { title: "Pencarian Berita" };
  }
  return {
    title: `Hasil pencarian: "${q}"`,
    description: `Temukan berita terkait "${q}" di LinkProMedia.id`,
    robots: { index: false, follow: true },
  };
}

export default async function SearchPage({ searchParams }: Props) {
  const { q, hal } = await searchParams;
  const query = q?.trim() ?? "";
  const page = parseInt(hal ?? "1", 10) || 1;

  const { articles: results, total } = query
    ? await searchArticles(query, page, PER_PAGE)
    : { articles: [], total: 0 };

  const totalHalaman = Math.ceil(total / PER_PAGE);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          {query ? `Hasil pencarian: "${query}"` : "Cari Berita"}
        </h1>
        <SearchForm initialQuery={query} />
      </div>

      {!query ? (
        <KondisiKosong
          ikon="cari"
          judul="Cari berita"
          keterangan="Ketik kata kunci di kolom pencarian untuk menelusuri seluruh arsip berita."
        />
      ) : results.length === 0 ? (
        <KondisiKosong
          ikon="cari"
          judul={`Tidak ada hasil untuk "${query}"`}
          keterangan="Coba kata kunci yang lebih umum, periksa ejaannya, atau telusuri lewat kategori."
          aksi={{ teks: "Lihat berita terbaru", href: "/" }}
        />
      ) : (
        <>
          <p className="text-sm text-gray-500 mb-5">
            Ditemukan <strong>{total.toLocaleString("id-ID")}</strong> artikel untuk &ldquo;{query}&rdquo;
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {results.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
          {totalHalaman > 1 && (
            <div className="mt-8">
              <Pagination
                halaman={page}
                totalHalaman={totalHalaman}
                basePath={`/cari?q=${encodeURIComponent(query)}`}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
