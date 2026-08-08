import { prisma } from "@/lib/prisma";

/**
 * Catat satu aktivitas redaksi (login, buat/edit/hapus artikel, ubah role, dll).
 * Sengaja tidak melempar error — kegagalan logging tidak boleh menggagalkan aksi utama.
 */
export async function logActivity(params: {
  userId?: string | null;
  action: string;
  description: string;
}): Promise<void> {
  try {
    // Sesi bisa "basi" (user sudah tidak ada di DB). Simpan tanpa userId daripada
    // gagal karena foreign key — logya tetap tercatat.
    let userId = params.userId ?? null;
    if (userId) {
      const exists = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
      if (!exists) userId = null;
    }

    await prisma.activityLog.create({
      data: {
        userId,
        action: params.action,
        description: params.description,
      },
    });
  } catch (err) {
    console.error("Gagal mencatat activity log:", err);
  }
}

export interface ActivityLogEntry {
  id: string;
  action: string;
  description: string;
  createdAt: Date;
  user: { name: string } | null;
}

/**
 * Ambil log aktivitas terbaru untuk ditampilkan di panel admin, dipaginasi.
 * Dulu langsung menampilkan 100 baris sekaligus dalam satu daftar panjang —
 * sekarang per halaman, sama seperti pola paginasi di halaman kategori/topik.
 */
export async function getRecentActivity(
  halaman = 1,
  perHalaman = 20
): Promise<{ entries: ActivityLogEntry[]; total: number; totalHalaman: number }> {
  const skip = (halaman - 1) * perHalaman;

  const [entries, total] = await Promise.all([
    prisma.activityLog.findMany({
      orderBy: { createdAt: "desc" },
      skip,
      take: perHalaman,
      select: {
        id: true,
        action: true,
        description: true,
        createdAt: true,
        user: { select: { name: true } },
      },
    }),
    prisma.activityLog.count(),
  ]);

  return { entries, total, totalHalaman: Math.max(1, Math.ceil(total / perHalaman)) };
}
