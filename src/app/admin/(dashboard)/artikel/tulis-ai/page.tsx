import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCategories } from "@/lib/categories";
import { getSessionActor } from "@/lib/sessionRole";
import TulisAiClient from "./TulisAiClient";

export const metadata: Metadata = { title: "Tulis dengan AI" };

export default async function TulisAiPage() {
  const [categories, actor] = await Promise.all([getCategories(), getSessionActor()]);
  if (!actor) redirect("/admin/login");

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-heading">Tulis dengan AI</h1>
        <p className="text-sm text-text-muted mt-0.5">
          Ubah siaran pers, catatan liputan, atau data menjadi draf artikel
        </p>
      </div>
      <TulisAiClient categories={categories} />
    </div>
  );
}
