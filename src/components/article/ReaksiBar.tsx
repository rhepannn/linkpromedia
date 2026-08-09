"use client";

import { useEffect, useState } from "react";

interface Props {
  slug: string;
}

/**
 * Bar reaksi pembaca di bawah artikel — 👍❤️😮😢😡 seperti lazimnya situs
 * berita. Identitasnya hash harian anonim di server; komponen ini cuma
 * menampilkan dan mengirim, tidak menyimpan apa pun tentang pembaca.
 */
const DAFTAR: { jenis: string; emoji: string; label: string }[] = [
  { jenis: "suka", emoji: "👍", label: "Suka" },
  { jenis: "cinta", emoji: "❤️", label: "Cinta" },
  { jenis: "kaget", emoji: "😮", label: "Kaget" },
  { jenis: "sedih", emoji: "😢", label: "Sedih" },
  { jenis: "marah", emoji: "😡", label: "Marah" },
];

export default function ReaksiBar({ slug }: Props) {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [milikku, setMilikku] = useState<string | null>(null);
  const [sibuk, setSibuk] = useState(false);
  const [dimuat, setDimuat] = useState(false);

  useEffect(() => {
    let batal = false;
    fetch(`/api/articles/${slug}/reaksi`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (batal || !data) return;
        setCounts(data.counts ?? {});
        setMilikku(data.milikku ?? null);
        setDimuat(true);
      })
      .catch(() => {
        /* gagal memuat = bar tidak muncul; jangan ganggu pembaca */
      });
    return () => {
      batal = true;
    };
  }, [slug]);

  async function bereaksi(jenis: string) {
    if (sibuk) return;
    setSibuk(true);

    // Optimistis: UI berubah duluan supaya terasa hidup, server menyusul.
    // Kalau server gagal, jawaban GET berikutnya yang meluruskan.
    const sebelumnya = { counts: { ...counts }, milikku };
    setCounts((c) => {
      const baru = { ...c };
      if (milikku === jenis) {
        baru[jenis] = Math.max((baru[jenis] ?? 1) - 1, 0);
      } else {
        if (milikku) baru[milikku] = Math.max((baru[milikku] ?? 1) - 1, 0);
        baru[jenis] = (baru[jenis] ?? 0) + 1;
      }
      return baru;
    });
    setMilikku((m) => (m === jenis ? null : jenis));

    try {
      const res = await fetch(`/api/articles/${slug}/reaksi`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jenis }),
      });
      if (res.ok) {
        const data = await res.json();
        setCounts(data.counts ?? {});
        setMilikku(data.milikku ?? null);
      } else {
        setCounts(sebelumnya.counts);
        setMilikku(sebelumnya.milikku);
      }
    } catch {
      setCounts(sebelumnya.counts);
      setMilikku(sebelumnya.milikku);
    } finally {
      setSibuk(false);
    }
  }

  // Sebelum data pertama tiba, jangan tampilkan angka nol yang berkedip
  if (!dimuat) return null;

  return (
    <div className="mt-8 pt-6 border-t border-divider">
      <p className="text-sm font-semibold text-heading mb-3">Apa reaksimu?</p>
      <div className="flex flex-wrap gap-2">
        {DAFTAR.map(({ jenis, emoji, label }) => {
          const aktif = milikku === jenis;
          return (
            <button
              key={jenis}
              type="button"
              onClick={() => bereaksi(jenis)}
              disabled={sibuk}
              aria-pressed={aktif}
              aria-label={`${label}${counts[jenis] ? ` (${counts[jenis]})` : ""}`}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-full border text-sm transition-all disabled:opacity-60 ${
                aktif
                  ? "border-primary-500 bg-primary-50 text-primary-700 scale-105"
                  : "border-divider text-text-muted hover:border-primary-300 hover:scale-105"
              }`}
            >
              <span aria-hidden="true">{emoji}</span>
              {counts[jenis] > 0 && (
                <span className="tabular-nums text-xs font-medium">{counts[jenis]}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
