import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import AiChatPanel from "@/components/admin/AiChatPanel";

export const metadata: Metadata = {
  title: "ChatBot — LinkProMedia",
  robots: { index: false, follow: false },
};

/**
 * Halaman ChatBot — sengaja diletakkan DI LUAR grup (dashboard) supaya tidak
 * ikut memuat sidebar dan topbar admin. Layarnya penuh tanpa apa pun yang
 * mengganggu, seperti halaman login yang juga berdiri sendiri.
 *
 * Karena di luar layout admin, pemeriksaan sesi tidak lagi diwarisi dari
 * layout — jadi dilakukan sendiri di sini. Middleware sudah menjaga /admin/*,
 * ini lapis kedua supaya halaman tidak pernah tampil tanpa sesi yang sah.
 */
export default async function ChatBotPage() {
  const session = await auth();
  if (!session) redirect("/admin/login?callbackUrl=%2Fadmin%2Fchatbot");

  return (
    <div className="h-screen overflow-hidden bg-white">
      <AiChatPanel tampilan="halaman" hrefKembali="/admin" />
    </div>
  );
}
