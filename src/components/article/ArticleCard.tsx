import Link from "next/link";
import Image from "next/image";
import type { ArticleCard } from "@/types";
import { formatRelativeDate } from "@/lib/utils";
import BookmarkButton from "./BookmarkButton";

interface Props {
  article: ArticleCard;
  /**
   * Empat varian yang sengaja dibedakan perannya, bukan satu kartu yang
   * diregangkan ke semua tempat:
   * - hero        : berita utama, satu-satunya di halaman depan
   * - default     : kartu baku bergambar untuk grid
   * - horizontal  : baris daftar dengan thumbnail kecil
   * - compact     : baris teks tanpa gambar, untuk daftar padat
   */
  variant?: "hero" | "default" | "horizontal" | "compact";
  /** Nomor urut, dipakai varian compact untuk daftar berperingkat */
  urutan?: number;
}

/**
 * Penanda mendesak. Sengaja kecil dan jarang: kalau semua berita
 * ditandai, penanda ini kehilangan artinya dan pembaca berhenti melihatnya.
 */
function PenandaStatus({ breaking, live }: { breaking: boolean; live: boolean }) {
  if (!breaking && !live) return null;
  return (
    <span className="inline-flex items-center gap-1.5">
      {breaking && <span className="badge-accent">Breaking</span>}
      {live && (
        <span className="inline-flex items-center gap-1 label-rubrik text-red-600">
          {/* Titik berdenyut — satu-satunya gerak di kartu, dan berhenti
              sendiri saat pengguna memilih kurangi animasi */}
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-600" />
          </span>
          Langsung
        </span>
      )}
    </span>
  );
}

function ChipRubrik({ nama, slug }: { nama: string; slug: string }) {
  return (
    <Link href={`/kategori/${slug}`} data-rubrik={slug} className="chip-rubrik label-rubrik">
      {nama}
    </Link>
  );
}

export default function ArticleCard({ article, variant = "default", urutan }: Props) {
  const { title, slug, excerpt, thumbnailUrl, publishedAt, category, author, isBreaking, isLive } = article;

  const waktu = publishedAt ? (
    <time dateTime={new Date(publishedAt).toISOString()}>{formatRelativeDate(publishedAt)}</time>
  ) : null;

  // ── HERO — berita utama hari ini ──────────────────────────────
  if (variant === "hero") {
    return (
      <article className="group relative overflow-hidden rounded-xl bg-primary-800 text-white h-full min-h-[22rem] md:min-h-[26rem]">
        {thumbnailUrl ? (
          <Image
            src={thumbnailUrl}
            alt=""
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            sizes="(max-width: 1024px) 100vw, 66vw"
            priority
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary-700 to-primary-800" />
        )}
        {/* Gradien pekat di bawah supaya judul tetap terbaca di atas gambar
            apa pun — bukan sekadar penggelap merata yang membuat foto kusam */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/5" />

        <div className="absolute inset-x-0 bottom-0 p-5 sm:p-7">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <PenandaStatus breaking={isBreaking} live={isLive} />
            <Link
              href={`/kategori/${category.slug}`}
              className="label-rubrik text-white/90 hover:text-white transition-colors"
            >
              {category.name}
            </Link>
          </div>

          <h2 className="judul-hero text-white">
            <Link href={`/berita/${slug}`} className="hover:underline decoration-2 underline-offset-4">
              {title}
            </Link>
          </h2>

          {excerpt && (
            <p className="deck text-gray-200 mt-3 line-clamp-2 max-w-2xl hidden sm:block">{excerpt}</p>
          )}

          <div className="meta text-gray-300 mt-3 flex items-center gap-2">
            <span>{author.name}</span>
            <span aria-hidden="true">·</span>
            {waktu}
          </div>
        </div>
      </article>
    );
  }

  // ── HORIZONTAL — baris daftar dengan thumbnail ────────────────
  if (variant === "horizontal") {
    return (
      <article className="group flex gap-3.5 items-start">
        <div className="relative w-[5.5rem] aspect-[4/3] flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
          {thumbnailUrl ? (
            <Image
              src={thumbnailUrl}
              alt=""
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="88px"
            />
          ) : (
            <div
              data-rubrik={category.slug}
              className="absolute inset-0 flex items-center justify-center"
              style={{ background: "color-mix(in srgb, var(--warna-rubrik) 14%, transparent)" }}
            >
              <span className="label-rubrik px-1 text-center leading-tight" style={{ color: "var(--warna-rubrik)" }}>
                {category.name}
              </span>
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 mb-1">
            <PenandaStatus breaking={isBreaking} live={isLive} />
            <Link
              href={`/kategori/${category.slug}`}
              data-rubrik={category.slug}
              className="label-rubrik hover:underline"
              style={{ color: "var(--warna-rubrik)" }}
            >
              {category.name}
            </Link>
          </div>
          <h3 className="judul-kompak text-heading line-clamp-3 group-hover:text-primary-600 transition-colors">
            <Link href={`/berita/${slug}`}>{title}</Link>
          </h3>
          <div className="meta mt-1.5">{waktu}</div>
        </div>
      </article>
    );
  }

  // ── COMPACT — baris teks padat, tanpa gambar ──────────────────
  if (variant === "compact") {
    return (
      <article className="group flex gap-3 items-baseline py-3">
        {urutan !== undefined && (
          <span
            data-rubrik={category.slug}
            className="judul-kartu tabular-nums flex-shrink-0 w-6 text-right opacity-60"
            style={{ color: "var(--warna-rubrik)" }}
            aria-hidden="true"
          >
            {urutan}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="judul-kompak text-heading line-clamp-2 group-hover:text-primary-600 transition-colors">
            <Link href={`/berita/${slug}`}>{title}</Link>
          </h3>
          <div className="meta mt-1 flex flex-wrap items-center gap-1.5">
            <PenandaStatus breaking={isBreaking} live={isLive} />
            <Link
              href={`/kategori/${category.slug}`}
              data-rubrik={category.slug}
              className="label-rubrik hover:underline"
              style={{ color: "var(--warna-rubrik)" }}
            >
              {category.name}
            </Link>
            <span aria-hidden="true">·</span>
            {waktu}
          </div>
        </div>
      </article>
    );
  }

  // ── DEFAULT — kartu baku bergambar ────────────────────────────
  return (
    <article className="group flex flex-col rounded-xl overflow-hidden border border-divider bg-white hover:shadow-lg hover:-translate-y-0.5 transition-all">
      <div className="relative aspect-[16/10] overflow-hidden bg-gray-100">
        {thumbnailUrl ? (
          <Image
            src={thumbnailUrl}
            alt=""
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div
            data-rubrik={category.slug}
            className="absolute inset-0 flex items-center justify-center"
            style={{ background: "color-mix(in srgb, var(--warna-rubrik) 12%, transparent)" }}
          >
            <span className="label-rubrik" style={{ color: "var(--warna-rubrik)" }}>
              {category.name}
            </span>
          </div>
        )}
        <div className="absolute top-2 right-2 bg-white/90 rounded-full backdrop-blur-sm">
          <BookmarkButton slug={slug} />
        </div>
      </div>

      <div className="p-4 flex flex-col flex-1">
        <div className="flex flex-wrap items-center gap-1.5 mb-2">
          <PenandaStatus breaking={isBreaking} live={isLive} />
          <ChipRubrik nama={category.name} slug={category.slug} />
        </div>

        <h3 className="judul-kartu text-heading line-clamp-3 group-hover:text-primary-600 transition-colors">
          <Link href={`/berita/${slug}`}>{title}</Link>
        </h3>

        {excerpt && <p className="deck mt-2 line-clamp-2">{excerpt}</p>}

        <div className="meta mt-auto pt-3 flex items-center gap-2">
          <span className="truncate">{author.name}</span>
          <span aria-hidden="true">·</span>
          {waktu}
        </div>
      </div>
    </article>
  );
}
