"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";

const navItems = [
  {
    label: "Dashboard",
    href: "/admin",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    label: "Artikel",
    href: "/admin/artikel",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    label: "Kategori",
    href: "/admin/kategori",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
      </svg>
    ),
  },
  {
    label: "Penulis",
    href: "/admin/penulis",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    label: "Media",
    href: "/admin/media",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    label: "Analitik",
    href: "/admin/analitik",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    label: "Aktivitas",
    href: "/admin/aktivitas",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
];

interface Props {
  role: "ADMIN" | "EDITOR" | "AUTHOR";
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

  // Sembunyikan menu yang memang tidak bisa dibuka peran ini
  const visibleItems = navItems.filter((item) => {
    if (item.href === "/admin/penulis") return role === "ADMIN";
    if (item.href === "/admin/analitik") return role === "ADMIN" || role === "EDITOR";
    if (item.href === "/admin/kategori") return role === "ADMIN" || role === "EDITOR";
    return true;
  });

  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  }

  return (
    <aside className="sidebar-admin hidden lg:flex flex-col bg-white border-r border-divider min-h-screen flex-shrink-0">
      {/* Logo */}
      <div className="p-5 border-b border-divider">
        <Link href="/admin" className="flex items-center gap-1.5 sidebar-tautan">
          <Image src="/logo-mark.png" alt="" width={35} height={30} className="w-auto h-[30px] flex-shrink-0" />
          <span className="text-xl font-black text-primary-600 sidebar-teks">LinkPro</span>
          <span className="text-xl font-black text-heading sidebar-teks">Media</span>
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
            <span className="sidebar-teks">{item.label}</span>
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
          <span className="sidebar-teks">Lihat Website</span>
        </Link>
      </div>
    </aside>
  );
}
