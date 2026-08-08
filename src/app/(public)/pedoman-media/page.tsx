import type { Metadata } from "next";
import Link from "next/link";
import { absoluteUrl } from "@/lib/utils";

const url = absoluteUrl("/pedoman-media");
const description = "Pedoman pemberitaan media siber yang dianut LinkProMedia.id, termasuk kebijakan penggunaan AI dalam proses redaksi.";

export const metadata: Metadata = {
  title: "Pedoman Media Siber",
  description,
  openGraph: { title: "Pedoman Media Siber | LinkProMedia", description, url, type: "website" },
  alternates: { canonical: url },
};

export default function PedomanMediaPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link href="/" className="hover:text-primary-600">Beranda</Link>
        <span>/</span>
        <span className="text-gray-400">Pedoman Media Siber</span>
      </nav>

      <h1 className="text-3xl font-black text-heading mb-2">Pedoman Media Siber</h1>
      <p className="text-gray-500 mb-8">
        LinkProMedia.id berpedoman pada Pedoman Pemberitaan Media Siber yang ditetapkan Dewan Pers,
        dengan penerapan sebagai berikut.
      </p>

      <div className="prose prose-sm sm:prose-base max-w-none text-gray-700 space-y-6">
        <section>
          <h2 className="text-lg font-bold text-heading mb-2">1. Verifikasi &amp; Keberimbangan</h2>
          <p>
            Setiap artikel melewati peninjauan editor sebelum terbit. Berita yang memuat dugaan atau
            klaim sepihak (misalnya dari siaran pers) wajib diberi atribusi yang jelas dan tidak
            ditulis seolah fakta yang sudah terverifikasi.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-heading mb-2">2. Penggunaan Kecerdasan Buatan (AI)</h2>
          <p>Kami memakai AI sebagai alat bantu redaksi, dengan batasan tegas:</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>AI tidak pernah menerbitkan artikel secara otomatis — semua hasil AI berstatus draf yang wajib ditinjau dan disunting wartawan/editor.</li>
            <li>Draf artikel berbantuan AI hanya boleh disusun dari bahan yang disediakan redaksi (siaran pers, catatan liputan, data, atau dokumen resmi) — AI tidak diizinkan mengarang fakta dari &ldquo;pengetahuannya sendiri&rdquo;.</li>
            <li>Setiap draf AI otomatis diberi catatan pengungkapan asal-usulnya beserta daftar hal yang masih perlu diverifikasi, tersimpan permanen di riwayat internal artikel.</li>
            <li>Ringkasan otomatis (&ldquo;Inti Berita&rdquo;) dibuat dari isi artikel yang sudah terbit, dan selalu ditandai sebagai rangkuman buatan AI kepada pembaca.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-heading mb-2">3. Ralat &amp; Koreksi</h2>
          <p>
            Kekeliruan diperbaiki secepatnya setelah diketahui. Kami menyimpan riwayat revisi setiap
            artikel secara internal untuk menjaga transparansi proses penyuntingan.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-heading mb-2">4. Hak Jawab</h2>
          <p>
            Pihak yang merasa dirugikan oleh pemberitaan kami berhak mengajukan hak jawab melalui{" "}
            <a href="mailto:redaksi@linkpromedia.id" className="text-primary-600 hover:underline">
              redaksi@linkpromedia.id
            </a>
            . Kami menindaklanjuti setiap permintaan hak jawab yang disertai bukti pendukung.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-heading mb-2">5. Pemisahan Berita, Opini, dan Konten Berbayar</h2>
          <p>
            Kategori &ldquo;Opini&rdquo; memuat pandangan penulis, bukan posisi redaksi. Kami tidak
            mempublikasikan konten berbayar tanpa penandaan yang jelas sebagai materi berbayar.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-heading mb-2">Referensi</h2>
          <p>
            Pedoman ini merujuk pada Pedoman Pemberitaan Media Siber yang ditetapkan Dewan Pers
            Republik Indonesia. Lihat juga{" "}
            <Link href="/redaksi" className="text-primary-600 hover:underline">Tim Redaksi</Link>{" "}
            dan{" "}
            <Link href="/kebijakan-privasi" className="text-primary-600 hover:underline">Kebijakan Privasi</Link>{" "}
            kami.
          </p>
        </section>
      </div>
    </div>
  );
}
