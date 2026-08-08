import { prisma } from "@/lib/prisma";

export interface RevisionEntry {
  id: string;
  title: string;
  excerpt: string | null;
  createdAt: Date;
  editedBy: { name: string } | null;
}

/**
 * Simpan cuplikan isi artikel SAAT INI sebagai revisi, sebelum perubahan baru diterapkan.
 * Dipanggil di awal PATCH, sebelum prisma.article.update() mengubah judul/konten.
 */
export async function snapshotRevision(articleId: string, editedById: string | null): Promise<void> {
  const current = await prisma.article.findUnique({
    where: { id: articleId },
    select: { title: true, excerpt: true, content: true },
  });
  if (!current) return;

  // Sesi bisa "basi" (user sudah tidak ada di DB). Simpan revisi tanpa pengubah
  // daripada menggagalkan penyimpanan artikel karena foreign key.
  let safeEditedById = editedById;
  if (safeEditedById) {
    const exists = await prisma.user.findUnique({ where: { id: safeEditedById }, select: { id: true } });
    if (!exists) safeEditedById = null;
  }

  await prisma.articleRevision.create({
    data: {
      articleId,
      title: current.title,
      excerpt: current.excerpt,
      content: current.content,
      editedById: safeEditedById,
    },
  });
}

/**
 * Ambil semua revisi sebuah artikel, terbaru dulu
 */
export async function getRevisions(articleId: string): Promise<RevisionEntry[]> {
  return prisma.articleRevision.findMany({
    where: { articleId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      excerpt: true,
      createdAt: true,
      editedBy: { select: { name: true } },
    },
  });
}

/**
 * Pulihkan artikel ke versi revisi tertentu. Kondisi SAAT INI ikut disimpan
 * sebagai revisi baru dulu, supaya rollback ini sendiri bisa dibatalkan.
 */
export async function restoreRevision(
  articleId: string,
  revisionId: string,
  restoredById: string | null
): Promise<void> {
  const revision = await prisma.articleRevision.findUnique({ where: { id: revisionId } });
  if (!revision || revision.articleId !== articleId) {
    throw new Error("Revisi tidak ditemukan");
  }

  await snapshotRevision(articleId, restoredById);

  await prisma.article.update({
    where: { id: articleId },
    data: {
      title: revision.title,
      excerpt: revision.excerpt,
      content: revision.content,
    },
  });
}
