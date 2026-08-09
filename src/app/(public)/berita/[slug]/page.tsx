import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { getArticleBySlug, getRelatedArticles, getPublishedArticles, getVersiBahasa } from "@/lib/articles";
import { getCategories } from "@/lib/categories";
import { formatDate, formatDateTime, absoluteUrl, MIN_INDEXABLE_WORDS } from "@/lib/utils";
import CategoryBadge from "@/components/ui/CategoryBadge";
import ShareButtons from "@/components/ui/ShareButtons";
import ArticleCard from "@/components/article/ArticleCard";
import ReadingProgress from "@/components/article/ReadingProgress";
import LanguageSwitcher from "@/components/article/LanguageSwitcher";
import ArticleSummaryBox from "@/components/article/ArticleSummaryBox";
import BookmarkButton from "@/components/article/BookmarkButton";
import ReadingHistoryRecorder from "@/components/article/ReadingHistoryRecorder";
import PreferensiRecorder from "@/components/article/PreferensiRecorder";
import TextToSpeech from "@/components/article/TextToSpeech";
import ReaksiBar from "@/components/article/ReaksiBar";
import FontSizeControl from "@/components/article/FontSizeControl";
import JsonLd from "@/components/seo/JsonLd";
import { newsArticleSchema } from "@/lib/schemaOrg";
import { sanitizeHtml } from "@/lib/sanitize";

interface Props {
  params: Promise<{ slug: string }>;
}

/**
 * Halaman artikel disajikan dari cache, disegarkan tiap 60 detik.
 * Update artikel live tidak ikut basi karena timeline-nya mengambil data
 * sendiri dari /api/articles/[slug]/live-updates.
 */
export const revalidate = 60;

/**
 * Hanya artikel terbaru yang disiapkan saat build. Arsip lama dibuat saat
 * pertama kali diakses lalu ikut tersimpan di cache — kalau semua artikel
 * disiapkan di muka, proses build akan meledak begitu arsipnya puluhan ribu.
 */
export async function generateStaticParams() {
  const articles = await getPublishedArticles(200);
  return articles.map((a) => ({ slug: a.slug }));
}

// Metadata dinamis per artikel
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);

  if (!article) {
    return { title: "Artikel Tidak Ditemukan" };
  }

  const url = absoluteUrl(`/berita/${slug}`);
  // Beri tahu mesin pencari versi bahasa lain dari berita yang sama, supaya
  // tidak dianggap konten duplikat dan pembaca diarahkan ke bahasa yang tepat
  const versiBahasa = await getVersiBahasa(article);
  const bahasaAlternatif = Object.fromEntries(
    versiBahasa.map((v) => [v.language, absoluteUrl(`/berita/${v.slug}`)])
  );
  // Meta SEO manual/AI diprioritaskan; kalau kosong pakai judul & ringkasan artikel
  const seoTitle = article.metaTitle?.trim() || article.title;
  const description =
    article.metaDescription?.trim() ||
    article.excerpt ||
    article.content.replace(/<[^>]+>/g, "").slice(0, 160);

  // Artikel tanpa thumbnail tetap harus punya gambar saat dibagikan ke
  // WhatsApp/Facebook/X — tautan tanpa gambar jauh lebih jarang diklik.
  // Gambar cadangan berlogo LinkProMedia sudah tersedia di /opengraph-image.
  const gambarBagikan = article.thumbnailUrl?.trim()
    ? article.thumbnailUrl
    : absoluteUrl("/opengraph-image");

  return {
    title: seoTitle,
    description,
    openGraph: {
      title: seoTitle,
      description,
      url,
      type: "article",
      publishedTime: article.publishedAt?.toString(),
      authors: [article.author.name],
      section: article.category.name,
      images: [{ url: gambarBagikan, width: 1200, height: 630, alt: article.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: seoTitle,
      description,
      images: [gambarBagikan],
    },
    alternates: {
      canonical: url,
      ...(versiBahasa.length > 1 && { languages: bahasaAlternatif }),
    },
    // Konten tipis tetap tayang untuk pembaca yang sudah datang lewat tautan
    // langsung, tapi tidak diindeks — supaya anggaran crawl mesin pencari
    // tidak habis terbuang di halaman yang isinya cuma beberapa kalimat
    ...(article.wordCount < MIN_INDEXABLE_WORDS && {
      robots: { index: false, follow: true },
    }),
  };
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);

  if (!article) notFound();

  const versiBahasa = await getVersiBahasa(article);

  // Tandai "Diperbarui" hanya kalau edit terjadi cukup lama setelah terbit —
  // proses otomatis saat publish (Inti Berita, tag) juga menyentuh updatedAt,
  // jadi selisih beberapa detik/menit bukan berarti artikelnya benar-benar disunting ulang
  const AMBANG_DIPERBARUI_MS = 5 * 60 * 1000;
  const pernahDiperbarui =
    article.publishedAt &&
    new Date(article.updatedAt).getTime() - new Date(article.publishedAt).getTime() > AMBANG_DIPERBARUI_MS;

  // Rangkuman AI disimpan sebagai JSON array of string
  let summaryPoints: string[] = [];
  if (article.aiSummary) {
    try {
      const parsed = JSON.parse(article.aiSummary);
      if (Array.isArray(parsed)) summaryPoints = parsed.filter((p) => typeof p === "string");
    } catch {
      summaryPoints = [];
    }
  }

  const articleTagNames = article.tags?.map((t) => t.tag.name) ?? [];
  // Penghitung baca dinaikkan lewat AnalyticsTracker di browser, bukan di sini,
  // supaya halaman ini boleh disajikan dari cache.
  const [relatedArticles, categories] = await Promise.all([
    getRelatedArticles(article.title, article.excerpt ?? null, slug, 4, articleTagNames),
    getCategories(),
  ]);
  const articleUrl = absoluteUrl(`/berita/${slug}`);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <JsonLd data={newsArticleSchema(article, summaryPoints)} />
      <ReadingProgress targetId="article-body" />
      <ReadingHistoryRecorder slug={slug} />
      <PreferensiRecorder categorySlug={article.category.slug} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* ── KONTEN ARTIKEL ─────────────────────── */}
        <article id="article-body" className="lg:col-span-2">
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-gray-500 mb-4">
            <Link href="/" className="hover:text-primary-600">Beranda</Link>
            <span>/</span>
            <Link href={`/kategori/${article.category.slug}`} className="hover:text-primary-600">
              {article.category.name}
            </Link>
            <span>/</span>
            <span className="text-text-muted truncate max-w-[200px]">{article.title}</span>
          </nav>

          {/* Kategori badge */}
          <CategoryBadge name={article.category.name} slug={article.category.slug} />

          {/* Judul — inilah teks terpenting di halaman, jadi diberi
              tingkat tertinggi dalam skala judul */}
          <h1 className="judul-hero text-heading mt-3 mb-4">{article.title}</h1>

          {/* Pengalih bahasa — hanya tampil bila ada terjemahan yang sudah terbit */}
          <LanguageSwitcher versi={versiBahasa} aktif={article.language ?? "id"} />

          {/* Meta info */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500 mb-5 pb-5 border-b border-gray-100">
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              {article.author.slug ? (
                <Link href={`/penulis/${article.author.slug}`} className="hover:text-primary-600 transition-colors inline-flex items-center gap-1">
                  {article.author.name}
                  {article.author.isVerified && (
                    <svg className="w-3.5 h-3.5 text-primary-600" fill="currentColor" viewBox="0 0 20 20" aria-label="Jurnalis terverifikasi">
                      <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  )}
                </Link>
              ) : (
                article.author.name
              )}
            </span>
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <time dateTime={article.publishedAt?.toString()}>
                {formatDate(article.publishedAt)}
              </time>
              {pernahDiperbarui && (
                <span className="text-text-muted">
                  · Diperbarui{" "}
                  <time dateTime={article.updatedAt.toString()}>{formatDateTime(article.updatedAt)}</time>
                </span>
              )}
            </span>
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {(article.viewCount + 1).toLocaleString("id-ID")} kali dibaca
            </span>
          </div>

          {/* Alat bantu baca: dengarkan artikel & atur ukuran teks */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-5 border-b border-gray-100">
            <TextToSpeech title={article.title} content={article.content} />
            <FontSizeControl />
          </div>


          {/* Thumbnail */}
          {article.thumbnailUrl && (
            <div className="relative w-full aspect-video rounded-xl overflow-hidden mb-6 bg-gray-100">
              <Image
                src={article.thumbnailUrl}
                alt={article.title}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 66vw"
                priority
              />
            </div>
          )}

          {/* Excerpt */}
          {article.excerpt && (
            <p className="text-lg text-gray-600 italic border-l-4 border-primary-600 pl-4 mb-6">
              {article.excerpt}
            </p>
          )}

          {/* Inti Berita (rangkuman AI untuk pembaca) */}
          <ArticleSummaryBox points={summaryPoints} />

          {/* Konten artikel */}
          <div
            className="article-content"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(article.content) }}
          />

          {/* Tags */}
          {article.tags && article.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-8 pt-6 border-t border-gray-100">
              <span className="text-sm font-medium text-gray-600">Tag:</span>
              {article.tags.map(({ tag }) => (
                <Link
                  key={tag.id}
                  href={`/topik/${tag.slug}`}
                  title={`Lihat kronologi ${tag.name}`}
                  className="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded-full hover:bg-primary-50 hover:text-primary-600 transition-colors"
                >
                  #{tag.name}
                </Link>
              ))}
            </div>
          )}

          {/* Reaksi pembaca — di atas share supaya jadi ajakan pertama */}
          <ReaksiBar slug={slug} />

          {/* Share & Bookmark */}
          <div className="mt-6 pt-6 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
            <ShareButtons url={articleUrl} title={article.title} slug={slug} />
            <BookmarkButton slug={slug} variant="full" />
          </div>
        </article>

        {/* ── SIDEBAR ────────────────────────────── */}
        <aside className="lg:col-span-1">
          <div className="sticky top-24 space-y-6">
            {/* Artikel terkait */}
            {relatedArticles.length > 0 && (
              <div>
                <h2 className="text-base font-bold text-gray-900 border-l-4 border-primary-600 pl-3 mb-4">
                  Artikel Terkait
                </h2>
                <div className="space-y-4">
                  {relatedArticles.map((related) => (
                    <ArticleCard key={related.id} article={related} variant="horizontal" />
                  ))}
                </div>
              </div>
            )}

            {/* Navigasi kategori */}
            <div className="bg-white rounded-xl border border-gray-100 p-4">
              <h2 className="text-base font-bold text-gray-900 mb-3">Kategori</h2>
              <ul className="space-y-1">
                {categories.map((cat) => (
                  <li key={cat.id}>
                    <Link
                      href={`/kategori/${cat.slug}`}
                      className="block text-sm text-gray-600 hover:text-primary-600 py-1.5 border-b border-gray-50 last:border-0 transition-colors"
                    >
                      {cat.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
