import type { Metadata } from "next";
import KategoriClient from "./KategoriClient";
import { getCategories } from "@/lib/categories";

export const metadata: Metadata = { title: "Kelola Kategori" };

export default async function AdminKategoriPage() {
  const categories = await getCategories();

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold text-heading">Kategori</h1>
        <p className="text-sm text-text-muted mt-0.5">{categories.length} kategori aktif</p>
      </div>
      <KategoriClient initialCategories={categories} />
    </div>
  );
}
