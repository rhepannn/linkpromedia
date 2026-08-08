import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAnalyticsSummary } from "@/lib/analytics";
import { getSessionActor } from "@/lib/sessionRole";
import { canViewAnalytics } from "@/lib/permissions";
import LiveRefresh from "@/components/admin/LiveRefresh";
import DailyViewsChart from "@/components/admin/DailyViewsChart";

export const metadata: Metadata = { title: "Analitik" };

// Selalu ambil data terbaru — halaman ini menyegarkan diri tiap 30 detik
export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ hari?: string }>;
}

/** Ubah detik jadi "2 mnt 15 dtk" */
function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds} dtk`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s === 0 ? `${m} mnt` : `${m} mnt ${s} dtk`;
}

const RANGES = [
  { days: 7, label: "7 hari" },
  { days: 30, label: "30 hari" },
  { days: 90, label: "90 hari" },
];

export default async function AnalitikPage({ searchParams }: Props) {
  const actor = await getSessionActor();
  if (!actor) redirect("/admin/login");
  if (!canViewAnalytics(actor.role)) redirect("/admin");

  const { hari } = await searchParams;
  const days = RANGES.some((r) => String(r.days) === hari) ? Number(hari) : 30;

  const stats = await getAnalyticsSummary(days);
  const totalSources = stats.sources.reduce((sum, s) => sum + s.count, 0) || 1;

  const cards = [
    { label: "Total Kunjungan", value: stats.totalViews.toLocaleString("id-ID") },
    { label: "Pengunjung Unik", value: stats.uniqueVisitors.toLocaleString("id-ID") },
    { label: "Rata-rata Waktu Baca", value: formatDuration(stats.avgReadSeconds) },
    { label: "Bounce Rate", value: `${stats.bounceRate}%` },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-heading">Analitik</h1>
          <p className="text-sm text-text-muted mt-0.5 mb-2">
            Statistik kunjungan {days} hari terakhir
          </p>
          <LiveRefresh intervalDetik={30} />
        </div>
        <div className="flex gap-1">
          {RANGES.map((r) => (
            <Link
              key={r.days}
              href={`/admin/analitik?hari=${r.days}`}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                r.days === days
                  ? "bg-primary-600 border-primary-600 text-white"
                  : "border-divider text-text-muted hover:border-primary-300"
              }`}
            >
              {r.label}
            </Link>
          ))}
        </div>
      </div>

      {stats.totalViews === 0 ? (
        <div className="bg-white rounded-xl border border-divider py-16 text-center">
          <div className="text-4xl mb-3">📊</div>
          <p className="text-sm text-text-muted">
            Belum ada data kunjungan pada rentang ini.
          </p>
        </div>
      ) : (
        <>
          {/* Ringkasan angka */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {cards.map((c) => (
              <div key={c.label} className="bg-white rounded-xl border border-divider p-5">
                <p className="text-2xl font-bold text-heading">{c.value}</p>
                <p className="text-sm text-text-muted mt-0.5">{c.label}</p>
              </div>
            ))}
          </div>

          {/* Grafik kunjungan harian */}
          <div className="bg-white rounded-xl border border-divider p-5">
            <h2 className="font-semibold text-heading text-sm mb-4">Kunjungan Harian</h2>
            <DailyViewsChart data={stats.dailyViews} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Sumber trafik */}
            <div className="bg-white rounded-xl border border-divider p-5">
              <h2 className="font-semibold text-heading text-sm mb-4">Sumber Kunjungan</h2>
              <ul className="space-y-3">
                {stats.sources.map((s) => {
                  const pct = Math.round((s.count / totalSources) * 100);
                  return (
                    <li key={s.source}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-heading capitalize">{s.source}</span>
                        <span className="text-text-muted">
                          {s.count.toLocaleString("id-ID")} ({pct}%)
                        </span>
                      </div>
                      <div className="h-1.5 bg-surface rounded-full overflow-hidden">
                        <div className="h-full bg-primary-500 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Artikel terpopuler */}
            <div className="bg-white rounded-xl border border-divider p-5">
              <h2 className="font-semibold text-heading text-sm mb-4">Artikel Terpopuler</h2>
              {stats.topArticles.length === 0 ? (
                <p className="text-xs text-text-muted">Belum ada kunjungan ke artikel.</p>
              ) : (
                <ol className="space-y-3">
                  {stats.topArticles.map((a, i) => (
                    <li key={a.slug} className="flex items-start gap-3">
                      <span className="text-xs font-bold text-primary-300 w-4 flex-shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/berita/${a.slug}`}
                          target="_blank"
                          className="text-xs text-heading hover:text-primary-600 line-clamp-2 transition-colors"
                        >
                          {a.title}
                        </Link>
                        <p className="text-xs text-text-muted mt-0.5">
                          {a.views.toLocaleString("id-ID")} kunjungan
                          {a.avgSeconds > 0 && ` · rata-rata ${formatDuration(a.avgSeconds)}`}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>
        </>
      )}

      {stats.totalViews > 0 && (stats.byCategory.length > 0 || stats.byAuthor.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Performa kategori */}
          <div className="bg-white rounded-xl border border-divider p-5">
            <h2 className="font-semibold text-heading text-sm mb-4">Performa Kategori</h2>
            {stats.byCategory.length === 0 ? (
              <p className="text-xs text-text-muted">Belum ada data.</p>
            ) : (
              <ul className="space-y-3">
                {stats.byCategory.map((c) => {
                  const pct = Math.round((c.views / stats.byCategory[0].views) * 100);
                  return (
                    <li key={c.name}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-heading">{c.name}</span>
                        <span className="text-text-muted">
                          {c.views.toLocaleString("id-ID")} kunjungan · {c.articles} artikel
                        </span>
                      </div>
                      <div className="h-1.5 bg-surface rounded-full overflow-hidden">
                        <div className="h-full bg-primary-500 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Performa penulis */}
          <div className="bg-white rounded-xl border border-divider p-5">
            <h2 className="font-semibold text-heading text-sm mb-4">Performa Penulis</h2>
            {stats.byAuthor.length === 0 ? (
              <p className="text-xs text-text-muted">Belum ada data.</p>
            ) : (
              <ul className="space-y-3">
                {stats.byAuthor.map((a) => {
                  const pct = Math.round((a.views / stats.byAuthor[0].views) * 100);
                  return (
                    <li key={a.name}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-heading">{a.name}</span>
                        <span className="text-text-muted">
                          {a.views.toLocaleString("id-ID")} kunjungan · {a.articles} artikel
                        </span>
                      </div>
                      <div className="h-1.5 bg-surface rounded-full overflow-hidden">
                        <div className="h-full bg-primary-500 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}

      <p className="text-xs text-text-muted">
        Statistik dikumpulkan secara anonim. Alamat IP tidak disimpan — hanya sidik acak
        yang berganti setiap hari, sehingga pembaca tidak bisa dilacak antar hari.
      </p>
    </div>
  );
}
