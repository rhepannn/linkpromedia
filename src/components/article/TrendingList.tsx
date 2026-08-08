import Link from "next/link";
import type { TrendingArticle } from "@/lib/trending";
import { formatRelativeDate } from "@/lib/utils";

interface Props {
  articles: TrendingArticle[];
}

export default function TrendingList({ articles }: Props) {
  if (articles.length === 0) return null;

  return (
    <ol className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
      {articles.map((article, index) => (
        <li key={article.id} className="flex items-start gap-3">
          <span className="text-2xl font-black text-primary-100 leading-none w-8 flex-shrink-0" aria-hidden="true">
            {index + 1}
          </span>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-heading leading-snug line-clamp-2 hover:text-primary-600 transition-colors">
              <Link href={`/berita/${article.slug}`}>{article.title}</Link>
            </h3>
            {/* Tampilkan kunjungan pada periode tren (bukan total sepanjang masa)
                DAN usia beritanya. Tanpa konteks usia, pembaca bingung kenapa
                artikel dengan pembaca lebih sedikit bisa berada di peringkat atas. */}
            <p className="text-xs text-text-muted mt-1">
              {article.kunjungan.toLocaleString("id-ID")} pembaca
              {article.publishedAt && <> · {formatRelativeDate(article.publishedAt)}</>}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
