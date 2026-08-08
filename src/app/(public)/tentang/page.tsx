import type { Metadata } from "next";
import Link from "next/link";
import { absoluteUrl } from "@/lib/utils";

const url = absoluteUrl("/tentang");
const description =
  "LinkProMedia.id adalah media daring di bawah naungan Link Productive yang menyajikan berita nasional, ekonomi, teknologi, olahraga, dan hiburan secara akurat dan berimbang.";

export const metadata: Metadata = {
  title: "Tentang Kami",
  description,
  openGraph: { title: "Tentang Kami | LinkProMedia", description, url, type: "website" },
  alternates: { canonical: url },
};

export default function TentangPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link href="/" className="hover:text-primary-600">Beranda</Link>
        <span>/</span>
        <span className="text-gray-400">Tentang Kami</span>
      </nav>

      <h1 className="text-3xl font-black text-heading mb-6">Tentang LinkProMedia</h1>

      <div className="prose prose-sm sm:prose-base max-w-none text-gray-700 space-y-5">
        <p>
          <strong>LinkProMedia.id</strong> adalah media daring yang menghadirkan berita nasional,
          ekonomi &amp; bisnis, teknologi, olahraga, hiburan, dan internasional untuk pembaca di
          Indonesia. Kami beroperasi di bawah naungan <strong>Link Productive</strong>.
        </p>

        <h2 className="text-lg font-bold text-heading mt-8 mb-2">Visi</h2>
        <p>
          Menjadi rujukan berita yang cepat, akurat, dan mudah dipahami — tanpa mengorbankan
          ketelitian demi kecepatan.
        </p>

        <h2 className="text-lg font-bold text-heading mt-8 mb-2">Misi</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>Menyajikan berita yang telah diverifikasi sebelum diterbitkan.</li>
          <li>Memisahkan secara jelas antara berita, opini, dan konten berbantuan AI.</li>
          <li>Terbuka terhadap koreksi ketika terjadi kekeliruan pemberitaan.</li>
          <li>Menjaga privasi pembaca dalam setiap statistik yang kami kumpulkan.</li>
        </ul>

        <h2 className="text-lg font-bold text-heading mt-8 mb-2">Standar Pemberitaan</h2>
        <p>
          Redaksi kami menjalankan alur kerja berjenjang: setiap artikel yang ditulis wartawan wajib
          melalui peninjauan editor sebelum terbit. Fitur bantuan AI yang kami pakai (ringkasan
          otomatis, saran judul, deteksi berita penting) selalu ditandai sebagai saran yang perlu
          disetujui manusia — bukan pengganti kerja jurnalistik. Lihat detail lengkapnya di{" "}
          <Link href="/pedoman-media" className="text-primary-600 hover:underline">
            Pedoman Media Siber
          </Link>{" "}
          kami.
        </p>

        <h2 className="text-lg font-bold text-heading mt-8 mb-2">Hubungi Kami</h2>
        <p>
          Untuk pertanyaan, koreksi, atau kerja sama, silakan hubungi redaksi melalui{" "}
          <a href="mailto:redaksi@linkpromedia.id" className="text-primary-600 hover:underline">
            redaksi@linkpromedia.id
          </a>
          . Struktur redaksi selengkapnya ada di halaman{" "}
          <Link href="/redaksi" className="text-primary-600 hover:underline">
            Tim Redaksi
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
