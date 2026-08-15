"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Category } from "@/types";
import { ambilBahanDraf } from "@/lib/draftHandoff";
import { sanitizeHtml } from "@/lib/sanitize";

interface Draft {
  title: string;
  excerpt: string;
  content: string;
  perluDiverifikasi: string[];
}

const JENIS_BAHAN = [
  { nilai: "siaran-pers", label: "Siaran pers", contoh: "Rilis resmi dari instansi/perusahaan" },
  { nilai: "catatan-lapangan", label: "Catatan lapangan", contoh: "Hasil liputan & wawancara wartawan" },
  { nilai: "data", label: "Data / angka", contoh: "Skor, kurs, statistik, laporan keuangan" },
  { nilai: "dokumen", label: "Dokumen resmi", contoh: "Laporan, putusan, peraturan" },
  { nilai: "kutipan-media", label: "Kutipan media lain", contoh: "Rangkuman pemberitaan media lain (wajib atribusi)" },
];

export default function TulisAiClient({ categories }: { categories: Category[] }) {
  const [jenis, setJenis] = useState("catatan-lapangan");
  const [bahan, setBahan] = useState("");
  const [arahan, setArahan] = useState("");
  const [categoryId, setCategoryId] = useState("");

  const [draf, setDraf] = useState<Draft | null>(null);
  const [menyusun, setMenyusun] = useState(false);
  const [menyimpan, setMenyimpan] = useState(false);
  const [error, setError] = useState("");

  const router = useRouter();
  const cukupBahan = bahan.trim().length >= 250;

  // Terisi otomatis kalau halaman ini dibuka dari tombol "Buatkan draf
  // artikel" di ChatBot — bahan hasil riset sudah disusun di sana, di sini
  // tinggal ditinjau dan ditekan "Susun Draf" seperti alur manual biasa
  useEffect(() => {
    const kiriman = ambilBahanDraf();
    if (!kiriman) return;
    setBahan(kiriman.bahan);
    setJenis(kiriman.jenis);
    if (kiriman.arahan) setArahan(kiriman.arahan);
  }, []);

  async function susunDraf() {
    setMenyusun(true);
    setError("");
    setDraf(null);
    try {
      const res = await fetch("/api/admin/ai/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bahan, jenis, arahan }),
      });
      const data = await res.json();
      if (res.ok) setDraf(data.draf);
      else setError(data.error ?? "Gagal menyusun draf.");
    } catch {
      setError("Terjadi kesalahan jaringan.");
    } finally {
      setMenyusun(false);
    }
  }

  async function simpanDraf() {
    if (!draf || !categoryId) return;
    setMenyimpan(true);
    setError("");
    try {
      const res = await fetch("/api/admin/artikel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: draf.title,
          excerpt: draf.excerpt,
          content: draf.content,
          categoryId,
          status: "DRAFT", // Draf AI tidak pernah langsung terbit
        }),
      });
      const artikel = await res.json();

      if (!res.ok) {
        setError(artikel.error ?? "Gagal menyimpan draf.");
        return;
      }

      // Tinggalkan jejak audit: siapa pun yang membuka artikel ini nanti tahu
      // draf awalnya dibuat AI dan apa saja yang masih perlu dicek
      const catatan = [
        "Draf awal artikel ini disusun AI dari bahan yang ditempel redaksi.",
        "Seluruh fakta wajib diverifikasi sebelum diterbitkan.",
        draf.perluDiverifikasi.length
          ? `\nPerlu dicek:\n${draf.perluDiverifikasi.map((v) => `- ${v}`).join("\n")}`
          : "",
      ].join(" ");

      await fetch(`/api/admin/artikel/${artikel.id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: catatan }),
      }).catch(() => {});

      router.push(`/admin/artikel/${artikel.id}`);
      router.refresh();
    } catch {
      setError("Terjadi kesalahan jaringan.");
    } finally {
      setMenyimpan(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Peringatan pemakaian */}
      <div className="bg-accent/10 border border-accent/30 rounded-xl p-4 text-sm">
        <p className="font-semibold text-accent-text mb-1">AI menulis dari bahanmu, bukan dari pengetahuannya</p>
        <p className="text-gray-600 text-xs leading-relaxed">
          AI tidak tahu peristiwa yang sedang terjadi dan tidak bisa menghubungi narasumber. Ia hanya
          menyusun ulang fakta yang kamu tempel di bawah. Hasilnya selalu berupa draf yang wajib kamu
          verifikasi sebelum terbit.
        </p>
      </div>

      {error && (
        <div role="alert" className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Bahan */}
      <div className="bg-white border border-divider rounded-xl p-5 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Jenis bahan</label>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            {JENIS_BAHAN.map((j) => (
              <button
                key={j.nilai}
                type="button"
                onClick={() => setJenis(j.nilai)}
                className={`text-left px-3 py-2 rounded-lg border text-xs transition-colors ${
                  jenis === j.nilai
                    ? "border-primary-500 bg-primary-50 text-primary-700"
                    : "border-gray-200 text-gray-600 hover:border-primary-300"
                }`}
              >
                <span className="font-medium block">{j.label}</span>
                <span className="text-gray-400">{j.contoh}</span>
              </button>
            ))}
          </div>

          {jenis === "kutipan-media" && (
            <p className="mt-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              Bahan ini cuma judul & cuplikan singkat dari media lain — bukan liputan sendiri. Draf yang
              dihasilkan WAJIB kamu verifikasi dan lengkapi dengan liputan/konfirmasi independen sebelum
              diterbitkan sebagai berita LinkProMedia.
            </p>
          )}
        </div>

        <div>
          <label htmlFor="bahan" className="block text-sm font-medium text-gray-700 mb-1.5">
            Bahan mentah <span className="text-red-500">*</span>
          </label>
          <textarea
            id="bahan"
            value={bahan}
            onChange={(e) => setBahan(e.target.value)}
            rows={12}
            placeholder="Tempel siaran pers, catatan liputan, transkrip wawancara, atau data di sini..."
            className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-y leading-relaxed"
          />
          <p className={`text-xs mt-1 ${cukupBahan ? "text-gray-400" : "text-accent-text"}`}>
            {bahan.trim().length} karakter
            {!cukupBahan && " — minimal 250 karakter agar AI punya cukup fakta"}
          </p>
        </div>

        <div>
          <label htmlFor="arahan" className="block text-sm font-medium text-gray-700 mb-1.5">
            Arahan redaksi <span className="text-gray-400 text-xs font-normal">(opsional)</span>
          </label>
          <input
            id="arahan"
            type="text"
            value={arahan}
            onChange={(e) => setArahan(e.target.value)}
            placeholder="Misal: tekankan dampaknya ke pelaku UMKM"
            className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <button
          type="button"
          onClick={susunDraf}
          disabled={menyusun || !cukupBahan}
          className="w-full bg-primary-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors disabled:opacity-50"
        >
          {menyusun ? "Menyusun draf..." : "Susun Draf Artikel"}
        </button>
      </div>

      {/* Hasil draf */}
      {draf && (
        <div className="bg-white border border-divider rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-heading">Hasil Draf</h2>

          <div>
            <p className="text-xs text-gray-400 mb-1">Judul</p>
            <p className="text-lg font-bold text-heading">{draf.title}</p>
          </div>

          {draf.excerpt && (
            <div>
              <p className="text-xs text-gray-400 mb-1">Ringkasan</p>
              <p className="text-sm text-gray-600">{draf.excerpt}</p>
            </div>
          )}

          <div>
            <p className="text-xs text-gray-400 mb-1">Isi</p>
            <div
              className="article-content border border-gray-100 rounded-lg p-3 max-h-72 overflow-y-auto"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(draf.content) }}
            />
          </div>

          {draf.perluDiverifikasi.length > 0 && (
            <div className="bg-accent/10 border border-accent/30 rounded-lg p-3">
              <p className="text-xs font-semibold text-accent-text mb-1.5">
                Perlu kamu verifikasi sebelum terbit
              </p>
              <ul className="space-y-1">
                {draf.perluDiverifikasi.map((v, i) => (
                  <li key={i} className="text-xs text-gray-600 flex gap-2">
                    <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-accent" />
                    {v}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="pt-3 border-t border-gray-100 space-y-3">
            <div>
              <label htmlFor="kategori" className="block text-xs font-medium text-gray-600 mb-1.5">
                Kategori <span className="text-red-500">*</span>
              </label>
              <select
                id="kategori"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
              >
                <option value="">-- Pilih Kategori --</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={simpanDraf}
              disabled={menyimpan || !categoryId}
              className="w-full bg-primary-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors disabled:opacity-50"
            >
              {menyimpan ? "Menyimpan..." : "Simpan sebagai Draf & Lanjut Sunting"}
            </button>
            <p className="text-xs text-gray-400 text-center">
              Disimpan sebagai draf — tidak langsung terbit.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
