"use client";

import { useEffect, useRef, useState } from "react";
import {
  hexValid,
  susunVariabelTema,
  buatRampaPrimer,
  turunkanAksenText,
  rasioKontras,
} from "@/lib/warna";

interface Props {
  tersimpan: { warnaPrimer: string | null; warnaAksen: string | null };
}

const BAWAAN = { warnaPrimer: "#0C447C", warnaAksen: "#F0A400" };

/**
 * Pengaturan warna situs dengan pratinjau langsung.
 *
 * Pratinjaunya beranda SUNGGUHAN di dalam iframe (satu origin, jadi variabel
 * warnanya bisa disuntik langsung dari sini) — bukan mockup yang bisa
 * berbohong. Yang dilihat pemilik di pratinjau = yang akan dilihat pembaca.
 */
export default function PengaturanClient({ tersimpan }: Props) {
  const [warnaPrimer, setWarnaPrimer] = useState(tersimpan.warnaPrimer ?? BAWAAN.warnaPrimer);
  const [warnaAksen, setWarnaAksen] = useState(tersimpan.warnaAksen ?? BAWAAN.warnaAksen);
  const [menyimpan, setMenyimpan] = useState(false);
  const [pesan, setPesan] = useState<{ jenis: "sukses" | "gagal"; teks: string } | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const keduaValid = hexValid(warnaPrimer) && hexValid(warnaAksen);

  // Suntik variabel ke dokumen di dalam iframe tiap kali warna berubah
  function terapkanKePratinjau() {
    const doc = iframeRef.current?.contentDocument;
    if (!doc || !keduaValid) return;
    const vars = susunVariabelTema({ warnaPrimer, warnaAksen });
    for (const [k, v] of Object.entries(vars)) {
      doc.documentElement.style.setProperty(k, v);
    }
  }

  useEffect(() => {
    terapkanKePratinjau();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [warnaPrimer, warnaAksen]);

  // Peringatan kontras — dihitung dari rampa yang SAMA dengan yang akan
  // dipakai situs, supaya peringatannya jujur
  const peringatan: string[] = [];
  if (keduaValid) {
    const rampa = buatRampaPrimer(warnaPrimer);
    const kontrasTombol = rasioKontras("#ffffff", rampa["600"]);
    if (kontrasTombol < 4.5) {
      peringatan.push(
        `Teks putih di atas warna primer hanya ${kontrasTombol.toFixed(1)}:1 (minimal 4,5). Pilih warna yang lebih gelap.`
      );
    }
    const kontrasBadge = rasioKontras(turunkanAksenText(warnaAksen), warnaAksen);
    if (kontrasBadge < 4.5) {
      peringatan.push(
        `Badge aksen (mis. Breaking) hanya ${kontrasBadge.toFixed(1)}:1. Pilih aksen yang lebih terang.`
      );
    }
  }

  async function simpan() {
    setMenyimpan(true);
    setPesan(null);
    try {
      const res = await fetch("/api/admin/pengaturan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ warnaPrimer, warnaAksen }),
      });
      const data = await res.json();
      if (res.ok) {
        setPesan({ jenis: "sukses", teks: "Tersimpan. Warna baru tayang di seluruh situs." });
      } else {
        setPesan({ jenis: "gagal", teks: data.error ?? "Gagal menyimpan." });
      }
    } catch {
      setPesan({ jenis: "gagal", teks: "Terjadi kesalahan jaringan." });
    } finally {
      setMenyimpan(false);
    }
  }

  async function resetBawaan() {
    setMenyimpan(true);
    setPesan(null);
    try {
      const res = await fetch("/api/admin/pengaturan", { method: "DELETE" });
      if (res.ok) {
        setWarnaPrimer(BAWAAN.warnaPrimer);
        setWarnaAksen(BAWAAN.warnaAksen);
        setPesan({ jenis: "sukses", teks: "Kembali ke warna bawaan LinkProMedia." });
      } else {
        setPesan({ jenis: "gagal", teks: "Gagal mengembalikan." });
      }
    } catch {
      setPesan({ jenis: "gagal", teks: "Terjadi kesalahan jaringan." });
    } finally {
      setMenyimpan(false);
    }
  }

  function KolomWarna({
    label,
    nilai,
    onUbah,
    keterangan,
  }: {
    label: string;
    nilai: string;
    onUbah: (v: string) => void;
    keterangan: string;
  }) {
    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={hexValid(nilai) ? nilai : "#000000"}
            onChange={(e) => onUbah(e.target.value)}
            className="h-10 w-14 rounded-lg border border-gray-200 cursor-pointer bg-white p-1"
            aria-label={`Pilih ${label}`}
          />
          <input
            type="text"
            value={nilai}
            onChange={(e) => onUbah(e.target.value.trim())}
            placeholder="#0C447C"
            className={`w-28 border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-500 ${
              hexValid(nilai) ? "border-gray-200" : "border-red-300 bg-red-50"
            }`}
          />
        </div>
        <p className="text-xs text-text-muted mt-1">{keterangan}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Panel kontrol */}
      <div className="space-y-5">
        <div className="bg-white border border-divider rounded-xl p-5 space-y-5">
          <KolomWarna
            label="Warna Primer"
            nilai={warnaPrimer}
            onUbah={setWarnaPrimer}
            keterangan="Warna merek utama — header, tombol, tautan. Turunan terang-gelapnya dihitung otomatis."
          />
          <KolomWarna
            label="Warna Aksen"
            nilai={warnaAksen}
            onUbah={setWarnaAksen}
            keterangan="Penanda mendesak (badge Breaking). Sebaiknya kontras dengan warna primer."
          />

          {peringatan.length > 0 && (
            <div className="bg-accent/10 border border-accent/30 rounded-lg p-3 space-y-1">
              {peringatan.map((p, i) => (
                <p key={i} className="text-xs text-accent-text">{p}</p>
              ))}
            </div>
          )}

          {pesan && (
            <p
              role="status"
              className={`text-sm ${pesan.jenis === "sukses" ? "text-green-700" : "text-red-600"}`}
            >
              {pesan.teks}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={simpan}
              disabled={menyimpan || !keduaValid}
              className="flex-1 bg-primary-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors disabled:opacity-50"
            >
              {menyimpan ? "Menyimpan..." : "Simpan & Terapkan"}
            </button>
            <button
              type="button"
              onClick={resetBawaan}
              disabled={menyimpan}
              className="px-4 py-2.5 rounded-lg text-sm font-medium border border-gray-200 text-gray-600 hover:border-red-300 hover:text-red-600 transition-colors disabled:opacity-50"
            >
              Reset
            </button>
          </div>
        </div>

        <p className="text-xs text-text-muted leading-relaxed">
          Catatan: tema gelap memakai palet netral tersendiri yang sudah diaudit kontras — warna
          kustom terutama terlihat di tema terang, header, dan tombol.
        </p>
      </div>

      {/* Pratinjau langsung */}
      <div className="lg:col-span-2">
        <div className="bg-white border border-divider rounded-xl overflow-hidden">
          <div className="px-4 py-2.5 border-b border-divider flex items-center justify-between">
            <p className="text-xs font-medium text-gray-600">
              Pratinjau langsung — beranda sungguhan
            </p>
            <p className="text-xs text-text-muted">berubah saat kamu memilih warna</p>
          </div>
          <iframe
            ref={iframeRef}
            src="/"
            title="Pratinjau beranda dengan warna baru"
            onLoad={terapkanKePratinjau}
            className="w-full h-[70vh] border-0"
          />
        </div>
      </div>
    </div>
  );
}
