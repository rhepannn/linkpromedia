import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generateSummary } from "@/lib/ai";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { content } = await req.json();
    if (!content?.trim()) return NextResponse.json({ error: "Konten kosong" }, { status: 400 });

    const points = await generateSummary(content);
    return NextResponse.json({ points });
  } catch (err) {
    console.error("AI summary error:", err);
    return NextResponse.json({ error: "Gagal membuat ringkasan AI" }, { status: 500 });
  }
}
