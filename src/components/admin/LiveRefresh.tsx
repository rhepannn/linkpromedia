"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  /** Jeda penyegaran dalam detik */
  intervalDetik?: number;
}

/**
 * Real-time Analytics Dashboard — menyegarkan data halaman secara berkala
 * tanpa memuat ulang seluruh halaman, sehingga posisi gulir dan interaksi
 * pembaca tidak terganggu.
 *
 * Penyegaran dihentikan saat tab tidak aktif supaya tidak membebani server
 * oleh tab yang ditinggal terbuka.
 */
export default function LiveRefresh({ intervalDetik = 30 }: Props) {
  const router = useRouter();
  const [aktif, setAktif] = useState(true);
  const [terakhir, setTerakhir] = useState<Date | null>(null);

  useEffect(() => {
    if (!aktif) return;

    const timer = setInterval(() => {
      // Jangan menyegarkan saat tab sedang tidak dilihat
      if (document.visibilityState !== "visible") return;
      router.refresh();
      setTerakhir(new Date());
    }, intervalDetik * 1000);

    return () => clearInterval(timer);
  }, [aktif, intervalDetik, router]);

  return (
    <div className="flex items-center gap-2 text-xs text-text-muted">
      <button
        type="button"
        onClick={() => setAktif((v) => !v)}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition-colors ${
          aktif
            ? "border-green-300 text-green-700 bg-green-50"
            : "border-divider text-text-muted hover:border-primary-300"
        }`}
        title={aktif ? "Klik untuk menghentikan pembaruan otomatis" : "Klik untuk mengaktifkan pembaruan otomatis"}
      >
        {aktif ? (
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
          </span>
        ) : (
          <span className="h-2 w-2 rounded-full bg-gray-400" />
        )}
        {aktif ? `Live · tiap ${intervalDetik} dtk` : "Pembaruan dijeda"}
      </button>

      {terakhir && aktif && (
        <span suppressHydrationWarning>
          diperbarui {terakhir.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
        </span>
      )}
    </div>
  );
}
