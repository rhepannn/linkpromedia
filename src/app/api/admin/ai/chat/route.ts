import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { klasifikasiIntent } from "@/lib/aiChat";
import {
  generateHeadlines,
  generateSeoMetadata,
  generateSummary,
  generateSummaryVariants,
  generateTags,
  checkGrammar,
  suggestCategory,
  suggestInternalLinks,
  detectDuplicates,
  suggestThumbnail,
  assessBreakingNews,
  generateTimeline,
  translateArticle,
  checkFacts,
  reviewWriting,
  obrolanBebas,
  type BahasaTarget,
  type PesanObrolan,
} from "@/lib/ai";
import { risetBeritaEksternal } from "@/lib/newsDiscovery";

// Riset berita = ambil banyak RSS (batas waktu 8 dtk/sumber) + AI pengelompokan.
// Batas bawaan Vercel Hobby (~10 dtk) memotongnya di tengah; 60 dtk adalah
// maksimum yang diizinkan Hobby.
export const maxDuration = 60;

const BALASAN: Partial<Record<string, string>> = {
  headlines: "Ini beberapa alternatif judul yang saya susun dari isi artikelnya:",
  seo: "Ini metadata SEO yang saya buat:",
  summary: "Ini Inti Berita yang akan tampil ke pembaca:",
  "summary-variants": "Ini ringkasan artikelnya dalam tiga panjang berbeda:",
  tags: "Ini saran tag untuk artikel ini:",
  grammar: "Saya sudah periksa tata bahasanya:",
  category: "Ini kategori yang paling cocok menurut saya:",
  "internal-links": "Ini artikel lain yang layak ditautkan:",
  duplicates: "Ini hasil pengecekan duplikasi:",
  thumbnail: "Ini saran thumbnail untuk artikel ini:",
  breaking: "Ini penilaian kelayakan Breaking News-nya:",
  timeline: "Ini kronologi yang saya susun dari isi artikelnya:",
  "fact-check": "Ini bagian yang menurut saya perlu dicek ulang:",
  writing: "Ini masukan gaya penulisan dari saya:",
};

/**
 * POST /api/admin/ai/chat — pintu masuk AI Newsroom Assistant.
 *
 * Alurnya SELALU dua langkah: klasifikasi intent dulu (fixed set), baru
 * dispatch ke fungsi AI yang sudah ada & teruji terpisah. Chat ini tidak
 * pernah "bebas" memutuskan tindakan sendiri di luar daftar itu.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { pesan, title, content, articleId, mandiri, riwayat } = await req.json();

    if (typeof pesan !== "string" || !pesan.trim()) {
      return NextResponse.json({ error: "Pesan kosong" }, { status: 400 });
    }

    const judul = typeof title === "string" ? title : "";
    const isi = typeof content === "string" ? content : "";
    const excludeId = typeof articleId === "string" && articleId ? articleId : undefined;

    const klasifikasi = await klasifikasiIntent(pesan.trim());

    // Permintaan menulis artikel dari topik bebas ditolak di sini, sebelum
    // sampai ke model obrolan — supaya penolakannya tidak bergantung pada
    // kepatuhan model terhadap prompt
    if (klasifikasi.intent === "belum-tersedia") {
      return NextResponse.json({
        tipe: "belum-tersedia",
        balasan:
          klasifikasi.catatan?.trim() ||
          "Artikel di sini harus ditulis dari bahan sumber (siaran pers, wawancara, data, atau dokumen resmi), bukan dari topik saja. Tapi saya bisa bantu menyusun kerangka atau sudut liputannya.",
      });
    }

    // Obrolan biasa dijawab bebas oleh model, lengkap dengan riwayat
    // percakapan supaya nyambung seperti chatbot pada umumnya
    if (klasifikasi.intent === "obrolan") {
      const sebelumnya: PesanObrolan[] = Array.isArray(riwayat)
        ? riwayat
            .filter(
              (p: unknown): p is PesanObrolan =>
                typeof p === "object" &&
                p !== null &&
                typeof (p as PesanObrolan).teks === "string" &&
                ((p as PesanObrolan).peran === "user" || (p as PesanObrolan).peran === "ai")
            )
            .map((p) => ({ peran: p.peran, teks: p.teks.slice(0, 4000) }))
        : [];

      const balasan = await obrolanBebas(sebelumnya, pesan.trim());
      return NextResponse.json({ tipe: "obrolan", balasan });
    }

    // Riset berita media lain tidak butuh artikel yang sedang ditulis —
    // redaksi justru memakainya saat editor masih kosong, untuk cari bahan
    if (klasifikasi.intent === "news-discovery") {
      const topik = typeof klasifikasi.topik === "string" ? klasifikasi.topik.trim() : "";
      const hasil = await risetBeritaEksternal(topik || undefined);

      if (hasil.topik.length === 0) {
        return NextResponse.json({
          tipe: "obrolan",
          balasan: topik
            ? `Saya tidak menemukan berita yang cukup ramai soal "${topik}" di media lain saat ini.`
            : "Saya tidak berhasil mengambil berita dari media lain saat ini. Coba lagi sebentar lagi.",
        });
      }

      return NextResponse.json({
        tipe: "news-discovery",
        balasan: topik
          ? `Ini yang sedang ramai soal "${topik}" di ${hasil.sumberBerhasil.length} sumber berita:`
          : `Ini yang sedang ramai di ${hasil.sumberBerhasil.length} sumber berita:`,
        hasil,
      });
    }

    // Di halaman ChatBot mandiri tidak ada editor sama sekali, jadi menyuruh
    // "isi konten dulu" akan membingungkan — arahkan ke editor artikelnya
    if (!isi.trim()) {
      return NextResponse.json({
        tipe: "obrolan",
        balasan: mandiri
          ? "Permintaan ini butuh isi artikel. Buka artikelnya di menu Artikel, lalu pakai asisten AI di halaman editornya."
          : "Isi dulu konten artikelnya sebelum minta saya bantu — saya perlu bacaannya dulu.",
      });
    }

    const balasan = BALASAN[klasifikasi.intent] ?? "Ini hasilnya:";

    switch (klasifikasi.intent) {
      case "headlines": {
        const hasil = await generateHeadlines(isi);
        return NextResponse.json({ tipe: "headlines", balasan, hasil });
      }
      case "seo": {
        const hasil = await generateSeoMetadata(judul, isi);
        return NextResponse.json({ tipe: "seo", balasan, hasil });
      }
      case "summary": {
        const hasil = await generateSummary(isi);
        return NextResponse.json({ tipe: "summary", balasan, hasil });
      }
      case "summary-variants": {
        const hasil = await generateSummaryVariants(isi);
        return NextResponse.json({ tipe: "summary-variants", balasan, hasil });
      }
      case "tags": {
        const hasil = await generateTags(judul, isi);
        return NextResponse.json({ tipe: "tags", balasan, hasil });
      }
      case "grammar": {
        const hasil = await checkGrammar(isi);
        return NextResponse.json({ tipe: "grammar", balasan, hasil });
      }
      case "category": {
        const categories = await prisma.category.findMany({ select: { id: true, name: true, slug: true } });
        const suggestions = await suggestCategory(
          judul,
          isi,
          categories.map((c) => ({ name: c.name, slug: c.slug }))
        );
        const bySlug = new Map(categories.map((c) => [c.slug, c]));
        const hasil = suggestions.map((s) => ({
          ...s,
          id: bySlug.get(s.slug)?.id ?? "",
          nama: bySlug.get(s.slug)?.name ?? s.slug,
        }));
        return NextResponse.json({ tipe: "category", balasan, hasil });
      }
      case "internal-links": {
        const kandidat = await prisma.article.findMany({
          where: { status: "PUBLISHED", ...(excludeId && { id: { not: excludeId } }) },
          orderBy: { publishedAt: "desc" },
          take: 30,
          select: { slug: true, title: true, excerpt: true },
        });
        const hasil = await suggestInternalLinks(isi, kandidat);
        return NextResponse.json({ tipe: "internal-links", balasan, hasil });
      }
      case "duplicates": {
        const sejak = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        const kandidat = await prisma.article.findMany({
          where: {
            status: { in: ["PUBLISHED", "SCHEDULED", "IN_REVIEW"] },
            createdAt: { gte: sejak },
            ...(excludeId && { id: { not: excludeId } }),
          },
          orderBy: { createdAt: "desc" },
          take: 30,
          select: { slug: true, title: true, excerpt: true },
        });
        const hasil = await detectDuplicates(judul, isi, kandidat);
        return NextResponse.json({ tipe: "duplicates", balasan, hasil });
      }
      case "thumbnail": {
        const media = await prisma.media.findMany({
          orderBy: { createdAt: "desc" },
          take: 40,
          select: { url: true, filename: true },
        });
        const hasil = await suggestThumbnail(judul, isi, media);
        return NextResponse.json({ tipe: "thumbnail", balasan, hasil });
      }
      case "breaking": {
        const hasil = await assessBreakingNews(judul, isi);
        return NextResponse.json({ tipe: "breaking", balasan, hasil });
      }
      case "timeline": {
        const hasil = await generateTimeline(isi);
        return NextResponse.json({ tipe: "timeline", balasan, hasil });
      }
      case "translate": {
        const target = klasifikasi.bahasaTarget as BahasaTarget | null | undefined;
        if (!target) {
          return NextResponse.json({
            tipe: "obrolan",
            balasan: "Mau diterjemahkan ke bahasa apa? Saya bisa bantu ke Inggris, Jepang, atau Arab.",
          });
        }
        const hasil = await translateArticle(judul, isi, target);
        return NextResponse.json({
          tipe: "translate",
          balasan: hasil ? `Ini terjemahannya:` : "Konten terlalu pendek untuk diterjemahkan.",
          hasil,
        });
      }
      case "fact-check": {
        const hasil = await checkFacts(isi);
        return NextResponse.json({ tipe: "fact-check", balasan, hasil });
      }
      case "writing": {
        const hasil = await reviewWriting(isi);
        return NextResponse.json({ tipe: "writing", balasan, hasil });
      }
      default:
        return NextResponse.json({
          tipe: "obrolan",
          balasan: "Maaf, saya belum paham maksudnya. Bisa dijelaskan lagi?",
        });
    }
  } catch (err) {
    console.error("AI chat error:", err);
    return NextResponse.json({ error: "Gagal memproses permintaan" }, { status: 500 });
  }
}
