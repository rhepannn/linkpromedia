import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import ArticleCard from "@/components/article/ArticleCard";
import { getAuthorBySlug, getPublishedArticlesByAuthor } from "@/lib/articles";
import { absoluteUrl } from "@/lib/utils";

interface Props {
  params: Promise<{ slug: string }>;
}

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Admin Redaksi",
  EDITOR: "Editor",
  AUTHOR: "Penulis",
};

export const revalidate = 300;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const author = await getAuthorBySlug(slug);
  if (!author) return { title: "Penulis Tidak Ditemukan" };

  const description = author.bio?.trim() || `Profil dan artikel karya ${author.name} di LinkProMedia.id.`;
  const url = absoluteUrl(`/penulis/${slug}`);

  return {
    title: `${author.name} — LinkProMedia.id`,
    description,
    openGraph: { title: author.name, description, url, type: "profile" },
    alternates: { canonical: url },
  };
}

export default async function AuthorProfilePage({ params }: Props) {
  const { slug } = await params;
  const author = await getAuthorBySlug(slug);
  if (!author) notFound();

  const articles = await getPublishedArticlesByAuthor(author.id, 24);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      {/* Header profil */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 pb-8 border-b border-gray-100">
        <div className="relative w-20 h-20 rounded-full overflow-hidden bg-primary-100 flex-shrink-0 flex items-center justify-center">
          {author.image ? (
            <Image src={author.image} alt={author.name} fill className="object-cover" sizes="80px" />
          ) : (
            <span className="text-2xl font-bold text-primary-600">{author.name[0]?.toUpperCase()}</span>
          )}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-heading">{author.name}</h1>
            {author.isVerified && (
              <span
                title="Jurnalis terverifikasi"
                aria-label="Jurnalis terverifikasi"
                className="inline-flex"
              >
                <svg className="w-5 h-5 text-primary-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </span>
            )}
          </div>
          <p className="text-sm text-primary-600 font-medium mt-0.5">{ROLE_LABEL[author.role] ?? "Penulis"}</p>
          {author.bio && <p className="text-sm text-text-muted mt-2 max-w-2xl">{author.bio}</p>}
        </div>
      </div>

      {/* Daftar artikel */}
      <div className="mt-8">
        <h2 className="text-base font-bold text-heading mb-4">
          Artikel oleh {author.name} <span className="text-text-muted font-normal">({articles.length})</span>
        </h2>
        {articles.length === 0 ? (
          <p className="text-sm text-text-muted py-8 text-center">Belum ada artikel yang terbit.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {articles.map((a) => (
              <ArticleCard key={a.id} article={a} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
