import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import ThemeScript from "@/components/layout/ThemeScript";
import ServiceWorkerRegistrar from "@/components/layout/ServiceWorkerRegistrar";
import { siteBaseUrl } from "@/lib/utils";
import { cssTemaKustom } from "@/lib/siteSettings";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "LinkProMedia — Berita Terkini & Terpercaya",
    template: "%s | LinkProMedia",
  },
  description:
    "LinkProMedia adalah media berita nasional terpercaya yang menyajikan berita terkini seputar nasional, ekonomi, teknologi, olahraga, dan hiburan.",
  // siteBaseUrl() menormalkan env var yang diisi tanpa "https://" — nilai
  // mentah di sini pernah menggagalkan build di Vercel (ERR_INVALID_URL)
  metadataBase: new URL(siteBaseUrl()),
  openGraph: {
    type: "website",
    siteName: "LinkProMedia",
    locale: "id_ID",
  },
  twitter: {
    card: "summary_large_image",
    site: "@linkpromedia",
  },
  robots: {
    index: true,
    follow: true,
  },
  // Agar situs bisa dipasang di layar utama ponsel (PWA)
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "LinkProMedia",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#0C447C",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Tema kustom dari halaman Pengaturan — null (termasuk saat DB gagal)
  // berarti warna bawaan; kegagalan DB tidak pernah menjatuhkan layout ini
  const temaKustom = await cssTemaKustom();

  return (
    <html lang="id" className={`${geistSans.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <ThemeScript />
        {temaKustom && <style id="tema-kustom">{temaKustom}</style>}
      </head>
      <body className="min-h-full flex flex-col bg-surface">
        <ServiceWorkerRegistrar />
        {children}
      </body>
    </html>
  );
}
