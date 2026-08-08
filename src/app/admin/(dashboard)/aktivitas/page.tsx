import type { Metadata } from "next";
import { getRecentActivity } from "@/lib/activityLog";
import { formatDateTime } from "@/lib/utils";
import Pagination from "@/components/ui/Pagination";

export const metadata: Metadata = { title: "Log Aktivitas" };

const ACTION_ICONS: Record<string, string> = {
  LOGIN: "M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H5a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1",
  ARTICLE_CREATE: "M12 4v16m8-8H4",
  ARTICLE_UPDATE: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z",
  ARTICLE_DELETE: "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16",
  CATEGORY_CREATE: "M12 4v16m8-8H4",
  CATEGORY_UPDATE: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z",
  CATEGORY_DELETE: "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16",
  USER_CREATE: "M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z",
  USER_ROLE_CHANGE: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z",
  USER_DELETE: "M18 9v3m0 0v3m0-3h3m-3 0h-3m-6-2a4 4 0 11-8 0 4 4 0 018 0zM1 20a6 6 0 0112 0v1H1v-1z",
};

const DEFAULT_ICON = "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z";

interface Props {
  searchParams: Promise<{ hal?: string }>;
}

export default async function AktivitasPage({ searchParams }: Props) {
  const { hal } = await searchParams;
  const halaman = Math.max(1, Number(hal) || 1);

  const { entries, total, totalHalaman } = await getRecentActivity(halaman);

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h1 className="text-xl font-bold text-heading">Log Aktivitas</h1>
        <p className="text-sm text-text-muted mt-0.5">
          Riwayat aktivitas redaksi di panel admin{total > 0 && ` — ${total} catatan`}
        </p>
      </div>

      <div className="bg-white rounded-xl border border-divider divide-y divide-divider">
        {entries.length === 0 ? (
          <p className="text-center text-text-muted text-sm py-10">Belum ada aktivitas tercatat.</p>
        ) : (
          entries.map((a) => (
            <div key={a.id} className="flex items-start gap-3 px-5 py-3.5">
              <span className="mt-0.5 flex-shrink-0 w-7 h-7 rounded-full bg-primary-50 text-primary-600 flex items-center justify-center">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={ACTION_ICONS[a.action] ?? DEFAULT_ICON} />
                </svg>
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-heading">{a.description}</p>
                <p className="text-xs text-text-muted mt-0.5">
                  {a.user?.name ?? "Sistem"} · {formatDateTime(a.createdAt)}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      <Pagination halaman={halaman} totalHalaman={totalHalaman} basePath="/admin/aktivitas" />
    </div>
  );
}
