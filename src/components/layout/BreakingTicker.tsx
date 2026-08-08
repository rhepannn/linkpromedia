"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { ArticleCard } from "@/types";

interface Props {
  articles: ArticleCard[];
}

const JEDA_PUTAR_MS = 6000;

/**
 * Pita Breaking News.
 *
 * Prinsip yang dipegang: mendesak, tapi tidak berteriak. Kalau pita ini
 * berkedip-kedip merah sepanjang hari, pembaca berhenti melihatnya — dan
 * saat ada kabar yang benar-benar genting, tidak ada lagi cara menandainya.
 * Jadi geraknya dibuat sesedikit mungkin: satu titik denyut kecil dan
 * pergantian judul yang meredup halus, bukan meluncur atau berkedip.
 */
export default function BreakingTicker({ articles }: Props) {
  const [index, setIndex] = useState(0);
  const [berhenti, setBerhenti] = useState(false);
  const [tampil, setTampil] = useState(true);

  useEffect(() => {
    if (articles.length < 2 || berhenti) return;

    // Rotasi tetap berjalan untuk SEMUA pembaca — dulu dimatikan total di
    // bawah prefers-reduced-motion, tapi itu membuat kabar breaking lain tak
    // pernah terlihat (dan pemilik situs mengira fiturnya rusak, karena
    // Windows yang mematikan efek animasi ikut memicu preferensi ini).
    // Kompromi aksesibilitasnya: pengguna kurangi-gerak mendapat pergantian
    // JUDUL INSTAN tanpa animasi memudar, dan rotasi tetap bisa dijeda
    // lewat hover/fokus — kontrol jeda itulah syarat utamanya.
    const kurangiGerak = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const timer = setInterval(() => {
      if (kurangiGerak) {
        setIndex((i) => (i + 1) % articles.length);
        return;
      }
      // Redupkan dulu, ganti judul saat tak terlihat, lalu munculkan lagi
      setTampil(false);
      setTimeout(() => {
        setIndex((i) => (i + 1) % articles.length);
        setTampil(true);
      }, 200);
    }, JEDA_PUTAR_MS);

    return () => clearInterval(timer);
  }, [articles.length, berhenti]);

  if (articles.length === 0) return null;

  const current = articles[index];

  return (
    <div
      className="bg-primary-700 text-white"
      onMouseEnter={() => setBerhenti(true)}
      onMouseLeave={() => setBerhenti(false)}
      // Fokus keyboard juga menghentikan rotasi — tanpa ini, tautan bisa
      // berganti tepat saat pengguna keyboard hendak menekannya
      onFocusCapture={() => setBerhenti(true)}
      onBlurCapture={() => setBerhenti(false)}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 min-h-10 flex items-center gap-3 py-1.5">
        <span className="badge-accent flex-shrink-0">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-text/60" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-accent-text" />
          </span>
          Breaking
        </span>

        <Link
          key={current.id}
          href={`/berita/${current.slug}`}
          className={`text-sm font-semibold leading-snug line-clamp-2 sm:truncate hover:underline transition-opacity duration-200 ${
            tampil ? "opacity-100" : "opacity-0"
          }`}
        >
          {current.title}
        </Link>

        {/* Titik penanda posisi — memberi tahu pembaca masih ada kabar lain,
            sekaligus jadi tombol untuk melompat langsung */}
        {articles.length > 1 && (
          <div className="ml-auto flex-shrink-0 flex items-center gap-1.5">
            {articles.map((a, i) => (
              <button
                key={a.id}
                type="button"
                onClick={() => {
                  setIndex(i);
                  setTampil(true);
                }}
                aria-label={`Berita breaking ${i + 1} dari ${articles.length}`}
                aria-current={i === index}
                className="p-1.5 -m-1.5 group"
              >
                <span
                  className={`block h-1.5 w-1.5 rounded-full transition-colors ${
                    i === index ? "bg-accent" : "bg-white/35 group-hover:bg-white/60"
                  }`}
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
