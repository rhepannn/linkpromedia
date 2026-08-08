import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { assessBreakingNews } from "@/lib/ai";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { title, content } = await req.json();
    if (!content?.trim()) return NextResponse.json({ error: "Konten kosong" }, { status: 400 });

    const penilaian = await assessBreakingNews(title ?? "", content);
    return NextResponse.json({ penilaian });
  } catch (err) {
    console.error("AI breaking detection error:", err);
    return NextResponse.json({ error: "Gagal menilai kelayakan Breaking News" }, { status: 500 });
  }
}
