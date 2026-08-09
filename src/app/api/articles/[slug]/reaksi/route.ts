import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { makeVisitorId } from "@/lib/analytics";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

interface Params {
  params: Promise<{ slug: string }>;
}

/**
 * Reaksi pembaca pada artikel. Anonim: identitas cuma hash harian
 * IP+user-agent (makeVisitorId) — tidak ada data pribadi yang disimpan,
 * dan hash-nya berganti tiap hari sehingga tidak bisa melacak orang
 * antar hari. Konsekuensinya reaksi seseorang "terlupakan" keesokan
 * harinya; diterima, reaksi memang sinyal ringan.
 */
const JENIS_VALID = ["suka", "cinta", "kaget", "sedih", "marah"] as const;
type Jenis = (typeof JENIS_VALID)[number];

async function cariArtikelPublik(slug: string) {
  return prisma.article.findFirst({
    where: {
      slug,
      OR: [{ status: "PUBLISHED" }, { status: "SCHEDULED", publishedAt: { lte: new Date() } }],
    },
    select: { id: true },
  });
}

function identitas(req: NextRequest): string {
  return makeVisitorId(getClientIp(req), req.headers.get("user-agent") ?? "");
}

// GET — jumlah tiap reaksi + reaksi milik pengunjung ini
export async function GET(req: NextRequest, { params }: Params) {
  const { slug } = await params;
  try {
    const artikel = await cariArtikelPublik(slug);
    if (!artikel) return NextResponse.json({ error: "Artikel tidak ditemukan" }, { status: 404 });

    const [grup, milikku] = await Promise.all([
      prisma.articleReaction.groupBy({
        by: ["jenis"],
        where: { articleId: artikel.id },
        _count: { id: true },
      }),
      prisma.articleReaction.findUnique({
        where: { articleId_visitorId: { articleId: artikel.id, visitorId: identitas(req) } },
        select: { jenis: true },
      }),
    ]);

    const counts: Record<string, number> = {};
    for (const j of JENIS_VALID) counts[j] = 0;
    for (const g of grup) counts[g.jenis] = g._count.id;

    return NextResponse.json({ counts, milikku: milikku?.jenis ?? null });
  } catch (err) {
    console.error("Gagal mengambil reaksi:", err);
    return NextResponse.json({ error: "Gagal mengambil reaksi" }, { status: 500 });
  }
}

// POST { jenis } — pasang/ganti reaksi; kirim jenis yang sama = batalkan
export async function POST(req: NextRequest, { params }: Params) {
  const { slug } = await params;
  const ip = getClientIp(req);

  // Reaksi itu murah tapi menulis ke DB — 30 aksi per menit per IP cukup
  // longgar untuk pembaca sungguhan dan cukup ketat untuk skrip iseng
  if (!checkRateLimit(`reaksi:${ip}`, 30, 60 * 1000)) {
    return NextResponse.json({ error: "Terlalu cepat. Coba lagi sebentar." }, { status: 429 });
  }

  try {
    const { jenis } = await req.json();
    if (!JENIS_VALID.includes(jenis as Jenis)) {
      return NextResponse.json({ error: "Jenis reaksi tidak valid" }, { status: 400 });
    }

    const artikel = await cariArtikelPublik(slug);
    if (!artikel) return NextResponse.json({ error: "Artikel tidak ditemukan" }, { status: 404 });

    const visitorId = identitas(req);
    const kunci = { articleId_visitorId: { articleId: artikel.id, visitorId } };

    const lama = await prisma.articleReaction.findUnique({ where: kunci, select: { jenis: true } });

    if (lama?.jenis === jenis) {
      await prisma.articleReaction.delete({ where: kunci });
    } else if (lama) {
      await prisma.articleReaction.update({ where: kunci, data: { jenis } });
    } else {
      await prisma.articleReaction.create({ data: { articleId: artikel.id, visitorId, jenis } });
    }

    const grup = await prisma.articleReaction.groupBy({
      by: ["jenis"],
      where: { articleId: artikel.id },
      _count: { id: true },
    });
    const counts: Record<string, number> = {};
    for (const j of JENIS_VALID) counts[j] = 0;
    for (const g of grup) counts[g.jenis] = g._count.id;

    return NextResponse.json({ counts, milikku: lama?.jenis === jenis ? null : jenis });
  } catch (err) {
    console.error("Gagal menyimpan reaksi:", err);
    return NextResponse.json({ error: "Gagal menyimpan reaksi" }, { status: 500 });
  }
}
