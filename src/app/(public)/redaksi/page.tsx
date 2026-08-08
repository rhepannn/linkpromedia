import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { absoluteUrl } from "@/lib/utils";

const url = absoluteUrl("/redaksi");
const description = "Struktur redaksi, penanggung jawab, dan cara menghubungi tim LinkProMedia.id.";

export const metadata: Metadata = {
  title: "Tim Redaksi",
  description,
  openGraph: { title: "Tim Redaksi | LinkProMedia", description, url, type: "website" },
  alternates: { canonical: url },
};

const LABEL_PERAN: Record<string, string> = {
  ADMIN: "Penanggung Jawab",
  EDITOR: "Editor",
  AUTHOR: "Wartawan",
};

const URUTAN_PERAN = ["ADMIN", "EDITOR", "AUTHOR"];

export default async function RedaksiPage() {
  const users = await prisma.user.findMany({
    select: { name: true, role: true, slug: true, isVerified: true },
    orderBy: { createdAt: "asc" },
  });

  const terurut = [...users].sort(
    (a, b) => URUTAN_PERAN.indexOf(a.role) - URUTAN_PERAN.indexOf(b.role)
  );

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link href="/" className="hover:text-primary-600">Beranda</Link>
        <span>/</span>
        <span className="text-gray-400">Tim Redaksi</span>
      </nav>

      <h1 className="text-3xl font-black text-heading mb-2">Tim Redaksi</h1>
      <p className="text-gray-500 mb-8">
        LinkProMedia.id diterbitkan oleh Link Productive dengan susunan redaksi berikut.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
        {terurut.map((u) => {
          const isi = (
            <>
              <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold flex-shrink-0">
                {u.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-heading text-sm flex items-center gap-1">
                  {u.name}
                  {u.isVerified && (
                    <svg className="w-3.5 h-3.5 text-primary-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-label="Jurnalis terverifikasi">
                      <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  )}
                </p>
                <p className="text-xs text-gray-500">{LABEL_PERAN[u.role] ?? u.role}</p>
              </div>
            </>
          );
          return u.slug ? (
            <Link
              key={u.name}
              href={`/penulis/${u.slug}`}
              className="border border-gray-100 rounded-xl p-4 flex items-center gap-3 hover:border-primary-200 hover:shadow-sm transition-all"
            >
              {isi}
            </Link>
          ) : (
            <div key={u.name} className="border border-gray-100 rounded-xl p-4 flex items-center gap-3">
              {isi}
            </div>
          );
        })}
      </div>

      <div className="prose prose-sm max-w-none text-gray-700 space-y-5 border-t border-gray-100 pt-8">
        <h2 className="text-lg font-bold text-heading mb-2">Alur Redaksi</h2>
        <p>
          Wartawan (AUTHOR) menulis dan mengajukan artikel untuk ditinjau. Editor meninjau,
          menyetujui, atau mengembalikan artikel disertai catatan perbaikan. Penanggung jawab
          bertanggung jawab penuh atas seluruh konten yang diterbitkan.
        </p>

        <h2 className="text-lg font-bold text-heading mt-8 mb-2">Kontak Redaksi</h2>
        <p>
          Email:{" "}
          <a href="mailto:redaksi@linkpromedia.id" className="text-primary-600 hover:underline">
            redaksi@linkpromedia.id
          </a>
        </p>

        <h2 className="text-lg font-bold text-heading mt-8 mb-2">Kebijakan Koreksi</h2>
        <p>
          Kami segera memperbaiki kekeliruan faktual begitu diketahui. Laporkan kesalahan pada
          artikel apa pun melalui email redaksi di atas dengan menyertakan tautan artikelnya —
          setiap koreksi dicatat dalam riwayat revisi internal kami.
        </p>
      </div>
    </div>
  );
}
