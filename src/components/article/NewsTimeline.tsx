"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";

interface KronologiEntry {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  thumbnailUrl: string | null;
  publishedAt: string | null;
  isBreaking: boolean;
  isLive: boolean;
  liveUpdateCount: number;
  type: "breaking" | "live" | "article";
  category: { id: string; name: string; slug: string };
  author: { id: string; name: string };
}

type FilterType = "semua" | "breaking" | "live";

export default function NewsTimeline() {
  const [entries, setEntries] = useState<KronologiEntry[]>([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [memuat, setMemuat] = useState(false);
  const [filter, setFilter] = useState<FilterType>("semua");
  const muatRef = useRef(false);

  const ambil = useCallback(
    async (of: number, reset: boolean) => {
      if (muatRef.current) return;
      muatRef.current = true;
      setMemuat(true);

      try {
        const params = new URLSearchParams({ offset: String(of), limit: "20" });
        if (filter !== "semua") params.set("type", filter);
        const res = await fetch(`/api/kronologi?${params}`);
        if (!res.ok) return;
        const data = await res.json();
        const masuk: KronologiEntry[] = Array.isArray(data.entries) ? data.entries : [];
        setEntries((prev) => (reset ? masuk : [...prev, ...masuk]));
        setHasMore(Boolean(data.hasMore));
        setOffset(reset ? 20 : of + 20);
      } finally {
        muatRef.current = false;
        setMemuat(false);
      }
    },
    [filter]
  );

  useEffect(() => {
    setOffset(0);
    setHasMore(true);
    setEntries([]);
    ambil(0, true);
  }, [filter, ambil]);

  const muatLagi = useCallback(() => {
    if (hasMore && !memuat) ambil(offset, false);
  }, [hasMore, memuat, ambil, offset]);

  const grup = new Map<string, KronologiEntry[]>();
  for (const e of entries) {
    const label = dateLabel(e.publishedAt);
    const ada = grup.get(label);
    if (ada) ada.push(e);
    else grup.set(label, [e]);
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Filter */}
      <div className="flex items-center gap-2 mb-8">
        {(["semua", "breaking", "live"] as FilterType[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setFilter(t)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === t
                ? "bg-primary-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {t === "semua" ? "Semua" : t === "breaking" ? "Breaking" : "Live"}
          </button>
        ))}
      </div>

      {entries.length === 0 && !memuat && (
        <p className="text-gray-400 text-center py-12">Belum ada peristiwa.</p>
      )}

      {/* Timeline */}
      <div className="relative">
        {/* Garis vertikal timeline */}
        <div className="absolute left-[19px] top-0 bottom-0 w-0.5 bg-gray-100" aria-hidden="true" />

        <div className="space-y-10">
          {Array.from(grup.entries()).map(([label, daftar]) => (
            <div key={label}>
              <div className="flex items-center gap-4 mb-5">
                <div className="relative z-10 w-10 h-10 rounded-full bg-primary-600 text-white flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-heading">{label}</h3>
              </div>

              <div className="space-y-5">
                {daftar.map((entry) => (
                  <Link
                    key={entry.id}
                    href={`/berita/${entry.slug}`}
                    className="flex items-start gap-4 group"
                  >
                    <div className="relative z-10 flex-shrink-0 mt-1.5">
                      <div
                        className={`w-3 h-3 rounded-full ${
                          entry.type === "breaking"
                            ? "bg-red-500 ring-2 ring-red-100"
                            : entry.type === "live"
                            ? "bg-green-500 ring-2 ring-green-100"
                            : "bg-gray-300"
                        }`}
                      />
                    </div>

                    <div className="flex-1 min-w-0 bg-white hover:bg-gray-50 rounded-lg p-4 border border-gray-100 transition-colors">
                      <div className="flex items-center gap-2 mb-1">
                        {entry.isBreaking && (
                          <span className="text-[10px] font-bold uppercase bg-red-100 text-red-700 px-1.5 py-0.5 rounded">
                            Breaking
                          </span>
                        )}
                        {entry.isLive && (
                          <span className="text-[10px] font-bold uppercase bg-green-100 text-green-700 px-1.5 py-0.5 rounded flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                            Live
                            {entry.liveUpdateCount > 0 && ` · ${entry.liveUpdateCount}`}
                          </span>
                        )}
                        <span className="text-xs text-gray-400">
                          {entry.publishedAt
                            ? new Date(entry.publishedAt).toLocaleTimeString("id-ID", {
                                hour: "2-digit",
                                minute: "2-digit",
                                hour12: false,
                              })
                            : ""}
                        </span>
                      </div>

                      <h4 className="font-semibold text-heading text-sm leading-snug group-hover:text-primary-600 transition-colors line-clamp-2">
                        {entry.title}
                      </h4>

                      {entry.excerpt && (
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{entry.excerpt}</p>
                      )}

                      <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                        <span>{entry.category.name}</span>
                        <span>·</span>
                        <span>{entry.author.name}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Muat lebih */}
      {hasMore && (
        <div className="flex justify-center mt-8 pb-8">
          <button
            type="button"
            onClick={muatLagi}
            disabled={memuat}
            className="px-6 py-2 text-sm font-medium text-primary-600 border border-primary-200 rounded-full hover:bg-primary-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {memuat ? "Memuat..." : "Muat lebih banyak"}
          </button>
        </div>
      )}
    </div>
  );
}

function dateLabel(dateStr: string | null): string {
  if (!dateStr) return "Tanpa tanggal";
  const d = new Date(dateStr);
  const sekarang = new Date();
  const diff = new Date(sekarang.getFullYear(), sekarang.getMonth(), sekarang.getDate()).getTime() -
               new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

  if (diff === 0) return "Hari Ini";
  if (diff === 86400000) return "Kemarin";
  if (diff < 7 * 86400000) return `${Math.ceil(diff / 86400000)} hari lalu`;
  return formatDate(dateStr);
}
