import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Berhenti Berlangganan",
  robots: { index: false, follow: false },
};

interface Props {
  searchParams: Promise<{ key?: string }>;
}

export default async function UnsubscribePage({ searchParams }: Props) {
  const { key } = await searchParams;

  let status: "berhasil" | "tidak-ditemukan" | "tanpa-kunci" = "tanpa-kunci";

  if (key) {
    const subscriber = await prisma.newsletterSubscriber.findUnique({
      where: { unsubscribeKey: key },
    });

    if (subscriber) {
      if (subscriber.isActive) {
        await prisma.newsletterSubscriber.update({
          where: { unsubscribeKey: key },
          data: { isActive: false, unsubscribedAt: new Date() },
        });
      }
      status = "berhasil";
    } else {
      status = "tidak-ditemukan";
    }
  }

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-20 text-center">
      {status === "berhasil" ? (
        <>
          <div className="text-5xl mb-4">👋</div>
          <h1 className="text-2xl font-bold text-heading mb-2">Langganan Dihentikan</h1>
          <p className="text-gray-500">
            Kamu tidak akan menerima email newsletter dari kami lagi. Kamu bisa berlangganan lagi
            kapan saja lewat formulir di bagian bawah halaman.
          </p>
        </>
      ) : (
        <>
          <div className="text-5xl mb-4">🔗</div>
          <h1 className="text-2xl font-bold text-heading mb-2">Tautan Tidak Berlaku</h1>
          <p className="text-gray-500">
            Tautan berhenti berlangganan ini tidak dikenali. Coba pakai tautan terbaru dari email
            yang kami kirim.
          </p>
        </>
      )}
      <Link
        href="/"
        className="inline-block mt-6 bg-primary-600 text-white px-6 py-2.5 rounded-full text-sm font-medium hover:bg-primary-700 transition-colors"
      >
        Kembali ke Beranda
      </Link>
    </div>
  );
}
