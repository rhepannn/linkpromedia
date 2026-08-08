import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generateSeoMetadata } from "@/lib/ai";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { title, content } = await req.json();
    if (!content?.trim()) return NextResponse.json({ error: "Konten kosong" }, { status: 400 });

    const metadata = await generateSeoMetadata(title ?? "", content);
    return NextResponse.json(metadata);
  } catch (err) {
    console.error("AI SEO error:", err);
    return NextResponse.json({ error: "Gagal membuat metadata SEO" }, { status: 500 });
  }
}
