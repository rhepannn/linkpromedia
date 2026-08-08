"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const KUNCI_DISMISS = "linkpromedia:privacy-notice-dismissed";

/**
 * Notifikasi privasi non-blocking.
 *
 * Situs ini tidak memasang cookie iklan/pelacak pihak ketiga, tapi tetap
 * menyimpan sedikit data di perangkat pembaca (bookmark, riwayat baca) dan
 * mengirim statistik kunjungan anonim. Banner ini memberi tahu itu secara
 * terbuka alih-alih diam-diam — tidak memblokir apa pun, cukup ditutup sekali.
 */
export default function PrivacyNotice() {
  const [tampil, setTampil] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(KUNCI_DISMISS)) setTampil(true);
    } catch {
      // localStorage diblokir — jangan paksa tampilkan banner
    }
  }, []);

  function tutup() {
    setTampil(false);
    try {
      localStorage.setItem(KUNCI_DISMISS, "1");
    } catch {
      // gagal simpan preferensi tidak masalah, banner cukup tersembunyi sesi ini
    }
  }

  if (!tampil) return null;

  return (
    <div
      role="region"
      aria-label="Notifikasi privasi"
      className="fixed bottom-0 inset-x-0 z-50 bg-gray-900 text-gray-200 px-4 py-3 sm:py-4"
    >
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
        <p className="text-xs sm:text-sm flex-1">
          Kami menyimpan bookmark &amp; riwayat bacamu langsung di perangkatmu (bukan di server
          kami), dan mengumpulkan statistik kunjungan yang dianonimkan untuk memahami artikel mana
          yang banyak dibaca. Selengkapnya di{" "}
          <Link href="/kebijakan-privasi" className="underline hover:text-white">
            Kebijakan Privasi
          </Link>
          .
        </p>
        <button
          type="button"
          onClick={tutup}
          className="flex-shrink-0 bg-white text-gray-900 text-xs sm:text-sm font-medium px-4 py-1.5 rounded-full hover:bg-gray-100 transition-colors"
        >
          Mengerti
        </button>
      </div>
    </div>
  );
}
