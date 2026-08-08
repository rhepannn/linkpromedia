import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard" };

async function getStats() {
  const [totalArticles, publishedArticles, draftArticles, scheduledArticles, totalCategories, totalAuthors, recent] =
    await Promise.all([
      prisma.article.count(),
      prisma.article.count({ where: { status: "PUBLISHED" } }),
      prisma.article.count({ where: { status: "DRAFT" } }),
      prisma.article.count({ where: { status: "SCHEDULED" } }),
      prisma.category.count(),
      prisma.user.count(),
      prisma.article.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, title: true, status: true, publishedAt: true, category: { select: { name: true } } },
      }),
    ]);

  return {
    totalArticles,
    publishedArticles,
    draftArticles,
    scheduledArticles,
    totalCategories,
    totalAuthors,
    recentArticles: recent.map((a) => ({
      id: a.id,
      title: a.title,
      status: a.status,
      category: a.category.name,
      publishedAt: a.publishedAt ? formatDate(a.publishedAt) : "-",
    })),
  };
}

const statCards = [
  { label: "Total Artikel", key: "totalArticles" as const, color: "bg-primary-50 text-primary-600", icon: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
  )},
  { label: "Terpublish", key: "publishedArticles" as const, color: "bg-green-50 text-green-600", icon: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
  )},
  { label: "Draft", key: "draftArticles" as const, color: "bg-accent/15 text-accent-text", icon: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
  )},
  { label: "Terjadwal", key: "scheduledArticles" as const, color: "bg-primary-50 text-primary-600", icon: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
  )},
  { label: "Penulis", key: "totalAuthors" as const, color: "bg-primary-100 text-primary-700", icon: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
  )},
];

export default async function AdminDashboard() {
  const stats = await getStats();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-heading">Dashboard</h1>
          <p className="text-sm text-text-muted mt-0.5">Selamat datang di panel redaksi LinkProMedia</p>
        </div>
        <Link
          href="/admin/artikel/baru"
          className="inline-flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          Tulis Artikel
        </Link>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {statCards.map((card) => (
          <div key={card.key} className="bg-white rounded-xl border border-divider p-5">
            <div className={`inline-flex p-2 rounded-lg ${card.color} mb-3`}>
              {card.icon}
            </div>
            <p className="text-2xl font-bold text-heading">{stats[card.key]}</p>
            <p className="text-sm text-text-muted mt-0.5">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Artikel terbaru */}
      <div className="bg-white rounded-xl border border-divider">
        <div className="flex items-center justify-between px-5 py-4 border-b border-divider">
          <h2 className="font-semibold text-heading text-sm">Artikel Terbaru</h2>
          <Link href="/admin/artikel" className="text-xs text-primary-600 hover:underline font-medium">
            Lihat semua →
          </Link>
        </div>
        <div className="divide-y divide-divider">
          {stats.recentArticles.map((article) => (
            <div key={article.id} className="flex items-center gap-4 px-5 py-3 hover:bg-surface/60 transition-colors">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-heading truncate">{article.title}</p>
                <p className="text-xs text-text-muted mt-0.5">{article.category} · {article.publishedAt}</p>
              </div>
              <span className={`flex-shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full ${
                article.status === "PUBLISHED"
                  ? "bg-green-100 text-green-700"
                  : article.status === "ARCHIVED"
                  ? "bg-gray-200 text-gray-600"
                  : article.status === "SCHEDULED"
                  ? "bg-primary-50 text-primary-600"
                  : "bg-accent/15 text-accent-text"
              }`}>
                {article.status === "PUBLISHED"
                  ? "Terbit"
                  : article.status === "ARCHIVED"
                  ? "Arsip"
                  : article.status === "SCHEDULED"
                  ? "Terjadwal"
                  : "Draft"}
              </span>
              <Link
                href={`/admin/artikel/${article.id}`}
                className="text-text-muted hover:text-primary-600 transition-colors flex-shrink-0"
                aria-label="Edit artikel"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </Link>
            </div>
          ))}
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Kelola Kategori", href: "/admin/kategori", desc: `${stats.totalCategories} kategori aktif` },
          { label: "Kelola Penulis", href: "/admin/penulis", desc: `${stats.totalAuthors} penulis terdaftar` },
          { label: "Lihat Website", href: "/", desc: "Buka linkpromedia.id di tab baru", external: true },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            target={item.external ? "_blank" : undefined}
            className="bg-white rounded-xl border border-divider p-5 hover:border-primary-200 hover:shadow-sm transition-all group"
          >
            <p className="text-sm font-semibold text-heading group-hover:text-primary-600 transition-colors">{item.label}</p>
            <p className="text-xs text-text-muted mt-1">{item.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
