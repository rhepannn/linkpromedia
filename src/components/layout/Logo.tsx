import Image from "next/image";

/** Rasio berkas public/logo-mark.png (560 x 485) */
const RASIO_MARK = 560 / 485;

interface Props {
  /**
   * Logo aslinya bertumpuk (monogram di atas, wordmark di bawah) sehingga
   * tidak terbaca di bilah navigasi yang pendek. Jadi di navigasi dipakai
   * susunan mendatar: monogram + wordmark berupa teks.
   */
  tinggi?: number;
  /** Ukuran teks wordmark, mengikuti kelas Tailwind pemanggilnya */
  kelasTeks?: string;
  /**
   * Di latar gelap kata "Media" dibuat putih. Monogramnya sendiri biru-hijau,
   * jadi tetap terbaca tanpa perlu versi terang/gelap yang berbeda.
   */
  gelap?: boolean;
  /** Logo di header adalah LCP, jadi perlu dimuat lebih dulu */
  priority?: boolean;
}

export default function Logo({ tinggi = 36, kelasTeks = "text-2xl", gelap = false, priority = false }: Props) {
  const lebar = Math.round(tinggi * RASIO_MARK);

  return (
    <>
      {/* alt kosong: ini dekoratif — nama merek sudah disebut teks di sebelahnya,
          jadi pembaca layar tidak perlu mendengarnya dua kali */}
      <Image
        src="/logo-mark.png"
        alt=""
        width={lebar}
        height={tinggi}
        priority={priority}
        className="flex-shrink-0 w-auto"
        style={{ height: tinggi }}
      />
      {/* Biru gelap di atas latar navy nyaris tak terbaca (rasio kontras 2,5).
          primary-300 mencapai 5,6 — lolos WCAG AA untuk semua ukuran teks. */}
      <span className={`${kelasTeks} font-black tracking-tight ${gelap ? "text-primary-300" : "text-primary-600"}`}>
        LinkPro
      </span>
      <span className={`${kelasTeks} font-black tracking-tight ${gelap ? "text-white" : "text-gray-900"}`}>
        Media
      </span>
    </>
  );
}
