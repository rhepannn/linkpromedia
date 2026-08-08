import type { Metadata } from "next";
import ArticleCard from "@/components/article/ArticleCard";
import JudulSeksi from "@/components/layout/JudulSeksi";
import TrendingList from "@/components/article/TrendingList";
import ForYouSection from "@/components/article/ForYouSection";
import {
  getHeadlineArticles,
  getPublishedArticles,
  getArticlesByCategory,
  getEditorsPicks,
} from "@/lib/articles";
import { getTrendingArticles } from "@/lib/trending";
import { getCategories } from "@/lib/categories";
import { getPreferensiKategori } from "@/lib/preferensiPembaca";
import JsonLd from "@/components/seo/JsonLd";
import { organizationSchema } from "@/lib/schemaOrg";

export const metadata: Metadata = {
  title: "LinkProMedia.id — Berita Terkini & Terpercaya",
  description:
    "Baca berita terbaru hari ini: nasional, ekonomi, teknologi, olahraga, dan hiburan dari LinkProMedia.id.",
};

export const revalidate = 60;

export default async function HomePage() {
  const [headlines, latestArticles, editorsPicks, trendingArticles, preferensi] = await Promise.all([
    getHeadlineArticles(5),
    getPublishedArticles(12),
    getEditorsPicks(5),
    getTrendingArticles(6),
    getPreferensiKategori(),
  ]);

  const featuredArticle = headlines[0];
  const secondaryHeadlines = headlines.slice(1, 5);

  const categories = await getCategories();
  const setPreferensi = new Set(preferensi);

  const dipersonalisasi = preferensi.length > 0;

  // Kategori yang sesuai minat pembaca didahulukan
  const diurutkan = [...categories].sort((a, b) => {
    const aFav = setPreferensi.has(a.slug);
    const bFav = setPreferensi.has(b.slug);
    if (aFav && !bFav) return -1;
    if (!aFav && bFav) return 1;
    return 0;
  });

  const kategoriTampil = diurutkan.slice(0, dipersonalisasi ? 6 : 4);
  const kategoriFavorit = kategoriTampil.filter((c) => setPreferensi.has(c.slug));

  const categoryArticles = await Promise.all(
    kategoriTampil.map(async (cat) => ({
      category: cat,
      articles: await getArticlesByCategory(cat.slug, 3),
      isFavorit: setPreferensi.has(cat.slug),
    }))
  );

  return (
    <>
      <JsonLd data={organizationSchema()} />

      {/* ── HERO / HEADLINE ─────────────────────────────────
          Satu berita utama yang jelas mendominasi, lalu tier kedua di
          sampingnya. Sebelumnya semua seksi tampil setara sehingga
          pembaca tidak punya titik masuk — mata bingung harus mulai
          dari mana. */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 pb-9">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 lg:gap-6">
          {featuredArticle && (
            <div className="lg:col-span-2">
              <ArticleCard article={featuredArticle} variant="hero" />
            </div>
          )}
          <div className="flex flex-col divide-y divide-divider">
            {secondaryHeadlines.map((article, i) => (
              <div key={article.id} className={i === 0 ? "pb-4" : "py-4 last:pb-0"}>
                <ArticleCard article={article} variant="horizontal" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── EDITOR'S PICK ────────────────────────────────── */}
      {editorsPicks.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-7 border-t border-divider">
          <JudulSeksi>Pilihan Redaksi</JudulSeksi>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {editorsPicks.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        </section>
      )}

      {/* ── TRENDING ─────────────────────────────────────── */}
      {trendingArticles.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-7 border-t border-divider">
          <JudulSeksi>Sedang Tren</JudulSeksi>
          <TrendingList articles={trendingArticles} />
        </section>
      )}

      {/* ── UNTUK KAMU (personalisasi AI) ────────────────── */}
      <ForYouSection />

      {/* ── KATEGORI FAVORIT ─────────────────────────────── */}
      {dipersonalisasi && kategoriFavorit.length > 0 && (
        <div>
          {categoryArticles
            .filter(({ isFavorit }) => isFavorit)
            .map(({ category, articles }) => {
              if (articles.length === 0) return null;
              return (
                <section key={category.id} className="max-w-7xl mx-auto px-4 sm:px-6 py-7 border-t border-divider">
                  <JudulSeksi
                    rubrik={category.slug}
                    keterangan="· favorit kamu"
                    href={`/kategori/${category.slug}`}
                  >
                    {category.name}
                  </JudulSeksi>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {articles.map((article) => (
                      <ArticleCard key={article.id} article={article} />
                    ))}
                  </div>
                </section>
              );
            })}
        </div>
      )}

      {/* ── BERITA TERBARU ────────────────────────────────
          Dua belas kartu bergambar yang seragam membuat halaman terasa
          datar sekaligus berisik: tidak ada yang menonjol, dan mata lelah
          memindainya. Empat teratas tetap bergambar sebagai titik masuk,
          sisanya turun jadi baris teks padat — lebih cepat dipindai dan
          memberi jeda ritme sebelum seksi kategori berikutnya. */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-7 border-t border-divider">
        <JudulSeksi>Berita Terbaru</JudulSeksi>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {latestArticles.slice(0, 4).map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>

        {latestArticles.length > 4 && (
          <div className="mt-7 grid grid-cols-1 md:grid-cols-2 md:gap-x-10">
            {latestArticles.slice(4).map((article, i) => (
              <div key={article.id} className="border-t border-divider">
                <ArticleCard article={article} variant="compact" urutan={i + 5} />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── SEKSI KATEGORI ──────────────────────────────── */}
      {categoryArticles
        .filter(({ isFavorit }) => !isFavorit)
        .map(({ category, articles }) => {
          if (articles.length === 0) return null;
          return (
            <section key={category.id} className="max-w-7xl mx-auto px-4 sm:px-6 py-7 border-t border-divider">
              <JudulSeksi rubrik={category.slug} href={`/kategori/${category.slug}`}>
                {category.name}
              </JudulSeksi>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {articles.map((article) => (
                  <ArticleCard key={article.id} article={article} />
                ))}
              </div>
            </section>
          );
        })}
    </>
  );
}
