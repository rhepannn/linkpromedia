import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import { getArticleByPreviewToken } from "@/lib/articles";
import { formatDate } from "@/lib/utils";
import CategoryBadge from "@/components/ui/CategoryBadge";
import { sanitizeHtml } from "@/lib/sanitize";

interface Props {
  params: Promise<{ token: string }>;
}

export const metadata: Metadata = {
  title: "Preview Artikel",
  robots: { index: false, follow: false },
};

export default async function ArticlePreviewPage({ params }: Props) {
  const { token } = await params;
  const article = await getArticleByPreviewToken(token);

  if (!article) notFound();

  if (
    article.previewTokenExpiresAt &&
    new Date(article.previewTokenExpiresAt) < new Date()
  ) {
    notFound();
  }

  const STATUS_LABEL: Record<string, string> = {
    DRAFT: "Draft",
    SCHEDULED: "Terjadwal",
    PUBLISHED: "Terbit",
    ARCHIVED: "Arsip",
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <div className="bg-accent/15 border border-accent/30 text-accent-text text-sm font-medium px-4 py-3 rounded-lg mb-6 flex items-center gap-2">
        <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
        </svg>
        Mode Preview — status artikel ini: <strong>{STATUS_LABEL[article.status]}</strong>. Halaman ini tidak
        terindeks dan tidak terlihat oleh pembaca umum.
      </div>

      <article>
        <CategoryBadge name={article.category.name} slug={article.category.slug} />

        <h1 className="text-2xl sm:text-3xl font-bold text-heading leading-tight mt-3 mb-4">{article.title}</h1>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500 mb-5 pb-5 border-b border-gray-100">
          <span>{article.author.name}</span>
          <time dateTime={article.publishedAt?.toString()}>{formatDate(article.publishedAt) || "Belum terbit"}</time>
        </div>

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

        {article.excerpt && (
          <p className="text-lg text-gray-600 italic border-l-4 border-primary-600 pl-4 mb-6">{article.excerpt}</p>
        )}

        <div className="article-content" dangerouslySetInnerHTML={{ __html: sanitizeHtml(article.content) }} />
      </article>
    </div>
  );
}
