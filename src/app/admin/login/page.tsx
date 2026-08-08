import type { Metadata } from "next";
import Image from "next/image";
import LoginForm from "./LoginForm";

export const metadata: Metadata = {
  title: "Login Redaksi — LinkProMedia",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Halaman ini punya ruang vertikal, jadi dipakai logo utuh —
            lengkap dengan wordmark dan tagline, bukan versi mendatar */}
        <div className="text-center mb-8">
          <Image
            src="/logo.png"
            alt="LinkProMedia"
            width={900}
            height={807}
            priority
            // Tanpa ini Next.js menyiapkan varian selebar 1080px padahal
            // hanya ditampilkan 176px — sia-sia bandwidth pengunjung
            sizes="176px"
            className="w-44 h-auto mx-auto mb-3"
          />
          <p className="text-sm text-gray-500">Portal Redaksi &amp; Admin</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <h1 className="text-xl font-bold text-gray-900 mb-6">Masuk ke Dashboard</h1>
          <LoginForm />
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          &copy; {new Date().getFullYear()} LinkProMedia.id — Link Productive
        </p>
      </div>
    </div>
  );
}
