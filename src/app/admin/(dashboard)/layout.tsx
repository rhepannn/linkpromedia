import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminTopbar from "@/components/admin/AdminTopbar";
import { promoteScheduledArticles } from "@/lib/articles";
import { getSessionActor } from "@/lib/sessionRole";

export const metadata: Metadata = {
  title: {
    default: "Dashboard Admin — LinkProMedia",
    template: "%s | Admin LinkProMedia",
  },
  robots: { index: false, follow: false },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/admin/login");

  // Peran dibaca dari database supaya perubahan izin langsung berlaku
  const actor = await getSessionActor();
  if (!actor) redirect("/admin/login");

  await promoteScheduledArticles();

  return (
    <div className="min-h-screen bg-surface flex">
      {/* Sidebar */}
      <AdminSidebar role={actor.role} />

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        <AdminTopbar user={session.user} />
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
