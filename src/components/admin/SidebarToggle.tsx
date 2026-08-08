"use client";

import { useState, useEffect } from "react";

/**
 * Tombol buka/tutup sidebar admin.
 *
 * Ditaruh di topbar, bukan di dalam sidebar, supaya posisinya tetap sama
 * baik sidebar sedang lebar maupun menyempit — kalau tombolnya ikut di dalam
 * sidebar, ia ikut bergeser/mengecil justru saat paling dibutuhkan.
 *
 * Lebar sidebar sendiri diatur CSS lewat atribut data-sidebar di <html>
 * (lihat globals.css). Komponen ini hanya membalik atribut itu dan menyimpan
 * pilihannya; state di sini murni untuk label & aria, bukan untuk tampilan.
 */
export default function SidebarToggle() {
  const [tertutup, setTertutup] = useState(false);

  useEffect(() => {
    setTertutup(document.documentElement.getAttribute("data-sidebar") === "tutup");
  }, []);

  function toggle() {
    const akar = document.documentElement;
    const sedangTutup = akar.getAttribute("data-sidebar") === "tutup";
    if (sedangTutup) {
      akar.removeAttribute("data-sidebar");
      localStorage.setItem("linkpromedia:sidebar", "buka");
    } else {
      akar.setAttribute("data-sidebar", "tutup");
      localStorage.setItem("linkpromedia:sidebar", "tutup");
    }
    setTertutup(!sedangTutup);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-expanded={!tertutup}
      aria-label={tertutup ? "Lebarkan menu samping" : "Sempitkan menu samping"}
      title={tertutup ? "Lebarkan menu" : "Sempitkan menu"}
      // Hanya relevan di layar besar — sidebar-nya sendiri tersembunyi di bawah lg
      className="hidden lg:inline-flex items-center justify-center w-9 h-9 -ml-1.5 rounded-lg text-text-muted hover:bg-surface hover:text-heading transition-colors"
    >
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <rect x="3" y="4" width="18" height="16" rx="2" strokeWidth={1.8} />
        <path d="M9 4v16" strokeWidth={1.8} strokeLinecap="round" />
      </svg>
    </button>
  );
}
