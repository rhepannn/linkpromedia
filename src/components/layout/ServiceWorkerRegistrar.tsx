"use client";

import { useEffect } from "react";

/**
 * Mendaftarkan Service Worker untuk Offline Reading.
 *
 * Sengaja hanya di production: saat development, Service Worker menyimpan
 * aset lama dan membuat perubahan kode seolah tidak berpengaruh — sumber
 * kebingungan klasik yang tidak sebanding manfaatnya di lokal.
 */
export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    const daftarkan = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Pendaftaran gagal bukan hal fatal — situs tetap jalan normal,
        // hanya kemampuan baca offline yang tidak aktif
      });
    };

    // Tunggu halaman selesai dimuat supaya tidak berebut bandwidth
    // dengan permintaan yang benar-benar dibutuhkan pembaca
    if (document.readyState === "complete") daftarkan();
    else {
      window.addEventListener("load", daftarkan);
      return () => window.removeEventListener("load", daftarkan);
    }
  }, []);

  return null;
}
