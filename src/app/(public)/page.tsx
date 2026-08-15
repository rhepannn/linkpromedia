import type { Metadata } from "next";
import { Suspense } from "react";
import ArticleCard from "@/components/article/ArticleCard";
import JudulSeksi from "@/components/layout/JudulSeksi";
import TrendingList from "@/components/article/TrendingList";
import ForYouSection from "@/components/article/ForYouSection";
import KategoriPersonalisasi from "@/components/article/KategoriPersonalisasi";
import {
  getHeadlineArticles,
  getPublishedArticles,
  getArticlesByCategory,
  getEditorsPicks,
} from "@/lib/articles";
import { getTrendingArticles } from "@/lib/trending";
import { getCategories } from "@/lib/categories";
import JsonLd from "@/components/seo/JsonLd";
import { organizationSchema } from "@/lib/schemaOrg";

export const metadata: Metadata = {
  title: "LinkProMedia.id — Berita Terkini & Terpercaya",
  description:
    "Baca berita terbaru hari ini: nasional, ekonomi, teknologi, olahraga, dan hiburan dari LinkProMedia.id.",
};

export const revalidate = 60;

/** Berapa banyak seksi kategori yang tampil di halaman depan */
const JUMLAH_KATEGORI = 6;

/**
 * Halaman depan.
 *
 * Komponen ini sengaja TIDAK async dan tidak menarik data apa pun sendiri.
 * Tiap seksi menarik datanya masing-masing di dalam <Suspense>, sehingga:
 *
 * 1. Semua kueri berjalan PARALEL — sebelumnya ada tiga gelombang berurutan
 *    (Promise.all → getCategories → artikel per kategori), dan gelombang kedua
 *    menunggu yang pertama padahal tidak bergantung padanya sama sekali.
 * 2. Hero bisa tersaji lebih dulu sementara seksi bawah masih dirender —
 *    pembaca melihat berita utama tanpa menunggu seluruh halaman rampung.
 *
 * Personalisasi kategori dipindah ke klien (KategoriPersonalisasi). Membaca
 * cookie di sini akan menjadikan halaman dynamic dan mematikan `revalidate`
 * di atas — setiap pembaca lalu memicu render + kueri DB sendiri.
 */
export default function HomePage() {
  return (
    <>
      <JsonLd data={organizationSchema()} />

      <Suspense fallback={<KerangkaHero />}>
        <SeksiHero />
      </Suspense>

      <Suspense fallback={null}>
        <SeksiPilihanRedaksi />
      </Suspense>

      <Suspense fallback={null}>
        <SeksiTren />
      </Suspense>

      {/* ── UNTUK KAMU (personalisasi, sepenuhnya di klien) ── */}
      <ForYouSection />

      <Suspense fallback={<KerangkaTerbaru />}>
        <SeksiBeritaTerbaru />
      </Suspense>

      <Suspense fallback={null}>
        <SeksiKategori />
      </Suspense>
    </>
  );
}

/* ── HERO / HEADLINE ─────────────────────────────────
   Satu berita utama yang jelas mendominasi, lalu tier kedua di
   sampingnya. Sebelumnya semua seksi tampil setara sehingga
   pembaca tidak punya titik masuk — mata bingung harus mulai
   dari mana. */
async function SeksiHero() {
  const headlines = await getHeadlineArticles(5);
  const featuredArticle = headlines[0];
  const secondaryHeadlines = headlines.slice(1, 5);

  return (
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
  );
}

async function SeksiPilihanRedaksi() {
  const editorsPicks = await getEditorsPicks(5);
  if (editorsPicks.length === 0) return null;

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 py-7 border-t border-divider">
      <JudulSeksi>Pilihan Redaksi</JudulSeksi>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {editorsPicks.map((article) => (
          <ArticleCard key={article.id} article={article} />
        ))}
      </div>
    </section>
  );
}

async function SeksiTren() {
  const trendingArticles = await getTrendingArticles(6);
  if (trendingArticles.length === 0) return null;

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 py-7 border-t border-divider">
      <JudulSeksi>Sedang Tren</JudulSeksi>
      <TrendingList articles={trendingArticles} />
    </section>
  );
}

/* ── BERITA TERBARU ────────────────────────────────
   Dua belas kartu bergambar yang seragam membuat halaman terasa
   datar sekaligus berisik: tidak ada yang menonjol, dan mata lelah
   memindainya. Empat teratas tetap bergambar sebagai titik masuk,
   sisanya turun jadi baris teks padat — lebih cepat dipindai dan
   memberi jeda ritme sebelum seksi kategori berikutnya. */
async function SeksiBeritaTerbaru() {
  const latestArticles = await getPublishedArticles(12);

  return (
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
  );
}

/**
 * Seksi kategori.
 *
 * Semua kategori dirender dalam urutan bawaan agar HTML-nya sama untuk setiap
 * pembaca (dan karenanya bisa di-cache). KategoriPersonalisasi menaikkan
 * kategori favorit ke atas setelah hidrasi.
 */
async function SeksiKategori() {
  const categories = await getCategories();
  const kategoriTampil = categories.slice(0, JUMLAH_KATEGORI);
  if (kategoriTampil.length === 0) return null;

  const categoryArticles = await Promise.all(
    kategoriTampil.map(async (category) => ({
      category,
      articles: await getArticlesByCategory(category.slug, 3),
    }))
  );

  return (
    <KategoriPersonalisasi>
      {categoryArticles.map(({ category, articles }) => {
        if (articles.length === 0) return null;
        return (
          <div key={category.id} data-kategori={category.slug}>
            <section className="max-w-7xl mx-auto px-4 sm:px-6 py-7 border-t border-divider">
              <JudulSeksi
                rubrik={category.slug}
                keterangan="· favorit kamu"
                keteranganTersembunyi
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
          </div>
        );
      })}
    </KategoriPersonalisasi>
  );
}

/* ── Kerangka pemuatan ───────────────────────────────
   Tingginya sengaja meniru seksi aslinya supaya konten yang menyusul
   tidak mendorong apa pun ke bawah (menjaga CLS tetap rendah). */

function KerangkaHero() {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 pb-9" aria-hidden="true">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 lg:gap-6 animate-pulse">
        <div className="lg:col-span-2">
          <div className="rounded-xl overflow-hidden border border-divider">
            <div className="h-72 sm:h-96 bg-gray-100" />
            <div className="p-4 flex flex-col gap-2">
              <div className="h-6 bg-gray-100 rounded w-11/12" />
              <div className="h-6 bg-gray-100 rounded w-3/4" />
              <div className="h-3 bg-gray-100 rounded w-1/3 mt-1" />
            </div>
          </div>
        </div>
        <div className="flex flex-col divide-y divide-divider">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className={`flex gap-3 ${i === 0 ? "pb-4" : "py-4 last:pb-0"}`}>
              <div className="flex-1 flex flex-col gap-2">
                <div className="h-4 bg-gray-100 rounded w-full" />
                <div className="h-4 bg-gray-100 rounded w-2/3" />
                <div className="h-3 bg-gray-100 rounded w-1/3" />
              </div>
              <div className="h-20 w-28 flex-shrink-0 bg-gray-100 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function KerangkaTerbaru() {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 py-7 border-t border-divider" aria-hidden="true">
      <div className="h-7 bg-gray-100 rounded w-44 mb-5 animate-pulse" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 animate-pulse">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="flex flex-col rounded-xl overflow-hidden border border-divider">
            <div className="h-48 bg-gray-100" />
            <div className="p-4 flex flex-col gap-2">
              <div className="h-4 bg-gray-100 rounded w-full" />
              <div className="h-4 bg-gray-100 rounded w-4/5" />
              <div className="h-3 bg-gray-100 rounded w-2/3 mt-1" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
