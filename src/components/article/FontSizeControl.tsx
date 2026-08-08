"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "linkpromedia:reader-scale";
const STEPS = [0.9, 1, 1.15, 1.3];
const LABELS = ["Kecil", "Normal", "Besar", "Sangat besar"];

export default function FontSizeControl() {
  const [index, setIndex] = useState(1);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const saved = parseFloat(localStorage.getItem(STORAGE_KEY) ?? "1");
      const found = STEPS.indexOf(saved);
      if (found !== -1) setIndex(found);
    } catch {
      // Abaikan — pakai ukuran normal
    }
  }, []);

  // Terapkan & simpan setiap kali ukuran berubah. Efek samping ditaruh di sini,
  // bukan di dalam updater state, supaya klik cepat berturut-turut tidak ada
  // yang terlewat dan tidak berjalan ganda di StrictMode.
  useEffect(() => {
    if (!mounted) return;
    const scale = STEPS[index];
    document.documentElement.style.setProperty("--reader-scale", String(scale));
    try {
      localStorage.setItem(STORAGE_KEY, String(scale));
    } catch {
      // Penyimpanan diblokir — ukuran tetap berlaku untuk sesi ini
    }
  }, [index, mounted]);

  /** Naik/turun satu langkah, dihitung dari nilai terbaru */
  function step(delta: number) {
    setIndex((prev) => Math.min(STEPS.length - 1, Math.max(0, prev + delta)));
  }

  if (!mounted) return null;

  return (
    <div className="flex items-center gap-1">
      <span className="text-xs text-text-muted mr-0.5">Ukuran teks</span>
      <button
        type="button"
        onClick={() => step(-1)}
        disabled={index === 0}
        aria-label="Perkecil ukuran teks"
        title="Perkecil ukuran teks"
        className="w-7 h-7 rounded-md border border-gray-200 text-gray-600 text-xs hover:border-primary-300 hover:text-primary-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        A-
      </button>
      <span className="text-xs text-gray-500 w-20 text-center" aria-live="polite">
        {LABELS[index]}
      </span>
      <button
        type="button"
        onClick={() => step(1)}
        disabled={index === STEPS.length - 1}
        aria-label="Perbesar ukuran teks"
        title="Perbesar ukuran teks"
        className="w-7 h-7 rounded-md border border-gray-200 text-gray-600 text-sm font-semibold hover:border-primary-300 hover:text-primary-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        A+
      </button>
    </div>
  );
}
