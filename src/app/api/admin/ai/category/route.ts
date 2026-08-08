import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { suggestCategory } from "@/lib/ai";
import { getCategories } from "@/lib/categories";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { title, content } = await req.json();
    if (!content?.trim()) return NextResponse.json({ error: "Konten kosong" }, { status: 400 });

    // AI hanya boleh memilih dari kategori yang benar-benar ada
    const categories = await getCategories();
    const suggestions = await suggestCategory(
      title ?? "",
      content,
      categories.map((c) => ({ name: c.name, slug: c.slug }))
    );

    // Sertakan id & nama supaya UI bisa langsung menerapkannya
    const byslug = new Map(categories.map((c) => [c.slug, c]));
    const hasil = suggestions.map((s) => ({
      ...s,
      id: byslug.get(s.slug)?.id ?? "",
      nama: byslug.get(s.slug)?.name ?? s.slug,
    }));

    return NextResponse.json({ suggestions: hasil });
  } catch (err) {
    console.error("AI category error:", err);
    return NextResponse.json({ error: "Gagal menyarankan kategori" }, { status: 500 });
  }
}
