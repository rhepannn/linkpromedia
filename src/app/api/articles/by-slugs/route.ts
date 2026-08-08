import { NextRequest, NextResponse } from "next/server";
import { getArticlesBySlugs } from "@/lib/articles";

// GET /api/articles/by-slugs?slugs=a,b,c — publik, dipakai Bookmark & Reading History
export async function GET(req: NextRequest) {
  const slugsParam = req.nextUrl.searchParams.get("slugs") ?? "";
  const slugs = slugsParam
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 50);

  try {
    const articles = await getArticlesBySlugs(slugs);
    return NextResponse.json(articles);
  } catch {
    return NextResponse.json({ error: "Gagal mengambil artikel" }, { status: 500 });
  }
}
