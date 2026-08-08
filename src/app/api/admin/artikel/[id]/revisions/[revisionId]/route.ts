import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { restoreRevision } from "@/lib/articleRevisions";
import { logActivity } from "@/lib/activityLog";
import { prisma } from "@/lib/prisma";

interface Params {
  params: Promise<{ id: string; revisionId: string }>;
}

// POST /api/admin/artikel/[id]/revisions/[revisionId] — pulihkan artikel ke versi ini
export async function POST(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, revisionId } = await params;

  try {
    await restoreRevision(id, revisionId, (session.user as { id?: string }).id ?? null);

    const article = await prisma.article.findUnique({ where: { id }, select: { title: true } });
    await logActivity({
      userId: (session.user as { id?: string }).id,
      action: "ARTICLE_RESTORE",
      description: `Memulihkan artikel "${article?.title ?? id}" ke versi sebelumnya`,
    });

    return NextResponse.json({ message: "Artikel berhasil dipulihkan" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal memulihkan artikel";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
