import { prisma } from "@/lib/prisma";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

/**
 * Sinkronkan daftar tag sebuah artikel: buat tag yang belum ada,
 * lalu ganti seluruh relasi artikel↔tag dengan daftar baru.
 */
export async function syncArticleTags(articleId: string, tagNames: string[]): Promise<void> {
  const cleaned = Array.from(
    new Set(tagNames.map((t) => t.trim().toLowerCase()).filter(Boolean))
  );

  await prisma.articleTag.deleteMany({ where: { articleId } });
  if (cleaned.length === 0) return;

  const tagIds: string[] = [];
  for (const name of cleaned) {
    const tag = await prisma.tag.upsert({
      where: { name },
      update: {},
      create: { name, slug: slugify(name) },
    });
    tagIds.push(tag.id);
  }

  await prisma.articleTag.createMany({
    data: tagIds.map((tagId) => ({ articleId, tagId })),
    skipDuplicates: true,
  });
}
