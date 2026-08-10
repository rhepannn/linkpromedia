"use client";

import { useState } from "react";
import VideoPanel from "./VideoPanel";

interface Props {
  title: string;
  content: string;
  excerpt: string;
  thumbnailUrl: string;
  namaKategori?: string;
  slug?: string;
  onApplyThumbnail: (url: string) => void;
}

type Tab = "ilustrasi" | "video";

/**
 * Studio AI — SATU kartu untuk semua pembuatan media AI (ilustrasi thumbnail
 * + video artikel), dipisah tab. Dulu keduanya kartu terpisah di kolom kanan
 * editor dan membuatnya memanjang jauh ke bawah; permintaan pemilik: satukan.
 */
export default function MediaAiPanel({
  title,
  content,
  excerpt,
  thumbnailUrl,
  namaKategori,
  slug,
  onApplyThumbnail,
}: Props) {
  const [tab, setTab] = useState<Tab>("ilustrasi");
  // Menyimpan orientasi yang SEDANG dibuat (null = tidak ada) supaya kedua
  // tombol tahu kapan harus nonaktif dan spinner muncul di tombol yang benar
  const [membuat, setMembuat] = useState<"lanskap" | "potret" | null>(null);
  const [pesan, setPesan] = useState<{ jenis: "sukses" | "gagal"; teks: string } | null>(null);
  const [urlPotret, setUrlPotret] = useState<string | null>(null);

  async function buatIlustrasi(orientasi: "lanskap" | "potret") {
    setMembuat(orientasi);
    setPesan(null);
    try {
      const res = await fetch("/api/admin/ai/gambar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, excerpt, orientasi }),
      });
      const data = await res.json();
      if (res.ok && data.url) {
        if (orientasi === "lanskap") {
          onApplyThumbnail(data.url);
          setPesan({ jenis: "sukses", teks: "Jadi! Ilustrasi sudah dipasang sebagai thumbnail." });
        } else {
          setUrlPotret(data.url);
          setPesan({
            jenis: "sukses",
            teks: "Versi potret 4:5 tersimpan di Media Library — siap dipakai untuk Instagram/medsos.",
          });
        }
      } else {
        setPesan({ jenis: "gagal", teks: data.error ?? "Gagal membuat ilustrasi." });
      }
    } catch {
      setPesan({ jenis: "gagal", teks: "Terjadi kesalahan jaringan." });
    } finally {
      setMembuat(null);
    }
  }

  const judulKurang = title.trim().length < 10;

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-1 flex items-center gap-1.5">
        <svg className="w-4 h-4 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
        </svg>
        Studio AI
      </h3>
      <p className="text-xs text-text-muted mb-3">
        Buat ilustrasi thumbnail atau video artikel — keduanya dari isi tulisanmu.
      </p>

      {/* Tab */}
      <div className="flex gap-1 mb-3 bg-gray-50 rounded-lg p-1">
        {(
          [
            { id: "ilustrasi", label: "Ilustrasi" },
            { id: "video", label: "Video" },
          ] as { id: Tab; label: string }[]
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            aria-pressed={tab === t.id}
            className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-colors ${
              tab === t.id
                ? "bg-white text-primary-600 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "ilustrasi" ? (
        <div>
          <button
            type="button"
            onClick={() => buatIlustrasi("lanskap")}
            disabled={membuat !== null || judulKurang}
            className="w-full bg-primary-600 text-white py-2 rounded-lg text-xs font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
          >
            {membuat === "lanskap" ? (
              <>
                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Membuat ilustrasi... (~20 dtk)
              </>
            ) : (
              "Buat Ilustrasi Thumbnail"
            )}
          </button>

          <button
            type="button"
            onClick={() => buatIlustrasi("potret")}
            disabled={membuat !== null || judulKurang}
            className="w-full mt-1.5 py-2 rounded-lg text-xs font-medium border border-gray-200 text-gray-600 hover:border-primary-300 transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
          >
            {membuat === "potret" ? (
              <>
                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Membuat versi potret... (~20 dtk)
              </>
            ) : (
              "Buat Versi Potret 4:5 (medsos)"
            )}
          </button>

          {urlPotret && (
            <a
              href={urlPotret}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-xs text-primary-600 hover:underline mt-1.5"
            >
              Lihat versi potret →
            </a>
          )}

          {judulKurang && !membuat && (
            <p className="text-xs text-text-muted mt-1.5">
              Isi judul dulu (minimal 10 karakter) — ilustrasi dibuat dari judul.
            </p>
          )}

          {pesan && (
            <p
              role="status"
              className={`text-xs mt-1.5 ${pesan.jenis === "sukses" ? "text-green-700" : "text-red-500"}`}
            >
              {pesan.teks}
            </p>
          )}

          {thumbnailUrl.includes("ai-ilustrasi-") && (
            <p className="text-xs text-accent-text mt-1.5">
              Thumbnail saat ini ilustrasi buatan AI, bukan foto peristiwa — pastikan pembaca
              tidak terkecoh mengiranya dokumentasi asli.
            </p>
          )}

          <p className="text-xs text-text-muted mt-2">
            Semua hasil tersimpan di Media Library. Versi thumbnail otomatis terpasang;
            versi potret untuk diunggah ke media sosial.
          </p>
        </div>
      ) : (
        <VideoPanel
          tanpaKartu
          title={title}
          content={content}
          thumbnailUrl={thumbnailUrl}
          namaKategori={namaKategori}
          slug={slug}
        />
      )}
    </div>
  );
}
