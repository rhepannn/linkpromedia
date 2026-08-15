"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { type AdminRole, getVisibleAdminNavItems, isAdminNavActive } from "@/lib/adminNav";

interface Props {
  role: AdminRole;
}

export default function AdminSidebar({ role }: Props) {
  // Dipakai HANYA untuk memunculkan tooltip nama menu saat sidebar menyempit
  // (ikonnya saja tidak cukup jelas). Tampilan lebarnya sendiri diurus CSS.
  //
  // Tombol pengubahnya ada di topbar — komponen terpisah — jadi state di sini
  // tidak bisa sekadar dibaca sekali saat pasang: ia harus ikut memantau
  // atribut di <html>, kalau tidak tooltipnya tidak pernah muncul saat
  // pengguna menyempitkan sidebar dari topbar.
  const [tertutup, setTertutup] = useState(false);
  useEffect(() => {
    const akar = document.documentElement;
    const baca = () => setTertutup(akar.getAttribute("data-sidebar") === "tutup");
    baca();
    const pengamat = new MutationObserver(baca);
    pengamat.observe(akar, { attributes: true, attributeFilter: ["data-sidebar"] });
    return () => pengamat.disconnect();
  }, []);

  const visibleItems = getVisibleAdminNavItems(role);
  const pathname = usePathname();
  const isActive = (href: string) => isAdminNavActive(pathname, href);

  return (
    <aside className="sidebar-admin hidden lg:flex flex-col bg-white border-r border-divider min-h-screen flex-shrink-0">
      {/* Logo */}
      <div className="p-5 border-b border-divider">
        <Link href="/admin" className="flex items-center gap-1.5 sidebar-tautan">
          <Image src="/logo-mark.png" alt="" width={35} height={30} className="w-auto h-[30px] flex-shrink-0" />
          <span className="text-xl font-black text-primary-600 sidebar-teks" aria-hidden={tertutup}>LinkPro</span>
          <span className="text-xl font-black text-heading sidebar-teks" aria-hidden={tertutup}>Media</span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1" aria-label="Navigasi admin">
        {visibleItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            // Saat menyempit hanya ikon yang tersisa, jadi nama menunya
            // dipindah ke tooltip agar tetap bisa dikenali
            title={tertutup ? item.label : undefined}
            className={`sidebar-tautan flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              isActive(item.href)
                ? "bg-primary-50 text-primary-600"
                : "text-text-muted hover:bg-surface hover:text-heading"
            }`}
          >
            <span className={`flex-shrink-0 ${isActive(item.href) ? "text-primary-600" : "text-text-muted"}`}>
              {item.icon}
            </span>
            <span className="sidebar-teks" aria-hidden={tertutup}>{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* Footer nav */}
      <div className="p-3 border-t border-divider space-y-1">
        <Link
          href="/"
          target="_blank"
          title={tertutup ? "Lihat Website" : undefined}
          className="sidebar-tautan flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-text-muted hover:bg-surface hover:text-heading transition-colors"
        >
          <svg className="w-5 h-5 text-text-muted flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          <span className="sidebar-teks" aria-hidden={tertutup}>Lihat Website</span>
        </Link>
      </div>
    </aside>
  );
}
