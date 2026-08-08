import webpush from "web-push";
import { prisma } from "@/lib/prisma";

/**
 * Push Notification — mengirim kabar penting ke perangkat pembaca yang
 * sudah memberi izin.
 *
 * Dipakai HANYA untuk artikel Breaking News. Notifikasi adalah gangguan
 * langsung ke layar orang; mengirimkannya untuk setiap artikel biasa akan
 * membuat pembaca mematikan izinnya, dan izin yang sudah dicabut hampir
 * tidak pernah diberikan lagi.
 */

let sudahDikonfigurasi = false;

/** Kembalikan false bila kunci VAPID belum dipasang — fitur tinggal mati, bukan error */
function siapKirim(): boolean {
  const publik = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privat = process.env.VAPID_PRIVATE_KEY;
  if (!publik || !privat) return false;

  if (!sudahDikonfigurasi) {
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT ?? "mailto:redaksi@linkpromedia.id",
      publik,
      privat
    );
    sudahDikonfigurasi = true;
  }
  return true;
}

export interface IsiNotifikasi {
  title: string;
  body: string;
  url: string;
}

export interface HasilPengiriman {
  terkirim: number;
  gagal: number;
  dihapus: number;
}

/**
 * Kirim notifikasi ke SEMUA perangkat yang berlangganan.
 *
 * Langganan yang ditolak permanen oleh layanan push (404/410 — pembaca
 * mencopot aplikasi atau mencabut izin) langsung dihapus dari database,
 * supaya daftar tidak menumpuk alamat mati.
 */
export async function kirimNotifikasiKeSemua(isi: IsiNotifikasi): Promise<HasilPengiriman> {
  if (!siapKirim()) return { terkirim: 0, gagal: 0, dihapus: 0 };

  const daftar = await prisma.pushSubscription.findMany({
    select: { id: true, endpoint: true, p256dh: true, auth: true },
  });
  if (daftar.length === 0) return { terkirim: 0, gagal: 0, dihapus: 0 };

  const payload = JSON.stringify(isi);
  const idMati: string[] = [];
  let terkirim = 0;
  let gagal = 0;

  await Promise.all(
    daftar.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload
        );
        terkirim++;
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        // 404/410 = langganan sudah tidak berlaku permanen
        if (status === 404 || status === 410) idMati.push(s.id);
        else gagal++;
      }
    })
  );

  if (idMati.length > 0) {
    await prisma.pushSubscription.deleteMany({ where: { id: { in: idMati } } });
  }

  if (terkirim > 0) {
    await prisma.pushSubscription.updateMany({
      where: { id: { in: daftar.filter((s) => !idMati.includes(s.id)).map((s) => s.id) } },
      data: { lastSeenAt: new Date() },
    });
  }

  return { terkirim, gagal, dihapus: idMati.length };
}
