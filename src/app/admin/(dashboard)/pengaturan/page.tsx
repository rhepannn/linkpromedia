import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionActor } from "@/lib/sessionRole";
import PengaturanClient from "./PengaturanClient";

export const metadata: Metadata = { title: "Pengaturan" };

// Selalu baca nilai tersimpan terbaru — halaman ini justru tempat mengubahnya
export const dynamic = "force-dynamic";

export default async function PengaturanPage() {
  const actor = await getSessionActor();
  if (!actor) redirect("/admin/login");
  // Identitas merek seluruh situs — bukan wilayah EDITOR/AUTHOR
  if (actor.role !== "ADMIN") redirect("/admin");

  const baris = await prisma.siteSetting.findMany({
    where: { key: { in: ["warnaPrimer", "warnaAksen"] } },
  });
  const peta = Object.fromEntries(baris.map((b) => [b.key, b.value]));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-heading">Pengaturan Situs</h1>
        <p className="text-sm text-text-muted mt-0.5">
          Ubah warna merek situs — pratinjau dulu, simpan kalau sudah pas
        </p>
      </div>
      <PengaturanClient
        tersimpan={{
          warnaPrimer: peta.warnaPrimer ?? null,
          warnaAksen: peta.warnaAksen ?? null,
        }}
      />
    </div>
  );
}
