"use client";

import { useState, useRef, useEffect } from "react";
import type { NaskahVideo } from "@/lib/videoScript";
import { renderVideo, browserMendukungVideo } from "@/lib/videoRenderer";

interface Props {
  title: string;
  content: string;
  thumbnailUrl?: string;
  namaKategori?: string;
  /** Untuk memberi nama berkas unduhan */
  slug?: string;
}

type Tahap = "kosong" | "menyusun" | "siap" | "merender";

/**
 * AI Video Article — panel redaksi.
 *
 * Alurnya sengaja dua langkah (susun naskah → render), bukan sekali tekan:
 * teks adegan WAJIB bisa disunting sebelum jadi video. Video yang sudah
 * terlanjur diunggah ke media sosial tidak bisa "ditarik dan diperbaiki"
 * semudah artikel, jadi tinjauan manusia harus terjadi sebelum render, bukan
 * sesudah.
 */
export default function VideoPanel({ title, content, thumbnailUrl, namaKategori, slug }: Props) {
  const [tahap, setTahap] = useState<Tahap>("kosong");
  const [naskah, setNaskah] = useState<NaskahVideo | null>(null);
  const [progres, setProgres] = useState(0);
  const [error, setError] = useState("");
  const [urlVideo, setUrlVideo] = useState<string | null>(null);
  const [ekstensi, setEkstensi] = useState<"mp4" | "webm">("mp4");
  const [didukung, setDidukung] = useState(true);
  const pembatal = useRef<AbortController | null>(null);

  useEffect(() => {
    setDidukung(browserMendukungVideo());
  }, []);

  // URL objek video menahan berkas di memori sampai dilepas — tanpa ini,
  // merender berulang kali membuat memori tab terus membengkak
  useEffect(() => {
    return () => {
      if (urlVideo) URL.revokeObjectURL(urlVideo);
    };
  }, [urlVideo]);

  async function susunNaskah() {
    setTahap("menyusun");
    setError("");
    try {
      const res = await fetch("/api/admin/ai/video-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Gagal menyusun naskah video.");
        setTahap("kosong");
        return;
      }
      setNaskah(data.naskah);
      setTahap("siap");
    } catch {
      setError("Terjadi kesalahan jaringan.");
      setTahap("kosong");
    }
  }

  function ubahAdegan(i: number, teks: string) {
    if (!naskah) return;
    const adegan = naskah.adegan.map((a, idx) => (idx === i ? { ...a, teks } : a));
    setNaskah({ ...naskah, adegan });
  }

  function hapusAdegan(i: number) {
    if (!naskah || naskah.adegan.length <= 1) return;
    const adegan = naskah.adegan.filter((_, idx) => idx !== i);
    setNaskah({
      ...naskah,
      adegan,
      totalDetik: adegan.reduce((t, a) => t + a.detik, 0),
    });
  }

  async function buatVideo() {
    if (!naskah) return;
    setTahap("merender");
    setProgres(0);
    setError("");
    if (urlVideo) {
      URL.revokeObjectURL(urlVideo);
      setUrlVideo(null);
    }

    const kendali = new AbortController();
    pembatal.current = kendali;

    try {
      const hasil = await renderVideo({
        naskah,
        urlGambar: thumbnailUrl || null,
        namaKategori,
        onProgres: setProgres,
        sinyalBatal: kendali.signal,
      });
      setUrlVideo(URL.createObjectURL(hasil.blob));
      setEkstensi(hasil.ekstensi);
      setTahap("siap");
    } catch (e) {
      const err = e as Error;
      if (err.name !== "AbortError") {
        setError(err.message || "Gagal membuat video.");
      }
      setTahap("siap");
    } finally {
      pembatal.current = null;
    }
  }

  const kontenCukup = content.replace(/<[^>]+>/g, " ").trim().length >= 250;
  const perkiraanDetik = naskah ? naskah.adegan.reduce((t, a) => t + a.detik, 0) + 3 : 0;

  if (!didukung) {
    return (
      <div className="bg-white border border-gray-100 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-1">Video Artikel</h3>
        <p className="text-xs text-text-muted">
          Browser ini belum mendukung pembuatan video. Coba lewat Chrome atau Edge versi terbaru.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-1 flex items-center gap-1.5">
        <svg className="w-4 h-4 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
        Video Artikel
      </h3>
      <p className="text-xs text-text-muted mb-3">
        Ubah artikel jadi video vertikal 9:16 untuk Reels, TikTok, atau Shorts. Tanpa narasi suara —
        teksnya tampil di layar.
      </p>

      {error && <p className="text-xs text-red-500 mb-2">{error}</p>}

      {tahap === "kosong" && (
        <>
          <button
            type="button"
            onClick={susunNaskah}
            disabled={!kontenCukup}
            className="w-full bg-primary-600 text-white py-2 rounded-lg text-xs font-medium hover:bg-primary-700 transition-colors disabled:opacity-50"
          >
            Susun Naskah Video
          </button>
          {!kontenCukup && (
            <p className="text-xs text-text-muted mt-1.5">
              Isi artikelnya dulu — minimal beberapa paragraf.
            </p>
          )}
        </>
      )}

      {tahap === "menyusun" && <p className="text-xs text-text-muted">Menyusun naskah...</p>}

      {naskah && (tahap === "siap" || tahap === "merender") && (
        <div className="space-y-3">
          <div>
            <p className="text-xs font-medium text-gray-600 mb-1">Pembuka</p>
            <p className="text-xs text-gray-700 bg-gray-50 rounded-lg px-2.5 py-2">{naskah.hook}</p>
          </div>

          <div>
            <p className="text-xs font-medium text-gray-600 mb-1">
              Adegan{" "}
              <span className="text-text-muted font-normal">
                (bisa disunting — perkiraan {perkiraanDetik} detik)
              </span>
            </p>
            <ul className="space-y-1.5">
              {naskah.adegan.map((a, i) => (
                <li key={i} className="flex gap-1.5 items-start">
                  <span className="text-xs text-text-muted mt-2 w-4 flex-shrink-0">{i + 1}.</span>
                  <textarea
                    value={a.teks}
                    onChange={(e) => ubahAdegan(i, e.target.value)}
                    disabled={tahap === "merender"}
                    rows={2}
                    className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-60"
                  />
                  {naskah.adegan.length > 1 && (
                    <button
                      type="button"
                      onClick={() => hapusAdegan(i)}
                      disabled={tahap === "merender"}
                      aria-label={`Hapus adegan ${i + 1}`}
                      className="text-xs text-red-400 hover:text-red-600 mt-2 disabled:opacity-40"
                    >
                      ×
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {tahap === "merender" ? (
            <div>
              <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                <span>Merender video... {progres}%</span>
                <button
                  type="button"
                  onClick={() => pembatal.current?.abort()}
                  className="text-red-500 hover:text-red-600"
                >
                  Batalkan
                </button>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary-600 transition-[width] duration-200"
                  style={{ width: `${progres}%` }}
                />
              </div>
              {/* Harapan waktu diberi tahu di muka: perekaman browser memang
                  berjalan real-time, jadi tanpa keterangan ini redaksi akan
                  mengira prosesnya menggantung */}
              <p className="text-xs text-text-muted mt-1.5">
                Butuh waktu sepanjang videonya (~{perkiraanDetik} detik). Biarkan tab ini terbuka.
              </p>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={buatVideo}
                className="flex-1 bg-primary-600 text-white py-2 rounded-lg text-xs font-medium hover:bg-primary-700 transition-colors"
              >
                {urlVideo ? "Render Ulang" : "Buat Video"}
              </button>
              <button
                type="button"
                onClick={susunNaskah}
                className="px-3 py-2 rounded-lg text-xs font-medium border border-gray-200 text-gray-600 hover:border-primary-300 transition-colors"
              >
                Naskah Baru
              </button>
            </div>
          )}

          {urlVideo && tahap !== "merender" && (
            <div className="pt-3 border-t border-gray-100">
              <video
                src={urlVideo}
                controls
                className="w-full max-w-[180px] mx-auto rounded-lg bg-black"
              />
              <a
                href={urlVideo}
                download={`${slug || "video-artikel"}.${ekstensi}`}
                className="mt-2 block text-center bg-primary-600 text-white py-2 rounded-lg text-xs font-medium hover:bg-primary-700 transition-colors"
              >
                Unduh Video
              </a>
              <p className="text-xs text-text-muted mt-1.5 text-center">
                Video tidak tersimpan otomatis — unduh dulu sebelum menutup halaman.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
