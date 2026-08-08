"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import type { Category } from "@/types";
import ThemeToggle from "./ThemeToggle";
import Logo from "./Logo";

interface Props {
  categories: Category[];
}

export default function Header({ categories }: Props) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/cari?q=${encodeURIComponent(searchQuery.trim())}`;
    }
  }

  return (
    <header className={`sticky top-0 z-50 bg-white transition-shadow ${scrolled ? "shadow-md" : "shadow-sm"}`}>
      {/* Top bar */}
      <div className="bg-gradient-to-r from-primary-700 via-primary-600 to-primary-600 text-white text-xs py-1.5 px-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <span className="font-semibold tracking-widest">LINKPROMEDIA</span>
          <span className="hidden sm:inline text-primary-100">Berita Terkini, Terpercaya</span>
        </div>
      </div>

      {/* Main navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            <Logo tinggi={38} kelasTeks="text-2xl" priority />
          </Link>

          {/* Search bar (desktop) */}
          <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-md">
            <div className="relative w-full">
              <input
                ref={searchRef}
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari berita..."
                className="w-full border border-gray-200 rounded-full py-2 pl-4 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <button
                type="submit"
                aria-label="Cari"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary-600"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
                </svg>
              </button>
            </div>
          </form>

          {/* Bookmark, Riwayat & Tema (desktop) */}
          <div className="hidden md:flex items-center gap-1 flex-shrink-0">
            <ThemeToggle />
            <Link
              href="/kronologi"
              title="Kronologi"
              className="p-2 rounded-full text-gray-500 hover:text-primary-600 hover:bg-primary-50 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </Link>
            <Link
              href="/bookmark"
              title="Artikel Tersimpan"
              className="p-2 rounded-full text-gray-500 hover:text-primary-600 hover:bg-primary-50 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
            </Link>
            <Link
              href="/riwayat-baca"
              title="Riwayat Baca"
              className="p-2 rounded-full text-gray-500 hover:text-primary-600 hover:bg-primary-50 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 rounded-md text-gray-600 hover:bg-gray-100"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>

        {/* Category nav (desktop) */}
        <nav className="hidden md:flex items-center gap-1 pb-2 overflow-x-auto" aria-label="Navigasi kategori">
          <Link
            href="/"
            className={`text-sm font-medium px-3 py-1 rounded-full whitespace-nowrap transition-colors ${
              pathname === "/"
                ? "bg-primary-600 text-white"
                : "text-gray-700 hover:text-primary-600 hover:bg-primary-50"
            }`}
          >
            Terbaru
          </Link>
          {categories.map((cat) => {
            const active = pathname === `/kategori/${cat.slug}`;
            return (
              <Link
                key={cat.id}
                href={`/kategori/${cat.slug}`}
                className={`text-sm font-medium px-3 py-1 rounded-full whitespace-nowrap transition-colors ${
                  active
                    ? "bg-primary-600 text-white"
                    : "text-gray-700 hover:text-primary-600 hover:bg-primary-50"
                }`}
              >
                {cat.name}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 pb-4">
          {/* Mobile search */}
          <form onSubmit={handleSearch} className="pt-3 pb-2">
            <div className="relative">
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari berita..."
                className="w-full border border-gray-200 rounded-full py-2 pl-4 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <button type="submit" aria-label="Cari" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
                </svg>
              </button>
            </div>
          </form>
          {/* Mobile nav links */}
          <nav className="flex flex-col gap-1" aria-label="Navigasi kategori mobile">
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className={`text-sm font-medium py-2 px-3 rounded-lg ${
                pathname === "/" ? "bg-primary-50 text-primary-600" : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              Terbaru
            </Link>
            {categories.map((cat) => {
              const active = pathname === `/kategori/${cat.slug}`;
              return (
                <Link
                  key={cat.id}
                  href={`/kategori/${cat.slug}`}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`text-sm font-medium py-2 px-3 rounded-lg ${
                    active ? "bg-primary-50 text-primary-600" : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {cat.name}
                </Link>
              );
            })}
            <div className="border-t border-gray-100 mt-2 pt-2 flex flex-col gap-1">
              <Link
                href="/kronologi"
                onClick={() => setMobileMenuOpen(false)}
                className="text-sm font-medium py-2 px-3 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Kronologi
              </Link>
              <Link
                href="/bookmark"
                onClick={() => setMobileMenuOpen(false)}
                className="text-sm font-medium py-2 px-3 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Artikel Tersimpan
              </Link>
              <Link
                href="/riwayat-baca"
                onClick={() => setMobileMenuOpen(false)}
                className="text-sm font-medium py-2 px-3 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Riwayat Baca
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
