import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activityLog";
import { getValidUserId } from "@/lib/sessionUser";
import { hexValid } from "@/lib/warna";

/**
 * Pengaturan tampilan situs. Hanya ADMIN — ini identitas merek seluruh
 * situs, bukan preferensi per akun.
 */
function bolehMengatur(role?: string): boolean {
  return role === "ADMIN";
}

// GET — tema tersimpan (null berarti masih warna bawaan)
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const baris = await prisma.siteSetting.findMany({
      where: { key: { in: ["warnaPrimer", "warnaAksen"] } },
    });
    const peta = Object.fromEntries(baris.map((b) => [b.key, b.value]));
    return NextResponse.json({
      warnaPrimer: peta.warnaPrimer ?? null,
      warnaAksen: peta.warnaAksen ?? null,
    });
  } catch {
    return NextResponse.json({ error: "Gagal mengambil pengaturan" }, { status: 500 });
  }
}

// POST { warnaPrimer, warnaAksen } — simpan tema
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  if (!bolehMengatur(role)) {
    return NextResponse.json({ error: "Hanya admin yang dapat mengubah pengaturan situs" }, { status: 403 });
  }

  try {
    const { warnaPrimer, warnaAksen } = await req.json();
    if (!hexValid(warnaPrimer ?? "") || !hexValid(warnaAksen ?? "")) {
      return NextResponse.json(
        { error: "Warna harus format hex 6 digit, contoh #0C447C" },
        { status: 400 }
      );
    }

    await prisma.$transaction([
      prisma.siteSetting.upsert({
        where: { key: "warnaPrimer" },
        update: { value: warnaPrimer },
        create: { key: "warnaPrimer", value: warnaPrimer },
      }),
      prisma.siteSetting.upsert({
        where: { key: "warnaAksen" },
        update: { value: warnaAksen },
        create: { key: "warnaAksen", value: warnaAksen },
      }),
    ]);

    // Halaman publik disajikan dari cache ISR — tanpa ini, warna baru
    // baru terlihat setelah cache masing-masing halaman kedaluwarsa
    revalidatePath("/", "layout");

    const userId = await getValidUserId();
    if (userId) {
      await logActivity({
        userId,
        action: "SETTINGS_UPDATE",
        description: `Mengubah warna situs (primer ${warnaPrimer}, aksen ${warnaAksen})`,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Gagal menyimpan pengaturan:", err);
    return NextResponse.json({ error: "Gagal menyimpan pengaturan" }, { status: 500 });
  }
}

// DELETE — kembali ke warna bawaan LinkProMedia
export async function DELETE() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  if (!bolehMengatur(role)) {
    return NextResponse.json({ error: "Hanya admin yang dapat mengubah pengaturan situs" }, { status: 403 });
  }

  try {
    await prisma.siteSetting.deleteMany({
      where: { key: { in: ["warnaPrimer", "warnaAksen"] } },
    });
    revalidatePath("/", "layout");

    const userId = await getValidUserId();
    if (userId) {
      await logActivity({
        userId,
        action: "SETTINGS_UPDATE",
        description: "Mengembalikan warna situs ke bawaan",
      });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Gagal mengembalikan pengaturan" }, { status: 500 });
  }
}
