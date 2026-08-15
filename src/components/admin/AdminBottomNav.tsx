"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  type AdminRole,
  getVisibleAdminNavItems,
  isAdminNavActive,
} from "@/lib/adminNav";

interface Props {
  role: AdminRole;
}

/**
 * Navigasi admin untuk layar sempit.
 *
 * AdminSidebar sengaja `hidden lg:flex` — di bawah itu TIDAK ADA cara sama
 * sekali untuk membuka Kategori, Penulis, Analitik, dst dari ponsel, karena
 * SidebarToggle di topbar juga `hidden lg:inline-flex`. Ini melengkapi celah
 * itu dengan bilah navigasi di bawah layar, pola yang sudah dikenal di app
 * mobile (Instagram, YouTube, dst) — bukan meniru sidebar desktop yang
 * memang tidak muat secara horizontal di layar sempit.
 *
 * Item "primary" (lihat src/lib/adminNav.tsx) tampil langsung; sisanya ada
 * di balik tombol "Lainnya" supaya jumlah tab tetap konsisten (4) untuk
 * semua peran, alih-alih melebar mengikuti jumlah menu yang bisa dibuka.
 */
export default function AdminBottomNav({ role }: Props) {
  const pathname = usePathname();
  const [lainnyaTerbuka, setLainnyaTerbuka] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);

  const items = getVisibleAdminNavItems(role);
  const utama = items.filter((item) => item.primary);
  const lainnya = items.filter((item) => !item.primary);

  // Tutup sheet begitu berpindah halaman, supaya tidak nyangkut terbuka
  // di halaman tujuan
  useEffect(() => {
    setLainnyaTerbuka(false);
  }, [pathname]);

  useEffect(() => {
    if (!lainnyaTerbuka) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setLainnyaTerbuka(false);
    }
    document.addEventListener("keydown", onKeyDown);
    // Fokus dipindah ke sheet begitu terbuka, supaya pengguna keyboard/pembaca
    // layar tidak tertinggal di tombol "Lainnya" yang sekarang tertutup sheet
    sheetRef.current?.focus();
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [lainnyaTerbuka]);

  const adaLainnya = lainnya.length > 0;

  return (
    <>
      {/* Backdrop + sheet "Lainnya" */}
      {adaLainnya && lainnyaTerbuka && (
        <div className="lg:hidden fixed inset-0 z-40 flex flex-col justify-end">
          <button
            type="button"
            aria-label="Tutup"
            onClick={() => setLainnyaTerbuka(false)}
            className="absolute inset-0 bg-black/40"
          />
          <div
            ref={sheetRef}
            role="dialog"
            aria-modal="true"
            aria-label="Menu lainnya"
            tabIndex={-1}
            className="relative bg-white rounded-t-2xl border-t border-divider p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] outline-none"
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-gray-200" aria-hidden="true" />
            <div className="grid grid-cols-4 gap-3">
              {lainnya.map((item) => {
                const aktif = isAdminNavActive(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex flex-col items-center gap-1.5 rounded-xl px-2 py-3 text-center transition-colors ${
                      aktif ? "bg-primary-50 text-primary-600" : "text-text-muted hover:bg-surface"
                    }`}
                  >
                    <span className="flex-shrink-0">{item.icon}</span>
                    <span className="text-xs font-medium leading-tight">{item.label}</span>
                  </Link>
                );
              })}
              <Link
                href="/"
                target="_blank"
                className="flex flex-col items-center gap-1.5 rounded-xl px-2 py-3 text-center text-text-muted hover:bg-surface transition-colors"
              >
                <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                <span className="text-xs font-medium leading-tight">Website</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      <nav
        aria-label="Navigasi admin"
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-divider pb-[env(safe-area-inset-bottom)]"
      >
        <div className="grid h-14" style={{ gridTemplateColumns: `repeat(${utama.length + (adaLainnya ? 1 : 0)}, 1fr)` }}>
          {utama.map((item) => {
            const aktif = isAdminNavActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={aktif ? "page" : undefined}
                className={`flex flex-col items-center justify-center gap-0.5 transition-colors ${
                  aktif ? "text-primary-600" : "text-text-muted"
                }`}
              >
                <span className="flex-shrink-0">{item.icon}</span>
                <span className="text-[11px] font-medium leading-none">{item.label}</span>
              </Link>
            );
          })}
          {adaLainnya && (
            <button
              type="button"
              onClick={() => setLainnyaTerbuka((v) => !v)}
              aria-expanded={lainnyaTerbuka}
              aria-haspopup="dialog"
              className={`flex flex-col items-center justify-center gap-0.5 transition-colors ${
                lainnyaTerbuka || lainnya.some((item) => isAdminNavActive(pathname, item.href))
                  ? "text-primary-600"
                  : "text-text-muted"
              }`}
            >
              <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              <span className="text-[11px] font-medium leading-none">Lainnya</span>
            </button>
          )}
        </div>
      </nav>
    </>
  );
}
