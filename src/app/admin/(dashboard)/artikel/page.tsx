import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAllArticles, getArticlesByAuthor } from "@/lib/articles";
import { getSessionActor } from "@/lib/sessionRole";
import { canManageAllArticles, canReview } from "@/lib/permissions";
import ArticleTableClient from "./ArticleTableClient";

export const metadata: Metadata = { title: "Kelola Artikel" };

export default async function AdminArtikelPage() {
  const actor = await getSessionActor();
  if (!actor) redirect("/admin/login");

  // Penulis hanya melihat tulisannya sendiri
  const articles = canManageAllArticles(actor.role)
    ? await getAllArticles()
    : await getArticlesByAuthor(actor.id);

  const menungguTinjauan = articles.filter((a) => a.status === "IN_REVIEW").length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-heading">Artikel</h1>
          <p className="text-sm text-text-muted mt-0.5">
            {articles.length} artikel
            {!canManageAllArticles(actor.role) && " milikmu"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/artikel/baru"
            className="inline-flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            Artikel Baru
          </Link>
        </div>
      </div>

      {canReview(actor.role) && menungguTinjauan > 0 && (
        <div className="bg-accent/10 border border-accent/30 rounded-xl px-4 py-3 text-sm text-accent-text">
          <strong>{menungguTinjauan} artikel</strong> menunggu ditinjau. Buka artikel berstatus
          &ldquo;Ditinjau&rdquo; untuk menyetujui atau mengembalikannya.
        </div>
      )}

      <ArticleTableClient articles={articles} canDelete={canManageAllArticles(actor.role)} />
    </div>
  );
}
