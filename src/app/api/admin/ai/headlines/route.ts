import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generateHeadlines } from "@/lib/ai";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { content } = await req.json();
    if (!content?.trim()) return NextResponse.json({ error: "Konten kosong" }, { status: 400 });

    const options = await generateHeadlines(content);
    return NextResponse.json({ options });
  } catch (err) {
    console.error("AI headlines error:", err);
    return NextResponse.json({ error: "Gagal membuat alternatif judul" }, { status: 500 });
  }
}
