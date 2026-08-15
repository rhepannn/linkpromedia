"use client";

import { useEffect, useRef } from "react";

/**
 * Mengurutkan seksi kategori sesuai minat pembaca — DI SISI KLIEN.
 *
 * Personalisasi ini sengaja TIDAK dikerjakan di server. Membaca cookie lewat
 * `cookies()` di halaman utama membuat SELURUH halaman jadi dynamic: setiap
 * pembaca memicu render + kueri DB sendiri, dan `revalidate` tidak lagi
 * berlaku sehingga HTML tidak pernah tersaji dari cache ISR/CDN. Untuk situs
 * berita, halaman yang langsung tersaji dari cache jauh lebih berharga
 * daripada urutan kategori yang sudah tepat sejak gambar pertama.
 *
 * Karena itu server mengirim semua seksi kategori dalam urutan bawaan (statis,
 * bisa di-cache), lalu di sini urutannya disesuaikan setelah hidrasi. Yang
 * dipakai `order` CSS, bukan memindahkan node: DOM tidak dibongkar-pasang,
 * jadi tidak ada gambar yang termuat ulang.
 *
 * Tanpa JavaScript, pembaca tetap melihat seluruh kategori — hanya urutannya
 * yang bawaan. Itu penurunan yang aman untuk personalisasi.
 */
export default function KategoriPersonalisasi({ children }: { children: React.ReactNode }) {
  const wadah = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = wadah.current;
    if (!el) return;

    const cocok = document.cookie.match(/(?:^|;\s*)lp-pref=([^;]*)/);
    if (!cocok) return;

    let favorit: Set<string>;
    try {
      favorit = new Set(
        decodeURIComponent(cocok[1])
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      );
    } catch {
      // Cookie rusak/tidak ter-encode dengan benar — biarkan urutan bawaan
      return;
    }
    if (favorit.size === 0) return;

    for (const anak of Array.from(el.children) as HTMLElement[]) {
      const slug = anak.dataset.kategori;
      if (!slug || !favorit.has(slug)) continue;
      anak.style.order = "-1";
      anak.querySelector<HTMLElement>("[data-label-favorit]")?.classList.remove("hidden");
    }
  }, []);

  return (
    <div ref={wadah} className="flex flex-col">
      {children}
    </div>
  );
}
