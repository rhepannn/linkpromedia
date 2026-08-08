import type { Metadata } from "next";
import { redirect } from "next/navigation";
import PenulisClient from "./PenulisClient";
import { prisma } from "@/lib/prisma";
import { getSessionActor } from "@/lib/sessionRole";
import { canManageUsers } from "@/lib/permissions";

export const metadata: Metadata = { title: "Kelola Penulis" };

export default async function AdminPenulisPage() {
  const actor = await getSessionActor();
  if (!actor) redirect("/admin/login");
  // Hanya admin yang boleh mengelola akun redaksi
  if (!canManageUsers(actor.role)) redirect("/admin");

  const penulis = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, email: true, role: true, createdAt: true, slug: true, bio: true, isVerified: true },
  });

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold text-heading">Penulis</h1>
        <p className="text-sm text-text-muted mt-0.5">{penulis.length} penulis terdaftar</p>
      </div>
      <PenulisClient
        initialPenulis={penulis.map((p) => ({ ...p, createdAt: p.createdAt.toISOString() }))}
      />
    </div>
  );
}
