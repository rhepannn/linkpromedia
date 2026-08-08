import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Ambil id user dari sesi, TAPI hanya kalau user-nya memang masih ada di database.
 *
 * Sesi berbasis JWT bisa "basi": token masih valid di browser padahal baris user-nya
 * sudah tidak ada (mis. database di-seed ulang, atau akun dihapus). Tanpa pengecekan ini,
 * penyimpanan artikel gagal dengan error foreign key yang membingungkan redaksi.
 */
export async function getValidUserId(): Promise<string | null> {
  const session = await auth();
  const id = (session?.user as { id?: string } | undefined)?.id;
  if (!id) return null;

  const user = await prisma.user.findUnique({ where: { id }, select: { id: true } });
  return user?.id ?? null;
}

export const STALE_SESSION_MESSAGE =
  "Sesi login sudah tidak berlaku (akun tidak ditemukan). Silakan keluar lalu masuk kembali.";
