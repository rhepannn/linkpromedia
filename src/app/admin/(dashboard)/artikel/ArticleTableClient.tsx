"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ArticleCard } from "@/types";
import { formatDate, formatDateTime } from "@/lib/utils";

interface Props {
  articles: ArticleCard[];
  /** Penulis tidak boleh mengarsipkan artikel orang lain */
  canDelete?: boolean;
}

export default function ArticleTableClient({ articles, canDelete = true }: Props) {
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [archiving, setArchiving] = useState<string | null>(null);
  const router = useRouter();

  const categories = Array.from(new Set(articles.map((a) => a.category.name)));

  const filtered = articles.filter((a) => {
    const matchSearch = a.title.toLowerCase().includes(search.toLowerCase());
    const matchCategory = filterCategory ? a.category.name === filterCategory : true;
    return matchSearch && matchCategory;
  });

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Hapus artikel "${title}"? Tindakan ini tidak dapat dibatalkan.`)) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/admin/artikel/${id}`, { method: "DELETE" });
      if (res.ok) {
        router.refresh();
      } else {
        alert("Gagal menghapus artikel.");
      }
    } catch {
      alert("Terjadi kesalahan.");
    } finally {
      setDeleting(null);
    }
  }

  async function handleToggleArchive(id: string, currentStatus: string) {
    const nextStatus = currentStatus === "ARCHIVED" ? "PUBLISHED" : "ARCHIVED";
    setArchiving(id);
    try {
      const res = await fetch(`/api/admin/artikel/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) {
        router.refresh();
      } else {
        alert("Gagal mengubah status artikel.");
      }
    } catch {
      alert("Terjadi kesalahan.");
    } finally {
      setArchiving(null);
    }
  }

  return (
    <div className="bg-white rounded-xl border border-divider">
      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3 p-4 border-b border-divider">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari judul artikel..."
          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
        >
          <option value="">Semua Kategori</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-text-muted">
          <p className="text-sm">Tidak ada artikel yang cocok.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-divider text-left">
                <th className="px-5 py-3 font-semibold text-text-muted text-xs uppercase tracking-wide">Judul</th>
                <th className="px-4 py-3 font-semibold text-text-muted text-xs uppercase tracking-wide hidden md:table-cell">Kategori</th>
                <th className="px-4 py-3 font-semibold text-text-muted text-xs uppercase tracking-wide hidden lg:table-cell">Penulis</th>
                <th className="px-4 py-3 font-semibold text-text-muted text-xs uppercase tracking-wide hidden lg:table-cell">Tanggal</th>
                <th className="px-4 py-3 font-semibold text-text-muted text-xs uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 font-semibold text-text-muted text-xs uppercase tracking-wide text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-divider">
              {filtered.map((article) => (
                <tr key={article.id} className="hover:bg-surface/60 transition-colors">
                  <td className="px-5 py-3.5">
                    <p className="font-medium text-heading line-clamp-1 max-w-xs">{article.title}</p>
                  </td>
                  <td className="px-4 py-3.5 hidden md:table-cell">
                    <span className="text-xs bg-primary-50 text-primary-600 px-2 py-0.5 rounded-full">
                      {article.category.name}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-text-muted hidden lg:table-cell">
                    {article.author.name}
                  </td>
                  <td className="px-4 py-3.5 text-text-muted hidden lg:table-cell whitespace-nowrap">
                    {article.status === "SCHEDULED" ? formatDateTime(article.publishedAt) : formatDate(article.publishedAt)}
                  </td>
                  <td className="px-4 py-3.5">
                    <span
                      className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full ${
                        article.status === "PUBLISHED"
                          ? "bg-green-100 text-green-700"
                          : article.status === "ARCHIVED"
                          ? "bg-gray-200 text-gray-600"
                          : article.status === "SCHEDULED"
                          ? "bg-primary-50 text-primary-600"
                          : article.status === "IN_REVIEW"
                          ? "bg-accent text-accent-text"
                          : "bg-accent/15 text-accent-text"
                      }`}
                    >
                      {article.status === "PUBLISHED"
                        ? "Terbit"
                        : article.status === "ARCHIVED"
                        ? "Arsip"
                        : article.status === "SCHEDULED"
                        ? "Terjadwal"
                        : article.status === "IN_REVIEW"
                        ? "Ditinjau"
                        : "Draft"}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2 justify-end">
                      <Link
                        href={`/berita/${article.slug}`}
                        target="_blank"
                        title="Lihat artikel"
                        className="text-text-muted hover:text-primary-600 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </Link>
                      <Link
                        href={`/admin/artikel/${article.id}`}
                        title="Edit artikel"
                        className="text-text-muted hover:text-primary-600 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </Link>
                      {canDelete && article.status !== "DRAFT" && article.status !== "IN_REVIEW" && (
                        <button
                          onClick={() => handleToggleArchive(article.id, article.status)}
                          disabled={archiving === article.id}
                          title={article.status === "ARCHIVED" ? "Terbitkan kembali" : "Arsipkan artikel"}
                          className="text-text-muted hover:text-primary-600 transition-colors disabled:opacity-40"
                        >
                          {article.status === "ARCHIVED" ? (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                            </svg>
                          )}
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(article.id, article.title)}
                        disabled={deleting === article.id}
                        title="Hapus artikel"
                        className="text-text-muted hover:text-red-600 transition-colors disabled:opacity-40"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
