import Link from "next/link";

interface Props {
  versi: { language: string; slug: string }[];
  aktif: string;
}

const NAMA: Record<string, string> = {
  id: "Indonesia",
  en: "English",
  ja: "日本語",
  ar: "العربية",
};

/**
 * Pengalih bahasa — hanya muncul bila berita ini punya versi bahasa lain
 * yang sudah terbit. Terjemahan yang masih draf tidak ikut tampil.
 */
export default function LanguageSwitcher({ versi, aktif }: Props) {
  if (versi.length < 2) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 mb-5">
      <span className="text-xs text-gray-500">Baca dalam:</span>
      {versi.map((v) =>
        v.language === aktif ? (
          <span
            key={v.language}
            aria-current="true"
            className="text-xs font-semibold bg-primary-600 text-white px-2.5 py-1 rounded-full"
          >
            {NAMA[v.language] ?? v.language}
          </span>
        ) : (
          <Link
            key={v.language}
            href={`/berita/${v.slug}`}
            hrefLang={v.language}
            className="text-xs font-medium border border-gray-200 text-gray-600 px-2.5 py-1 rounded-full hover:border-primary-300 hover:text-primary-600 transition-colors"
          >
            {NAMA[v.language] ?? v.language}
          </Link>
        )
      )}
    </div>
  );
}
