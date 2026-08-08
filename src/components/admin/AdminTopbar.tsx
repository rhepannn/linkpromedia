"use client";

import { signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import SidebarToggle from "./SidebarToggle";

interface Props {
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

const breadcrumbMap: Record<string, string> = {
  "/admin": "Dashboard",
  "/admin/artikel": "Artikel",
  "/admin/artikel/baru": "Artikel Baru",
  "/admin/kategori": "Kategori",
  "/admin/penulis": "Penulis",
};

export default function AdminTopbar({ user }: Props) {
  const pathname = usePathname();

  const pageTitle =
    Object.entries(breadcrumbMap)
      .reverse()
      .find(([key]) => pathname.startsWith(key))?.[1] ?? "Admin";

  return (
    <header className="h-14 bg-white border-b border-divider flex items-center justify-between px-6">
      {/* Tombol tutup sidebar + judul halaman */}
      <div className="flex items-center gap-2">
        <SidebarToggle />
        <h2 className="text-base font-semibold text-heading">{pageTitle}</h2>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        {/* Tombol "Artikel Baru" tetap tersedia di halaman Artikel dan Dashboard,
            jadi slot topbar ini dipakai untuk akses cepat ke ChatBot */}
        <Link
          href="/admin/chatbot"
          className="hidden sm:inline-flex items-center gap-1.5 bg-primary-600 text-white text-xs font-semibold px-3.5 py-1.5 rounded-full hover:bg-primary-700 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          ChatBot
        </Link>

        {/* User menu */}
        <div className="flex items-center gap-2 pl-3 border-l border-divider">
          <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-bold text-sm select-none">
            {user?.name?.[0]?.toUpperCase() ?? "A"}
          </div>
          <div className="hidden sm:block">
            <p className="text-xs font-medium text-heading leading-none">{user?.name ?? "Admin"}</p>
            <p className="text-xs text-text-muted leading-none mt-0.5">{user?.email}</p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/admin/login" })}
            aria-label="Keluar"
            title="Keluar"
            className="ml-2 text-text-muted hover:text-primary-600 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}
