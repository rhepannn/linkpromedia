import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import ArticleCard from "@/components/article/ArticleCard";
import Pagination from "@/components/ui/Pagination";
import { getArticlesByCategoryPaged } from "@/lib/articles";
import { getCategories } from "@/lib/categories";
import { absoluteUrl } from "@/lib/utils";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ hal?: string }>;
}

/** Daftar kategori disajikan dari cache, disegarkan tiap 2 menit */
export const revalidate = 120;

export async function generateStaticParams() {
  const categories = await getCategories();
  return categories.map((cat) => ({ slug: cat.slug }));
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { hal } = await searchParams;
  const categories = await getCategories();
  const category = categories.find((c) => c.slug === slug);

  if (!category) return { title: "Kategori Tidak Ditemukan" };

  const halaman = Math.max(1, Number(hal) || 1);
  // Halaman 2 dst. punya canonical sendiri, bukan menunjuk ke halaman 1 —
  // kalau semua diarahkan ke halaman 1, arsip lama dianggap duplikat dan
  // tidak akan diindeks
  const url = absoluteUrl(`/kategori/${slug}${halaman > 1 ? `?hal=${halaman}` : ""}`);
  const description = `Baca berita terbaru seputar ${category.name} di LinkProMedia.id.`;

  return {
    title: halaman > 1 ? `${category.name} — Halaman ${halaman}` : `${category.name} — Berita Terkini`,
    description,
    openGraph: {
      title: `${category.name} | LinkProMedia.id`,
      description,
      url,
      type: "website",
    },
    alternates: { canonical: url },
  };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { hal } = await searchParams;
  const categories = await getCategories();
  const category = categories.find((c) => c.slug === slug);

  if (!category) notFound();

  const { articles, total, halaman, totalHalaman } = await getArticlesByCategoryPaged(
    slug,
    Math.max(1, Number(hal) || 1)
  );

  // Nomor halaman di luar jangkauan → 404, jangan sajikan halaman kosong
  // yang bisa terindeks sebagai konten tipis
  if (halaman > totalHalaman && total > 0) notFound();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link href="/" className="hover:text-primary-600">Beranda</Link>
        <span>/</span>
        <span className="text-gray-400">{category.name}</span>
      </nav>

      {/* Header kategori */}
      <div className="mb-8 pb-6 border-b border-gray-200">
        <div className="flex items-center gap-3 mb-2">
          <span className="w-1 h-8 bg-primary-600 rounded-full inline-block" />
          <h1 className="text-3xl font-black text-heading">{category.name}</h1>
        </div>
        <p className="text-gray-500 ml-4">
          {total > 0
            ? `${total} artikel tersedia${totalHalaman > 1 ? ` · halaman ${halaman} dari ${totalHalaman}` : ""}`
            : "Belum ada artikel di kategori ini"}
        </p>
      </div>

      {articles.length === 0 ? (
        /* Empty state */
        <div className="text-center py-24">
          <div className="text-6xl mb-4">📰</div>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Belum Ada Artikel</h2>
          <p className="text-gray-500 mb-6">
            Artikel untuk kategori <strong>{category.name}</strong> belum tersedia.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-primary-600 text-white px-6 py-3 rounded-full font-medium hover:bg-primary-700 transition-colors"
          >
            ← Kembali ke Beranda
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
          <Pagination
            halaman={halaman}
            totalHalaman={totalHalaman}
            basePath={`/kategori/${slug}`}
          />
        </>
      )}

      {/* Navigasi ke kategori lain */}
      <div className="mt-12 pt-8 border-t border-gray-100">
        <h2 className="text-base font-semibold text-gray-700 mb-4">Kategori Lainnya</h2>
        <div className="flex flex-wrap gap-2">
          {categories.filter((c) => c.slug !== slug).map((cat) => (
            <Link
              key={cat.id}
              href={`/kategori/${cat.slug}`}
              className="text-sm px-4 py-2 rounded-full border border-gray-200 text-gray-600 hover:border-primary-500 hover:text-primary-600 transition-colors"
            >
              {cat.name}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
