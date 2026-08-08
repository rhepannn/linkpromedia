import Link from "next/link";

interface Props {
  children: React.ReactNode;
  /** Slug rubrik — mewarnai garis penanda sesuai identitas kategori */
  rubrik?: string;
  /** Keterangan kecil di samping judul, mis. "· favorit kamu" */
  keterangan?: string;
  /** Kalau diisi, muncul tautan "Lihat semua" di ujung kanan */
  href?: string;
}

/**
 * Judul seksi halaman depan.
 *
 * Sebelumnya ada tiga gaya berbeda yang bercampur — ada yang pakai ikon,
 * ada yang pakai garis tebal, ada yang pakai keduanya. Akibatnya setiap
 * seksi berteriak sama kencang dan tidak ada yang terbaca lebih penting.
 * Di sini semuanya diseragamkan jadi satu bentuk tenang: garis tipis
 * berwarna rubrik + judul. Perbedaan penting antar seksi dibawa oleh
 * isinya, bukan oleh hiasan judulnya.
 */
export default function JudulSeksi({ children, rubrik, keterangan, href }: Props) {
  return (
    <div className="flex items-center justify-between gap-4 mb-5">
      <h2 data-rubrik={rubrik} className="garis-rubrik judul-besar text-heading flex items-baseline gap-2">
        {children}
        {keterangan && <span className="meta font-normal">{keterangan}</span>}
      </h2>
      {href && (
        <Link
          href={href}
          className="meta flex-shrink-0 text-primary-600 hover:text-primary-700 hover:underline whitespace-nowrap"
        >
          Lihat semua →
        </Link>
      )}
    </div>
  );
}
