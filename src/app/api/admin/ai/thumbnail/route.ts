import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { suggestThumbnail } from "@/lib/ai";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { title, content } = await req.json();
    if (!content?.trim()) return NextResponse.json({ error: "Konten kosong" }, { status: 400 });

    const media = await prisma.media.findMany({
      orderBy: { createdAt: "desc" },
      take: 40,
      select: { url: true, filename: true },
    });

    const hasil = await suggestThumbnail(title ?? "", content, media);
    return NextResponse.json({ ...hasil, totalMedia: media.length });
  } catch (err) {
    console.error("AI thumbnail error:", err);
    return NextResponse.json({ error: "Gagal menyarankan thumbnail" }, { status: 500 });
  }
}
