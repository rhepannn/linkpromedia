import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isRole, type Role } from "@/lib/permissions";

export interface SessionActor {
  id: string;
  role: Role;
  name: string;
}

/**
 * Ambil identitas & peran pengguna dari database, bukan dari token.
 *
 * Peran di token JWT bisa basi: admin mengubah peran seseorang, tapi token
 * lamanya masih menyimpan peran yang dulu sampai dia login ulang. Membaca
 * langsung dari database membuat pencabutan izin berlaku seketika.
 */
export async function getSessionActor(): Promise<SessionActor | null> {
  const session = await auth();
  const id = (session?.user as { id?: string } | undefined)?.id;
  if (!id) return null;

  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, role: true, name: true },
  });
  if (!user || !isRole(user.role)) return null;

  return { id: user.id, role: user.role, name: user.name };
}
