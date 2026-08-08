"use client";

import { useEffect, useState } from "react";

interface Update {
  id: string;
  content: string;
  createdAt: Date | string;
  author: { name: string } | null;
}

interface Props {
  /** Update yang sudah ada saat halaman dirender — dipakai sampai polling pertama masuk */
  updates: Update[];
  slug: string;
  intervalDetik?: number;
}

/**
 * Live Event Timeline.
 *
 * Data awal datang dari server (supaya tetap terbaca mesin pencari & pembaca
 * tanpa JavaScript), lalu komponen ini menyegarkannya sendiri dari endpoint
 * publik. Dengan begitu halaman artikel tetap boleh disajikan dari cache
 * tanpa membuat update langsung ikut tertinggal.
 */
export default function LiveUpdateTimeline({ updates, slug, intervalDetik = 20 }: Props) {
  const [daftar, setDaftar] = useState<Update[]>(updates);
  const [aktif, setAktif] = useState(true);

  useEffect(() => {
    if (!aktif) return;

    let dibatalkan = false;

    async function ambil() {
      if (document.visibilityState !== "visible") return;
      try {
        const res = await fetch(`/api/articles/${encodeURIComponent(slug)}/live-updates`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = await res.json();
        if (!dibatalkan && Array.isArray(data.updates)) setDaftar(data.updates);
      } catch {
        // Gagal menyegarkan tidak boleh mengganggu pembaca — update lama tetap tampil
      }
    }

    const timer = setInterval(ambil, intervalDetik * 1000);
    return () => {
      dibatalkan = true;
      clearInterval(timer);
    };
  }, [aktif, intervalDetik, slug]);

  if (daftar.length === 0) return null;

  return (
    <div className="mb-6 bg-red-50 border border-red-100 rounded-xl p-4">
      <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
          </span>
          <span className="text-xs font-bold text-red-600 uppercase tracking-wide">Update Langsung</span>
          <span className="text-xs text-gray-500">· {daftar.length} pembaruan</span>
        </div>
        <button
          type="button"
          onClick={() => setAktif((v) => !v)}
          className="text-xs text-red-600 hover:text-red-700 font-medium"
          title={aktif ? "Hentikan pembaruan otomatis" : "Aktifkan pembaruan otomatis"}
        >
          {aktif ? "Pembaruan otomatis aktif · matikan" : "Pembaruan otomatis mati · nyalakan"}
        </button>
      </div>
      <ol className="space-y-3">
        {daftar.map((u) => (
          <li key={u.id} className="text-sm border-l-2 border-red-200 pl-3">
            <p className="text-gray-800">{u.content}</p>
            <p className="text-xs text-gray-400 mt-1">
              {u.author?.name ?? "Redaksi"} ·{" "}
              {new Date(u.createdAt).toLocaleString("id-ID", {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </li>
        ))}
      </ol>
    </div>
  );
}
