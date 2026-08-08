import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import ThemeScript from "@/components/layout/ThemeScript";
import ServiceWorkerRegistrar from "@/components/layout/ServiceWorkerRegistrar";

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
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "https://linkpromedia.id"
  ),
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

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" className={`${geistSans.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-full flex flex-col bg-surface">
        <ServiceWorkerRegistrar />
        {children}
      </body>
    </html>
  );
}
