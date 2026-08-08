import Link from "next/link";
import type { Category } from "@/types";
import NewsletterForm from "./NewsletterForm";
import PushToggle from "./PushToggle";
import Logo from "./Logo";

interface Props {
  categories: Category[];
}

export default function Footer({ categories }: Props) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-primary-800 text-gray-300 mt-auto">
      <div className="h-1 bg-accent" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-3">
              <Logo tinggi={30} kelasTeks="text-xl" gelap />
            </Link>
            <p className="text-sm text-gray-400 leading-relaxed">
              Media berita terkini dan terpercaya di bawah naungan{" "}
              <span className="text-white font-medium">Link Productive</span>.
            </p>
          </div>

          {/* Kategori */}
          <div>
            <h3 className="text-white font-semibold text-sm mb-4 uppercase tracking-wide">Kategori</h3>
            <ul className="space-y-2">
              {categories.slice(0, 4).map((cat) => (
                <li key={cat.id}>
                  <Link
                    href={`/kategori/${cat.slug}`}
                    className="text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    {cat.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold text-sm mb-4 uppercase tracking-wide">&nbsp;</h3>
            <ul className="space-y-2 mt-0">
              {categories.slice(4).map((cat) => (
                <li key={cat.id}>
                  <Link
                    href={`/kategori/${cat.slug}`}
                    className="text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    {cat.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Tentang */}
          <div>
            <h3 className="text-white font-semibold text-sm mb-4 uppercase tracking-wide">Tentang</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/tentang" className="text-sm text-gray-400 hover:text-white transition-colors">
                  Tentang Kami
                </Link>
              </li>
              <li>
                <Link href="/redaksi" className="text-sm text-gray-400 hover:text-white transition-colors">
                  Tim Redaksi
                </Link>
              </li>
              <li>
                <Link href="/kebijakan-privasi" className="text-sm text-gray-400 hover:text-white transition-colors">
                  Kebijakan Privasi
                </Link>
              </li>
              <li>
                <Link href="/pedoman-media" className="text-sm text-gray-400 hover:text-white transition-colors">
                  Pedoman Media Siber
                </Link>
              </li>
              <li>
                <Link href="/kronologi" className="text-sm text-gray-400 hover:text-white transition-colors">
                  Kronologi
                </Link>
              </li>
              <li>
                <a
                  href="/rss.xml"
                  className="text-sm text-gray-400 hover:text-white transition-colors inline-flex items-center gap-1.5"
                >
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6.503 20.752A3.25 3.25 0 1 1 3.252 17.5a3.25 3.25 0 0 1 3.251 3.252zM3.252 8.75v4.002a11.25 11.25 0 0 1 11.246 11.246h4.002c0-8.42-6.828-15.248-15.248-15.248zm0-6.75v4.002C13.16 6.002 21.998 14.84 21.998 24.75H26C26 12.212 15.788 2 3.252 2z" />
                  </svg>
                  RSS Feed
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Newsletter & notifikasi */}
        <div className="mt-10 pt-8 border-t border-primary-700 max-w-md">
          <NewsletterForm />
          <div className="mt-5">
            <p className="text-sm font-semibold text-white mb-1">Breaking News</p>
            <p className="text-xs text-gray-400 mb-2.5">
              Dapatkan pemberitahuan langsung saat ada berita penting.
            </p>
            <PushToggle />
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-primary-700 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          {/* gray-500 hanya mencapai 3,4:1 di atas navy footer — di bawah
              ambang AA untuk teks 12px. gray-400 mencapai 4,8:1. */}
          <p className="text-xs text-gray-400">
            &copy; {currentYear} LinkProMedia.id — Bagian dari Link Productive. Hak cipta dilindungi.
          </p>
          {/* gray-500 hanya mencapai 3,4:1 di atas navy footer — di bawah
              ambang AA untuk teks 12px. gray-400 mencapai 4,8:1. */}
          <p className="text-xs text-gray-400">
            Dibangun dengan Next.js &amp; Tailwind CSS
          </p>
        </div>
      </div>
    </footer>
  );
}
