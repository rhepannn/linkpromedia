import { PrismaClient, Prisma } from "@prisma/client";

// Mencegah multiple instances saat hot-reload di development
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const basePrisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = basePrisma;

/**
 * Kode error Prisma yang berarti koneksi GAGAL DIBENTUK (server tak terjangkau,
 * timeout konek, timeout menunggu slot connection pool) — bukan error dari hasil
 * query itu sendiri. Karena kueri belum sempat sampai ke database sama sekali,
 * mencoba ulang aman dilakukan (tidak berisiko duplikat/efek ganda).
 */
// P1017 = "Server has closed the connection". Ini justru yang PALING sering
// muncul di pooler transaction (port 6543): koneksi didaur ulang di sisi
// pgbouncer, dan query berikutnya memakai koneksi yang sudah ditutup.
// Percobaan ulang hampir selalu langsung berhasil.
const KODE_ERROR_KONEKSI = new Set(["P1001", "P1002", "P1017", "P2024"]);

function gangguanKoneksiSementara(err: unknown): boolean {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    return KODE_ERROR_KONEKSI.has(err.code);
  }
  // "Can't reach database server" kadang muncul sebagai error inisialisasi,
  // bukan PrismaClientKnownRequestError
  return err instanceof Prisma.PrismaClientInitializationError;
}

function tunda(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Dibungkus fungsi (bukan dipanggil langsung) supaya `.$extends()` TIDAK
 * pernah benar-benar dieksekusi di Edge Runtime — lihat catatan di bawah.
 * `ReturnType<>` di bawah mengambil tipenya saja tanpa memanggil fungsi ini.
 */
function buatKlienDenganRetry() {
  return basePrisma.$extends({
    query: {
      async $allOperations({ args, query }) {
        const MAKS_PERCOBAAN = 3;
        for (let percobaan = 1; ; percobaan++) {
          try {
            return await query(args);
          } catch (err) {
            if (percobaan >= MAKS_PERCOBAAN || !gangguanKoneksiSementara(err)) throw err;
            await tunda(300 * percobaan); // jeda 300ms, lalu 600ms
          }
        }
      },
    },
  });
}

type PrismaTerextensi = ReturnType<typeof buatKlienDenganRetry>;

/**
 * Prisma Client dengan retry otomatis KHUSUS gangguan koneksi sementara.
 * Error lain (constraint unik, validasi, dll) tetap langsung dilempar apa
 * adanya — mengulang error semacam itu tidak akan mengubah hasilnya dan
 * hanya menyembunyikan bug sungguhan.
 *
 * PENTING: `$extends()` memvalidasi diri secara eager saat dipanggil — ini
 * CRASH di Edge Runtime (middleware.ts mengimpor auth.ts yang mengimpor
 * modul ini, dan middleware Next.js jalan di edge). Padahal middleware
 * tidak pernah benar-benar menjalankan kueri Prisma (cuma baca JWT session).
 * Karena itu retry-wrapper HANYA dibuat di runtime Node — di edge dipakai
 * klien polos apa adanya (aman, karena kueri di sana memang tidak pernah
 * benar-benar dipanggil), di-cast ke tipe yang sama supaya tidak jadi union
 * type yang merusak inferensi TypeScript di pemanggil lain (mis. groupBy).
 */
export const prisma: PrismaTerextensi =
  process.env.NEXT_RUNTIME === "edge"
    ? (basePrisma as unknown as PrismaTerextensi)
    : buatKlienDenganRetry();
