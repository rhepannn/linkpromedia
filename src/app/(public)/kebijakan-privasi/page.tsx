import type { Metadata } from "next";
import Link from "next/link";
import { absoluteUrl } from "@/lib/utils";

const url = absoluteUrl("/kebijakan-privasi");
const description = "Bagaimana LinkProMedia.id mengumpulkan dan melindungi data pembaca.";

export const metadata: Metadata = {
  title: "Kebijakan Privasi",
  description,
  openGraph: { title: "Kebijakan Privasi | LinkProMedia", description, url, type: "website" },
  alternates: { canonical: url },
};

export default function KebijakanPrivasiPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link href="/" className="hover:text-primary-600">Beranda</Link>
        <span>/</span>
        <span className="text-gray-400">Kebijakan Privasi</span>
      </nav>

      <h1 className="text-3xl font-black text-heading mb-2">Kebijakan Privasi</h1>
      <p className="text-gray-500 mb-8">Berlaku untuk seluruh halaman di linkpromedia.id.</p>

      <div className="prose prose-sm sm:prose-base max-w-none text-gray-700 space-y-6">
        <section>
          <h2 className="text-lg font-bold text-heading mb-2">Statistik Kunjungan</h2>
          <p>
            Kami mencatat kunjungan halaman untuk memahami artikel mana yang paling banyak dibaca.
            Pencatatan ini dirancang agar tidak bisa dipakai melacak pembaca secara pribadi:
          </p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>
              <strong>Alamat IP tidak pernah disimpan.</strong> IP hanya dipakai sesaat untuk
              dijadikan sidik anonim (hash satu arah) bersama tanggal saat itu — sidik ini otomatis
              berganti setiap hari sehingga kunjungan hari ini tidak bisa dihubungkan dengan
              kunjungan besok.
            </li>
            <li>Kami mencatat halaman yang dibuka, lama membaca, dan sumber kunjungan (mis. dari pencarian atau media sosial).</li>
            <li>Data ini dipakai secara agregat untuk laporan internal redaksi, bukan untuk profil individu pembaca.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-heading mb-2">Data yang Tersimpan di Perangkatmu</h2>
          <p>
            Fitur bookmark (&ldquo;Artikel Tersimpan&rdquo;) dan riwayat baca disimpan langsung di perangkatmu
            (localStorage browser) — <strong>bukan di server kami</strong>. Data ini tidak pernah
            terkirim ke kami dan otomatis hilang kalau kamu menghapus data situs di browser.
            Personalisasi rekomendasi &ldquo;Untuk Kamu&rdquo; juga dihitung dari riwayat ini tanpa memerlukan
            akun.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-heading mb-2">Newsletter</h2>
          <p>
            Kalau kamu mendaftar newsletter, kami menyimpan alamat emailmu untuk mengirim kabar
            terbaru. Kamu bisa berhenti berlangganan kapan saja lewat tautan di setiap email yang
            kami kirim — prosesnya langsung dan tidak memerlukan konfirmasi tambahan.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-heading mb-2">Pihak Ketiga</h2>
          <p>
            Kami tidak memasang skrip pelacak iklan atau analitik pihak ketiga. Gambar diunggah dan
            disajikan lewat penyedia penyimpanan cloud kami; tautan berbagi ke WhatsApp, X, dan
            Facebook mengikuti kebijakan privasi masing-masing platform saat kamu memakainya.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-heading mb-2">Perubahan Kebijakan</h2>
          <p>
            Kami bisa memperbarui halaman ini seiring bertambahnya fitur. Perubahan berlaku sejak
            dipublikasikan di halaman ini.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-heading mb-2">Pertanyaan</h2>
          <p>
            Hubungi{" "}
            <a href="mailto:redaksi@linkpromedia.id" className="text-primary-600 hover:underline">
              redaksi@linkpromedia.id
            </a>{" "}
            untuk pertanyaan seputar privasi atau permintaan penghapusan data langganan.
          </p>
        </section>
      </div>
    </div>
  );
}
