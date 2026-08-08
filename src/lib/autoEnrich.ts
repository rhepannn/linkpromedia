import { prisma } from "@/lib/prisma";
import { generateSummary, generateTags, generateSeoMetadata } from "@/lib/ai";
import { syncArticleTags } from "@/lib/tags";

/**
 * Buatkan "Inti Berita" otomatis untuk artikel yang akan tayang, kalau belum punya.
 * Dipanggil saat artikel disimpan dengan status PUBLISHED/SCHEDULED.
 *
 * Sengaja tidak melempar error: kegagalan AI tidak boleh menggagalkan penerbitan artikel.
 */
export async function ensureAiSummary(articleId: string): Promise<void> {
  try {
    const article = await prisma.article.findUnique({
      where: { id: articleId },
      select: { content: true, aiSummary: true },
    });

    // Sudah punya rangkuman → jangan ditimpa
    if (!article || article.aiSummary) return;

    const points = await generateSummary(article.content);
    if (points.length === 0) return;

    await prisma.article.update({
      where: { id: articleId },
      data: { aiSummary: JSON.stringify(points) },
    });
  } catch (err) {
    console.error("Gagal membuat Inti Berita otomatis:", err);
  }
}

/**
 * Buatkan tag otomatis kalau artikel belum punya tag sama sekali.
 * Tag inilah yang dipakai untuk mencari "artikel serupa" berdasarkan isi,
 * jadi setiap artikel tayang perlu punya tag.
 */
export async function ensureAiTags(articleId: string): Promise<void> {
  try {
    const existing = await prisma.articleTag.count({ where: { articleId } });
    if (existing > 0) return;

    const article = await prisma.article.findUnique({
      where: { id: articleId },
      select: { title: true, content: true },
    });
    if (!article) return;

    const tags = await generateTags(article.title, article.content);
    if (tags.length === 0) return;

    await syncArticleTags(articleId, tags);
  } catch (err) {
    console.error("Gagal membuat tag otomatis:", err);
  }
}

/**
 * Isi metadata SEO otomatis kalau redaksi belum mengisinya.
 * Kolom yang sudah diisi manual tidak ditimpa.
 */
export async function ensureSeoMetadata(articleId: string): Promise<void> {
  try {
    const article = await prisma.article.findUnique({
      where: { id: articleId },
      select: { title: true, content: true, metaTitle: true, metaDescription: true },
    });
    if (!article) return;
    if (article.metaTitle && article.metaDescription) return;

    const seo = await generateSeoMetadata(article.title, article.content);

    const data: { metaTitle?: string; metaDescription?: string } = {};
    if (!article.metaTitle && seo.metaTitle) data.metaTitle = seo.metaTitle.slice(0, 60);
    if (!article.metaDescription && seo.metaDescription) {
      data.metaDescription = seo.metaDescription.slice(0, 160);
    }
    if (Object.keys(data).length === 0) return;

    await prisma.article.update({ where: { id: articleId }, data });
  } catch (err) {
    console.error("Gagal membuat metadata SEO otomatis:", err);
  }
}

/**
 * Lengkapi artikel yang akan tayang: Inti Berita, tag, dan metadata SEO.
 * Semuanya hanya diisi kalau belum ada, jadi tidak menimpa pekerjaan redaksi.
 */
export async function enrichArticleOnPublish(articleId: string, skipSummary = false): Promise<void> {
  if (!skipSummary) await ensureAiSummary(articleId);
  await ensureAiTags(articleId);
  await ensureSeoMetadata(articleId);
}
