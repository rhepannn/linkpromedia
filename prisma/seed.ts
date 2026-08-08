import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const CATEGORIES = [
  { name: "Nasional", slug: "nasional" },
  { name: "Ekonomi & Bisnis", slug: "ekonomi-bisnis" },
  { name: "Teknologi", slug: "teknologi" },
  { name: "Olahraga", slug: "olahraga" },
  { name: "Hiburan & Lifestyle", slug: "hiburan-lifestyle" },
  { name: "Internasional", slug: "internasional" },
  { name: "Opini", slug: "opini" },
];

const SAMPLE_ARTICLES = [
  {
    title: "Pemerintah Luncurkan Program Digitalisasi UMKM Nasional",
    slug: "pemerintah-luncurkan-program-digitalisasi-umkm-nasional",
    excerpt: "Program ini ditargetkan menjangkau 10 juta pelaku UMKM di seluruh Indonesia pada akhir tahun 2026.",
    content: `<p>Pemerintah Indonesia secara resmi meluncurkan program digitalisasi UMKM nasional yang ambisius pada Jumat (25/7). Program ini menargetkan 10 juta pelaku usaha mikro, kecil, dan menengah di seluruh pelosok Indonesia.</p>
<p>Menteri Koperasi dan UKM menyatakan bahwa program ini merupakan bagian dari strategi besar transformasi ekonomi digital Indonesia yang akan berdampak signifikan terhadap pertumbuhan PDB.</p>
<h2>Tiga Pilar Utama Program</h2>
<p>Program digitalisasi ini berdiri di atas tiga pilar utama: pelatihan digital, akses pembiayaan berbasis teknologi, dan pemasaran online.</p>`,
    categorySlug: "nasional",
    hoursAgo: 0.5,
  },
  {
    title: "Rupiah Menguat ke Level Rp15.800 per Dolar AS",
    slug: "rupiah-menguat-ke-level-rp15800-per-dolar-as",
    excerpt: "Penguatan rupiah didorong oleh sentimen positif dari kebijakan moneter Bank Indonesia.",
    content: `<p>Nilai tukar rupiah terhadap dolar Amerika Serikat menguat signifikan ke level Rp15.800 pada perdagangan hari ini. Penguatan ini merupakan yang tertinggi dalam dua bulan terakhir.</p>
<p>Bank Indonesia menyambut positif perkembangan ini dan menyatakan akan terus menjaga stabilitas nilai tukar melalui operasi pasar yang terukur.</p>`,
    categorySlug: "ekonomi-bisnis",
    hoursAgo: 2,
  },
  {
    title: "Apple Rilis iOS 20 dengan Fitur AI Terbaru",
    slug: "apple-rilis-ios-20-dengan-fitur-ai-terbaru",
    excerpt: "iOS 20 hadir dengan sejumlah fitur kecerdasan buatan yang diklaim mengubah cara pengguna berinteraksi dengan iPhone.",
    content: `<p>Apple secara resmi merilis iOS 20, pembaruan sistem operasi terbesar dalam sejarah iPhone. Versi terbaru ini membawa serangkaian fitur berbasis kecerdasan buatan yang revolusioner.</p>
<p>Fitur unggulan meliputi asisten AI yang lebih cerdas, pemrosesan foto otomatis, dan integrasi mendalam dengan ekosistem aplikasi Apple.</p>`,
    categorySlug: "teknologi",
    hoursAgo: 5,
  },
  {
    title: "Timnas Indonesia Kalahkan Vietnam 2-1 di Kualifikasi Piala Asia",
    slug: "timnas-indonesia-kalahkan-vietnam-2-1-di-kualifikasi-piala-asia",
    excerpt: "Dua gol dari Marselino Ferdinan membawa Indonesia meraih kemenangan penting atas Vietnam.",
    content: `<p>Timnas Indonesia meraih kemenangan bersejarah atas Vietnam dalam laga kualifikasi Piala Asia yang berlangsung di Stadion Gelora Bung Karno, Jakarta, Jumat malam.</p>
<p>Marselino Ferdinan menjadi pahlawan dengan mencetak dua gol, sementara Vietnam membalas melalui tendangan bebas di menit ke-78.</p>`,
    categorySlug: "olahraga",
    hoursAgo: 8,
  },
  {
    title: "Tren Kopi Susu Lokal Semakin Mendominasi Pasar Minuman Indonesia",
    slug: "tren-kopi-susu-lokal-semakin-mendominasi-pasar-minuman-indonesia",
    excerpt: "Brand kopi susu lokal terus tumbuh dan kini menguasai lebih dari 60% segmen minuman kopi di Indonesia.",
    content: `<p>Industri kopi susu lokal Indonesia terus mencatatkan pertumbuhan yang mengesankan. Berdasarkan data terbaru, brand-brand lokal kini menguasai lebih dari 60% pasar minuman kopi siap saji.</p>
<p>Fenomena ini didorong oleh meningkatnya kesadaran konsumen terhadap produk lokal dan strategi harga yang kompetitif dari para pelaku industri.</p>`,
    categorySlug: "hiburan-lifestyle",
    hoursAgo: 12,
  },
  {
    title: "KTT ASEAN 2026: Pemimpin Negara Bahas Stabilitas Kawasan",
    slug: "ktt-asean-2026-pemimpin-negara-bahas-stabilitas-kawasan",
    excerpt: "Para pemimpin 10 negara ASEAN berkumpul membahas isu keamanan regional dan kerja sama ekonomi.",
    content: `<p>Konferensi Tingkat Tinggi ASEAN 2026 resmi dibuka di Jakarta, menghadirkan kepala negara dan kepala pemerintahan dari seluruh 10 negara anggota.</p>
<p>Agenda utama meliputi pembahasan stabilitas kawasan, penanganan perubahan iklim, dan penguatan kerja sama ekonomi antar negara anggota.</p>`,
    categorySlug: "internasional",
    hoursAgo: 24,
  },
];

async function main() {
  console.log("Seeding kategori...");
  for (const cat of CATEGORIES) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    });
  }

  console.log("Seeding akun admin...");
  const passwordHash = await bcrypt.hash("admin123", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@linkpromedia.id" },
    update: {},
    create: {
      name: "Admin Dev",
      email: "admin@linkpromedia.id",
      passwordHash,
      role: "ADMIN",
    },
  });

  console.log("Seeding artikel contoh...");
  for (const article of SAMPLE_ARTICLES) {
    const category = await prisma.category.findUniqueOrThrow({ where: { slug: article.categorySlug } });
    const publishedAt = new Date(Date.now() - article.hoursAgo * 60 * 60 * 1000);
    await prisma.article.upsert({
      where: { slug: article.slug },
      update: {},
      create: {
        title: article.title,
        slug: article.slug,
        excerpt: article.excerpt,
        content: article.content,
        status: "PUBLISHED",
        publishedAt,
        categoryId: category.id,
        authorId: admin.id,
      },
    });
  }

  console.log("Seed selesai.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
