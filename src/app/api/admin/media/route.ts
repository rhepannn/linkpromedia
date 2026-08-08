import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getMediaLibrary } from "@/lib/media";

// GET /api/admin/media — daftar semua media
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const media = await getMediaLibrary();
    return NextResponse.json(media);
  } catch (err) {
    console.error("Gagal mengambil daftar media:", err);
    return NextResponse.json({ error: "Gagal mengambil daftar media" }, { status: 500 });
  }
}
