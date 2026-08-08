import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getRevisions } from "@/lib/articleRevisions";

interface Params {
  params: Promise<{ id: string }>;
}

// GET /api/admin/artikel/[id]/revisions — daftar riwayat revisi
export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const revisions = await getRevisions(id);
    return NextResponse.json(revisions);
  } catch {
    return NextResponse.json({ error: "Gagal mengambil riwayat revisi" }, { status: 500 });
  }
}
