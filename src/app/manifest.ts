import type { MetadataRoute } from "next";

/**
 * Manifest PWA — membuat situs bisa "dipasang" di layar utama ponsel
 * dan menjadi syarat agar Service Worker & Push Notification bekerja.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "LinkProMedia — Berita Terkini & Terpercaya",
    short_name: "LinkProMedia",
    description:
      "Media berita nasional terpercaya: berita terkini seputar nasional, ekonomi, teknologi, olahraga, dan hiburan.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0C447C",
    orientation: "portrait",
    lang: "id",
    categories: ["news", "magazines"],
    // Ikon diambil dari public/ dan bukan dari src/app/, karena berkas di
    // src/app/ disajikan Next.js dengan hash yang bisa berubah tiap build —
    // manifest butuh jalur yang tetap. Favicon & apple-touch-icon sendiri
    // tetap ditangani otomatis lewat src/app/icon.png & apple-icon.png.
    icons: [
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      // maskable: berkas terpisah dengan latar penuh dan ruang aman di tepi,
      // supaya logo tidak terpotong saat Android memotongnya jadi bulat
      { src: "/icon-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
