import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { checkGrammar } from "@/lib/ai";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { content } = await req.json();
    if (!content?.trim()) return NextResponse.json({ error: "Konten kosong" }, { status: 400 });

    const issues = await checkGrammar(content);
    return NextResponse.json({ issues });
  } catch (err) {
    console.error("AI grammar error:", err);
    return NextResponse.json({ error: "Gagal memeriksa tata bahasa" }, { status: 500 });
  }
}
