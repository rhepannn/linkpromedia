import type { NaskahVideo } from "@/lib/videoScript";

/**
 * AI Video Article — tahap 2: merakit naskah adegan jadi berkas video.
 *
 * Dikerjakan SEPENUHNYA di browser lewat canvas + MediaRecorder. Tidak ada
 * ffmpeg, tidak ada server render, tidak ada layanan berbayar.
 *
 * Dua hal yang menentukan cara kerja modul ini, keduanya hasil pengujian
 * nyata dan bukan pilihan gaya:
 *
 * 1. Gambar digerakkan setInterval, BUKAN requestAnimationFrame.
 *    requestAnimationFrame berhenti total begitu tab tidak terlihat, jadi
 *    perekaman akan menggantung selamanya kalau redaksi pindah tab.
 *
 * 2. Perekaman berjalan REAL-TIME. MediaRecorder memberi cap waktu pada tiap
 *    frame saat frame itu ditangkap, jadi menggambar secepat mungkin justru
 *    menghasilkan video yang durasinya kacau. Video 15 detik memang perlu
 *    15 detik untuk direkam — ini batasan MediaRecorder, bukan kelambatan
 *    yang bisa dioptimalkan.
 */

/** 9:16 — rasio yang diminta Instagram Reels, TikTok, dan YouTube Shorts */
export const LEBAR = 1080;
export const TINGGI = 1920;
const FPS = 25;

/** Warna merek, disalin dari token di globals.css */
const NAVY = "#0C447C";
const NAVY_GELAP = "#071f3a";
const KUNING = "#F0A400";

export interface OpsiRender {
  naskah: NaskahVideo;
  /** Thumbnail artikel sebagai latar. Boleh kosong — ada latar cadangan. */
  urlGambar?: string | null;
  namaKategori?: string;
  onProgres?: (persen: number) => void;
  sinyalBatal?: AbortSignal;
}

export interface HasilRender {
  blob: Blob;
  ekstensi: "mp4" | "webm";
  detik: number;
}

/** Format terbaik yang didukung browser ini */
function pilihMime(): { mime: string; ekstensi: "mp4" | "webm" } | null {
  if (typeof MediaRecorder === "undefined") return null;
  const kandidat: { mime: string; ekstensi: "mp4" | "webm" }[] = [
    { mime: "video/mp4", ekstensi: "mp4" },
    { mime: "video/webm;codecs=vp9", ekstensi: "webm" },
    { mime: "video/webm;codecs=vp8", ekstensi: "webm" },
    { mime: "video/webm", ekstensi: "webm" },
  ];
  return kandidat.find((k) => MediaRecorder.isTypeSupported(k.mime)) ?? null;
}

export function browserMendukungVideo(): boolean {
  return (
    typeof document !== "undefined" &&
    typeof HTMLCanvasElement.prototype.captureStream === "function" &&
    pilihMime() !== null
  );
}

/**
 * Memuat gambar latar. Gambar lintas-domain TANPA header CORS akan "mencemari"
 * canvas, dan begitu tercemar seluruh perekaman gagal dengan SecurityError —
 * bukan sekadar gambarnya tidak tampil. Karena itu kegagalan apa pun di sini
 * dijawab null, dan render lanjut memakai latar gradasi merek.
 */
function muatGambar(url: string): Promise<HTMLImageElement | null> {
  return new Promise((selesai) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    let sudah = false;
    const jawab = (hasil: HTMLImageElement | null) => {
      if (!sudah) {
        sudah = true;
        selesai(hasil);
      }
    };
    img.onload = () => jawab(img);
    img.onerror = () => jawab(null);
    // Jangan menggantung kalau servernya diam
    setTimeout(() => jawab(null), 8000);
    img.src = url;
  });
}

/** Membungkus teks agar muat di lebar tertentu — canvas tidak punya ini bawaan */
function bungkusTeks(ctx: CanvasRenderingContext2D, teks: string, maksLebar: number): string[] {
  const kata = teks.split(/\s+/);
  const baris: string[] = [];
  let sekarang = "";
  for (const k of kata) {
    const coba = sekarang ? `${sekarang} ${k}` : k;
    if (ctx.measureText(coba).width > maksLebar && sekarang) {
      baris.push(sekarang);
      sekarang = k;
    } else {
      sekarang = coba;
    }
  }
  if (sekarang) baris.push(sekarang);
  return baris;
}

function gambarLatar(
  ctx: CanvasRenderingContext2D,
  gambar: HTMLImageElement | null,
  majuTotal: number
) {
  if (gambar) {
    // Ken Burns: gambar diperbesar perlahan sepanjang video supaya tidak
    // terasa seperti slide diam
    const zoom = 1.06 + majuTotal * 0.1;
    const rasioGambar = gambar.width / gambar.height;
    const rasioKanvas = LEBAR / TINGGI;
    let w: number, h: number;
    if (rasioGambar > rasioKanvas) {
      h = TINGGI * zoom;
      w = h * rasioGambar;
    } else {
      w = LEBAR * zoom;
      h = w / rasioGambar;
    }
    ctx.drawImage(gambar, (LEBAR - w) / 2, (TINGGI - h) / 2, w, h);

    // Lapisan gelap supaya teks putih tetap terbaca di atas foto apa pun
    const lapis = ctx.createLinearGradient(0, 0, 0, TINGGI);
    lapis.addColorStop(0, "rgba(7,31,58,0.82)");
    lapis.addColorStop(0.5, "rgba(7,31,58,0.62)");
    lapis.addColorStop(1, "rgba(7,31,58,0.92)");
    ctx.fillStyle = lapis;
    ctx.fillRect(0, 0, LEBAR, TINGGI);
  } else {
    const g = ctx.createLinearGradient(0, 0, LEBAR, TINGGI);
    g.addColorStop(0, NAVY);
    g.addColorStop(1, NAVY_GELAP);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, LEBAR, TINGGI);
  }
}

/** Bilah kemajuan bergaya "stories" — satu ruas per adegan */
function gambarRuasKemajuan(
  ctx: CanvasRenderingContext2D,
  jumlah: number,
  indeksAktif: number,
  majuAdegan: number
) {
  const margin = 48;
  const jarak = 10;
  const lebarRuas = (LEBAR - margin * 2 - jarak * (jumlah - 1)) / jumlah;
  const y = 56;
  for (let i = 0; i < jumlah; i++) {
    const x = margin + i * (lebarRuas + jarak);
    ctx.fillStyle = "rgba(255,255,255,0.28)";
    ctx.fillRect(x, y, lebarRuas, 6);
    const isi = i < indeksAktif ? 1 : i === indeksAktif ? majuAdegan : 0;
    if (isi > 0) {
      ctx.fillStyle = KUNING;
      ctx.fillRect(x, y, lebarRuas * isi, 6);
    }
  }
}

function gambarAdegan(
  ctx: CanvasRenderingContext2D,
  teks: string,
  opasitas: number,
  geser: number
) {
  const maksLebar = LEBAR - 200;
  ctx.font = `bold 82px system-ui, -apple-system, "Segoe UI", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const baris = bungkusTeks(ctx, teks, maksLebar);
  const tinggiBaris = 104;
  const mulaiY = TINGGI / 2 - ((baris.length - 1) * tinggiBaris) / 2 + geser;

  ctx.save();
  ctx.globalAlpha = opasitas;
  // Bayangan menjaga teks tetap terbaca di atas bagian foto yang terang
  ctx.shadowColor = "rgba(0,0,0,0.55)";
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 4;
  ctx.fillStyle = "#ffffff";
  baris.forEach((b, i) => ctx.fillText(b, LEBAR / 2, mulaiY + i * tinggiBaris));
  ctx.restore();
}

function gambarMerek(
  ctx: CanvasRenderingContext2D,
  logo: HTMLImageElement | null,
  kategori?: string
) {
  const y = TINGGI - 120;
  if (logo) {
    const h = 56;
    const w = (logo.width / logo.height) * h;
    ctx.drawImage(logo, 64, y - h / 2, w, h);
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.font = "bold 40px system-ui, sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.fillText("LinkProMedia", 64 + w + 18, y);
  } else {
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.font = "bold 40px system-ui, sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.fillText("LinkProMedia", 64, y);
  }

  if (kategori) {
    ctx.textAlign = "right";
    ctx.font = "600 34px system-ui, sans-serif";
    ctx.fillStyle = KUNING;
    ctx.fillText(kategori.toUpperCase(), LEBAR - 64, y);
  }
}

export async function renderVideo(opsi: OpsiRender): Promise<HasilRender> {
  const pilihan = pilihMime();
  if (!pilihan) throw new Error("Browser ini tidak mendukung perekaman video.");

  const { naskah, urlGambar, namaKategori, onProgres, sinyalBatal } = opsi;

  // Hook ditampilkan sebagai adegan pembuka, sedikit lebih lama karena ia
  // yang menentukan penonton lanjut menonton atau menggulir lewat
  const adeganPenuh = [{ teks: naskah.hook, detik: 3 }, ...naskah.adegan];
  const totalDetik = adeganPenuh.reduce((t, a) => t + a.detik, 0);
  const totalFrame = Math.round(totalDetik * FPS);

  const [gambar, logo] = await Promise.all([
    urlGambar ? muatGambar(urlGambar) : Promise.resolve(null),
    muatGambar("/logo-mark.png"),
  ]);

  const kanvas = document.createElement("canvas");
  kanvas.width = LEBAR;
  kanvas.height = TINGGI;
  const ctx = kanvas.getContext("2d");
  if (!ctx) throw new Error("Gagal menyiapkan canvas.");

  // captureStream(0): frame hanya diambil saat kita panggil requestFrame(),
  // jadi hasilnya tidak bergantung pada layar yang sedang menggambar
  const stream = kanvas.captureStream(0);
  const track = stream.getVideoTracks()[0] as CanvasCaptureMediaStreamTrack;
  const perekam = new MediaRecorder(stream, {
    mimeType: pilihan.mime,
    videoBitsPerSecond: 6_000_000,
  });

  const potongan: Blob[] = [];
  perekam.ondataavailable = (e) => {
    if (e.data.size > 0) potongan.push(e.data);
  };

  const selesai = new Promise<Blob>((resolve, reject) => {
    perekam.onstop = () => resolve(new Blob(potongan, { type: pilihan.mime }));
    perekam.onerror = () => reject(new Error("Perekaman video gagal di tengah jalan."));
  });

  perekam.start();

  let frame = 0;
  await new Promise<void>((resolve, reject) => {
    const timer = setInterval(() => {
      if (sinyalBatal?.aborted) {
        clearInterval(timer);
        try {
          perekam.stop();
        } catch {
          /* perekam mungkin sudah berhenti */
        }
        reject(new DOMException("Dibatalkan", "AbortError"));
        return;
      }

      const detikSekarang = frame / FPS;

      // Cari adegan yang sedang tampil pada detik ini
      let lewat = 0;
      let indeks = 0;
      for (let i = 0; i < adeganPenuh.length; i++) {
        if (detikSekarang < lewat + adeganPenuh[i].detik) {
          indeks = i;
          break;
        }
        lewat += adeganPenuh[i].detik;
        indeks = i;
      }
      const adegan = adeganPenuh[indeks];
      const majuAdegan = Math.min((detikSekarang - lewat) / adegan.detik, 1);

      // Muncul-menghilang di ujung tiap adegan supaya pergantiannya halus
      const durasiFade = 0.32;
      const detikDiAdegan = detikSekarang - lewat;
      const sisa = adegan.detik - detikDiAdegan;
      const opasitas = Math.min(
        1,
        Math.min(detikDiAdegan / durasiFade, sisa / durasiFade, 1)
      );
      const geser = (1 - Math.min(detikDiAdegan / 0.5, 1)) * 28;

      gambarLatar(ctx, gambar, frame / totalFrame);
      gambarRuasKemajuan(ctx, adeganPenuh.length, indeks, majuAdegan);
      gambarAdegan(ctx, adegan.teks, Math.max(opasitas, 0), geser);
      gambarMerek(ctx, logo, namaKategori);

      if (track.requestFrame) track.requestFrame();
      onProgres?.(Math.round((frame / totalFrame) * 100));

      if (++frame > totalFrame) {
        clearInterval(timer);
        // Beri jeda agar frame terakhir sempat masuk sebelum perekam ditutup
        setTimeout(() => {
          try {
            perekam.stop();
          } catch {
            /* sudah berhenti */
          }
          resolve();
        }, 200);
      }
    }, 1000 / FPS);
  });

  const blob = await selesai;
  onProgres?.(100);
  return { blob, ekstensi: pilihan.ekstensi, detik: totalDetik };
}
