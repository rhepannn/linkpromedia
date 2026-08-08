import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generateSummaryVariants } from "@/lib/ai";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { content } = await req.json();
    if (!content?.trim()) return NextResponse.json({ error: "Konten kosong" }, { status: 400 });

    const variants = await generateSummaryVariants(content);
    return NextResponse.json({ variants });
  } catch (err) {
    console.error("AI summary variants error:", err);
    return NextResponse.json({ error: "Gagal membuat variasi ringkasan" }, { status: 500 });
  }
}
