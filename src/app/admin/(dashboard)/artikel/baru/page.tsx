import type { Metadata } from "next";
import { redirect } from "next/navigation";
import ArticleForm from "@/components/admin/ArticleForm";
import { getCategories } from "@/lib/categories";
import { getSessionActor } from "@/lib/sessionRole";

export const metadata: Metadata = { title: "Artikel Baru" };

export default async function NewArticlePage() {
  const [categories, actor] = await Promise.all([getCategories(), getSessionActor()]);
  if (!actor) redirect("/admin/login");

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-heading">Artikel Baru</h1>
        <p className="text-sm text-text-muted mt-0.5">
          {actor.role === "AUTHOR"
            ? "Tulis artikel, lalu ajukan ke editor untuk ditinjau"
            : "Tulis dan publikasikan artikel baru"}
        </p>
      </div>
      <ArticleForm categories={categories} role={actor.role} />
    </div>
  );
}
