import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import ArticleForm from "@/components/admin/ArticleForm";
import { getArticleById } from "@/lib/articles";
import { getCategories } from "@/lib/categories";
import { toDatetimeLocalValue } from "@/lib/utils";
import { getSessionActor } from "@/lib/sessionRole";
import { canEditArticle } from "@/lib/permissions";

interface Props {
  params: Promise<{ id: string }>;
}

export const metadata: Metadata = { title: "Edit Artikel" };

export default async function EditArticlePage({ params }: Props) {
  const { id } = await params;

  const [article, categories, actor] = await Promise.all([
    getArticleById(id),
    getCategories(),
    getSessionActor(),
  ]);
  if (!actor) redirect("/admin/login");
  if (!article) notFound();

  // Penulis tidak boleh membuka artikel milik orang lain
  if (!canEditArticle(actor.role, article.author.id, actor.id)) {
    redirect("/admin/artikel");
  }

  let aiSummaryPoints: string[] = [];
  if (article.aiSummary) {
    try {
      const parsed = JSON.parse(article.aiSummary);
      if (Array.isArray(parsed)) aiSummaryPoints = parsed.filter((p) => typeof p === "string");
    } catch {
      aiSummaryPoints = [];
    }
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-heading">Edit Artikel</h1>
        <p className="text-sm text-text-muted mt-0.5 truncate max-w-lg">{article.title}</p>
      </div>
      <ArticleForm
        categories={categories}
        role={actor.role}
        initialData={{
          id: article.id,
          title: article.title,
          slug: article.slug,
          excerpt: article.excerpt ?? "",
          content: article.content,
          categoryId: article.category.id,
          status: article.status,
          thumbnailUrl: article.thumbnailUrl ?? "",
          isBreaking: article.isBreaking,
          isEditorsPick: article.isEditorsPick,
          isLive: article.isLive,
          previewToken: article.previewToken,
          metaTitle: article.metaTitle ?? "",
          metaDescription: article.metaDescription ?? "",
          tags: article.tags?.map((t) => t.tag.name) ?? [],
          aiSummary: aiSummaryPoints,
          translationOfId: article.translationOfId,
          scheduledAt:
            article.status === "SCHEDULED" && article.publishedAt
              ? toDatetimeLocalValue(article.publishedAt)
              : "",
        }}
      />
    </div>
  );
}
