import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { formatDateTime, absoluteUrl } from "@/lib/utils";

interface Props {
  params: Promise<{ slug: string }>;
}

/** Halaman kronologi disajikan dari cache, disegarkan tiap 2 menit */
export const revalidate = 120;

/**
 * Batas aman satu kronologi. Kronologi memang dimaksudkan tampil utuh, jadi
 * tidak dipaginasi — tapi tetap harus dibatasi supaya topik yang diliput
 * bertahun-tahun tidak menarik ribuan artikel sekaligus.
 */
const MAKS_KRONOLOGI = 200;

/** Ambil topik beserta artikelnya, urut dari yang paling awal terjadi */
async function getTimeline(slug: string) {
  const tag = await prisma.tag.findUnique({
    where: { slug },
    select: { id: true, name: true, slug: true },
  });
  if (!tag) return null;

  const where = {
    tags: { some: { tagId: tag.id } },
    OR: [
      { status: "PUBLISHED" as const },
      { status: "SCHEDULED" as const, publishedAt: { lte: new Date() } },
    ],
  };

  const [artikel, total] = await Promise.all([
    prisma.article.findMany({
      where,
      orderBy: { publishedAt: "asc" },
      take: MAKS_KRONOLOGI,
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        thumbnailUrl: true,
        publishedAt: true,
        category: { select: { name: true, slug: true } },
      },
    }),
    prisma.article.count({ where }),
  ]);

  return { tag, artikel, total, terpotong: total > artikel.length };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const data = await getTimeline(slug);
  if (!data) return { title: "Topik Tidak Ditemukan" };

  const judul = `Kronologi: ${data.tag.name}`;
  const deskripsi = `Ikuti perkembangan ${data.tag.name} dari waktu ke waktu — ${data.total} berita tersusun kronologis.`;

  return {
    title: judul,
    description: deskripsi,
    openGraph: { title: judul, description: deskripsi, url: absoluteUrl(`/topik/${slug}`), type: "website" },
    alternates: { canonical: absoluteUrl(`/topik/${slug}`) },
  };
}

/**
 * News Timeline — menyusun seluruh berita bertopik sama secara kronologis,
 * supaya pembaca cepat memahami perkembangan sebuah peristiwa dari awal.
 */
export default async function TimelinePage({ params }: Props) {
  const { slug } = await params;
  const data = await getTimeline(slug);

  if (!data || data.artikel.length === 0) notFound();

  const { tag, artikel, total, terpotong } = data;
  const awal = artikel[0]?.publishedAt;
  const akhir = artikel[artikel.length - 1]?.publishedAt;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Link href="/" className="hover:text-primary-600">Beranda</Link>
        <span>/</span>
        <span className="text-gray-400">Kronologi</span>
      </nav>

      <header className="mb-8 pb-6 border-b border-gray-100">
        <p className="text-xs font-semibold text-primary-600 uppercase tracking-wide mb-1">Kronologi Peristiwa</p>
        <h1 className="text-2xl sm:text-3xl font-bold text-heading capitalize">{tag.name}</h1>
        <p className="text-sm text-gray-500 mt-2">
          {total} berita
          {awal && akhir && (
            <> · dari {formatDateTime(awal)} sampai {formatDateTime(akhir)}</>
          )}
        </p>
        {terpotong && (
          <p className="text-xs text-gray-400 mt-2">
            Menampilkan {artikel.length} berita paling awal dari total {total}.
          </p>
        )}
      </header>

      <ol className="relative border-l-2 border-primary-100 ml-3">
        {artikel.map((a, i) => (
          <li key={a.id} className="relative pl-6 pb-8 last:pb-0">
            {/* Titik penanda di garis waktu */}
            <span
              className="absolute -left-[9px] top-1.5 w-4 h-4 rounded-full bg-primary-600 border-4 border-white"
              aria-hidden="true"
            />

            <time className="text-xs font-medium text-primary-600" dateTime={a.publishedAt?.toString()}>
              {formatDateTime(a.publishedAt)}
            </time>

            <div className="mt-1.5 flex gap-3">
              {a.thumbnailUrl && (
                <div className="relative w-20 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                  <Image src={a.thumbnailUrl} alt="" fill className="object-cover" sizes="80px" />
                </div>
              )}
              <div className="min-w-0">
                <h2 className="font-semibold text-heading leading-snug hover:text-primary-600 transition-colors">
                  <Link href={`/berita/${a.slug}`}>{a.title}</Link>
                </h2>
                {a.excerpt && <p className="text-sm text-gray-500 mt-1 line-clamp-2">{a.excerpt}</p>}
                <Link
                  href={`/kategori/${a.category.slug}`}
                  className="inline-block text-xs text-primary-600 mt-1.5 hover:underline"
                >
                  {a.category.name}
                </Link>
              </div>
            </div>

            {i === 0 && artikel.length > 1 && (
              <span className="absolute -left-[38px] top-1 text-xs text-gray-400 hidden sm:block">Awal</span>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
