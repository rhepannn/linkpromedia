"use client";

import { useMemo, useRef, useState } from "react";

interface Titik {
  date: string;
  views: number;
}

interface Props {
  data: Titik[];
}

const W = 1000;
const H = 220;
const PAD_KIRI = 40;
const PAD_KANAN = 4;
const PAD_ATAS = 14;
const PAD_BAWAH = 28;

/** Bulatkan ke atas ke angka rapi (5, 10, 20, 25, 50, 100, ...) untuk sumbu Y */
function bulatkanKeAtas(nilai: number): number {
  if (nilai <= 5) return 5;
  const magnitud = 10 ** Math.floor(Math.log10(nilai));
  const langkah = [1, 2, 2.5, 5, 10];
  for (const l of langkah) {
    const kandidat = l * magnitud;
    if (kandidat >= nilai) return Math.ceil(kandidat);
  }
  return Math.ceil(nilai / magnitud) * magnitud;
}

function formatTanggal(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

/**
 * Grafik kunjungan harian — area + garis SVG, tanpa pustaka chart eksternal.
 *
 * Warnanya sengaja pakai `currentColor` lewat kelas `text-primary-600`, bukan
 * hex langsung: kelas itu sudah punya versi tema gelap teruji (#6899cf,
 * kontras 5,57 di atas kartu gelap) dari audit sebelumnya. Warna baku merek
 * (`--color-primary-600`) TIDAK diterangkan untuk tema gelap secara sengaja
 * (identitas warna tidak boleh berubah), jadi memakainya langsung di sini
 * akan menghasilkan garis gelap-di-atas-gelap yang nyaris tak terlihat.
 */
export default function DailyViewsChart({ data }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<number | null>(null);

  const semuaKosong = data.every((d) => d.views === 0);

  const { pathGaris, pathArea, titik, tickY } = useMemo(() => {
    const maxAsli = Math.max(...data.map((d) => d.views), 0);
    const maxY = bulatkanKeAtas(maxAsli || 1);
    const lebar = W - PAD_KIRI - PAD_KANAN;
    const tinggi = H - PAD_ATAS - PAD_BAWAH;
    const stepX = data.length > 1 ? lebar / (data.length - 1) : 0;

    const pts = data.map((d, i) => ({
      x: PAD_KIRI + i * stepX,
      y: PAD_ATAS + tinggi - (d.views / maxY) * tinggi,
      ...d,
    }));

    const garis = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
    const dasar = PAD_ATAS + tinggi;
    const area = pts.length
      ? `${garis} L${pts[pts.length - 1].x.toFixed(1)},${dasar} L${pts[0].x.toFixed(1)},${dasar} Z`
      : "";

    return { pathGaris: garis, pathArea: area, titik: pts, tickY: [0, maxY / 2, maxY] };
  }, [data]);

  function posisiDariKlien(clientX: number): number | null {
    const svg = svgRef.current;
    if (!svg || titik.length === 0) return null;
    const rect = svg.getBoundingClientRect();
    const xViewBox = ((clientX - rect.left) / rect.width) * W;
    let terdekat = 0;
    let jarakMin = Infinity;
    titik.forEach((p, i) => {
      const jarak = Math.abs(p.x - xViewBox);
      if (jarak < jarakMin) {
        jarakMin = jarak;
        terdekat = i;
      }
    });
    return terdekat;
  }

  if (data.length === 0 || semuaKosong) {
    return (
      <div className="h-[180px] flex items-center justify-center">
        <p className="text-sm text-text-muted">Belum ada kunjungan tercatat pada periode ini.</p>
      </div>
    );
  }

  const aktif = hover !== null ? titik[hover] : null;
  const terakhir = titik[titik.length - 1];

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-[180px] text-primary-600 touch-none"
        preserveAspectRatio="none"
        role="img"
        aria-label={`Grafik kunjungan harian, dari ${formatTanggal(data[0].date)} sampai ${formatTanggal(
          data[data.length - 1].date
        )}, puncaknya ${Math.max(...data.map((d) => d.views))} kunjungan`}
        tabIndex={0}
        onPointerMove={(e) => setHover(posisiDariKlien(e.clientX))}
        onPointerLeave={() => setHover(null)}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") setHover((h) => Math.min((h ?? -1) + 1, titik.length - 1));
          if (e.key === "ArrowLeft") setHover((h) => Math.max((h ?? titik.length) - 1, 0));
          if (e.key === "Escape") setHover(null);
        }}
      >
        <defs>
          <linearGradient id="isianKunjungan" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.16" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Sumbu bantu — hairline, warna satu langkah dari latar, tidak putus-putus */}
        {tickY.map((t, i) => {
          const y = PAD_ATAS + (H - PAD_ATAS - PAD_BAWAH) * (1 - t / (tickY[2] || 1));
          return (
            <g key={i}>
              <line
                x1={PAD_KIRI}
                x2={W - PAD_KANAN}
                y1={y}
                y2={y}
                stroke="var(--color-divider)"
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />
              <text x={0} y={y + 4} fontSize={11} fill="var(--color-text-muted)">
                {Math.round(t).toLocaleString("id-ID")}
              </text>
            </g>
          );
        })}

        {/* Area wash — cuma bayangan tipis di bawah garis, bukan blok pekat */}
        <path d={pathArea} fill="url(#isianKunjungan)" />

        {/* Garis utama */}
        <path
          d={pathGaris}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />

        {/* Crosshair + titik saat disorot */}
        {aktif && (
          <line
            x1={aktif.x}
            x2={aktif.x}
            y1={PAD_ATAS}
            y2={H - PAD_BAWAH}
            stroke="var(--color-divider)"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
        )}
        {titik.map((p, i) => (
          <circle
            key={p.date}
            cx={p.x}
            cy={p.y}
            r={hover === i ? 5 : i === titik.length - 1 ? 4 : 0}
            fill="currentColor"
            stroke="var(--background)"
            strokeWidth={2}
          />
        ))}
      </svg>

      {/* Label titik terakhir — "garis -> nilai di ujung" */}
      {!aktif && (
        <div
          className="absolute text-xs font-semibold text-primary-600 pointer-events-none"
          style={{
            left: `${(terakhir.x / W) * 100}%`,
            top: `${(terakhir.y / H) * 100}%`,
            transform: "translate(-50%, -170%)",
          }}
        >
          {terakhir.views.toLocaleString("id-ID")}
        </div>
      )}

      {/* Tooltip hover — nilai jadi elemen paling menonjol, tanggal sekunder */}
      {aktif && (
        <div
          className="absolute bg-white border border-divider rounded-lg shadow-lg px-2.5 py-1.5 pointer-events-none whitespace-nowrap"
          style={{
            left: `${(aktif.x / W) * 100}%`,
            top: `${Math.max((aktif.y / H) * 100, 8)}%`,
            transform: `translate(${aktif.x / W > 0.85 ? "-100%" : aktif.x / W < 0.15 ? "0%" : "-50%"}, -130%)`,
          }}
        >
          <p className="text-sm font-bold text-heading leading-none">
            {aktif.views.toLocaleString("id-ID")}{" "}
            <span className="text-xs font-normal text-text-muted">kunjungan</span>
          </p>
          <p className="text-xs text-text-muted mt-0.5">{formatTanggal(aktif.date)}</p>
        </div>
      )}
    </div>
  );
}
