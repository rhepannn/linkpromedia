import { prisma } from "@/lib/prisma";
import { supabaseAdmin, THUMBNAIL_BUCKET } from "@/lib/supabaseAdmin";

export interface MediaItem {
  id: string;
  url: string;
  filename: string;
  mimeType: string;
  size: number;
  createdAt: Date;
  uploadedBy: { name: string } | null;
  usageCount: number;
}

/**
 * Ambil semua media, beserta jumlah artikel yang memakainya (dicocokkan lewat thumbnailUrl)
 */
export async function getMediaLibrary(): Promise<MediaItem[]> {
  const media = await prisma.media.findMany({
    orderBy: { createdAt: "desc" },
    include: { uploadedBy: { select: { name: true } } },
  });

  if (media.length === 0) return [];

  const articlesUsingMedia = await prisma.article.findMany({
    where: { thumbnailUrl: { in: media.map((m) => m.url) } },
    select: { thumbnailUrl: true },
  });
  const usageMap = new Map<string, number>();
  for (const a of articlesUsingMedia) {
    if (!a.thumbnailUrl) continue;
    usageMap.set(a.thumbnailUrl, (usageMap.get(a.thumbnailUrl) ?? 0) + 1);
  }

  return media.map((m) => ({
    ...m,
    usageCount: usageMap.get(m.url) ?? 0,
  }));
}

/**
 * Hapus media dari storage + database. Ditolak kalau masih dipakai artikel.
 */
export async function deleteMedia(id: string): Promise<void> {
  const media = await prisma.media.findUnique({ where: { id } });
  if (!media) throw new Error("Media tidak ditemukan");

  const usageCount = await prisma.article.count({ where: { thumbnailUrl: media.url } });
  if (usageCount > 0) {
    throw new Error(`Media masih dipakai oleh ${usageCount} artikel. Ganti thumbnail-nya dulu.`);
  }

  await supabaseAdmin.storage.from(THUMBNAIL_BUCKET).remove([media.filename]);
  await prisma.media.delete({ where: { id } });
}
