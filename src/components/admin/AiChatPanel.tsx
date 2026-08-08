"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { kirimDraftSiapIsi } from "@/lib/draftHandoff";

interface Props {
  title?: string;
  content?: string;
  articleId?: string;
  /**
   * Tombol "pakai ini" hanya muncul kalau ada artikel yang sedang dibuka.
   * Di halaman ChatBot mandiri tidak ada form tujuan, jadi semua callback
   * ini kosong dan tombolnya sengaja disembunyikan.
   */
  onApplyHeadline?: (headline: string) => void;
  onApplyExcerpt?: (text: string) => void;
  onApplyCategory?: (categoryId: string) => void;
  onApplyThumbnail?: (url: string) => void;
  onApplyBreaking?: (breaking: boolean) => void;
  onApplySeo?: (data: { metaTitle: string; metaDescription: string }) => void;
  onApplyTags?: (tags: string[]) => void;
  /** Inti Berita — poin ringkas yang tampil ke pembaca di halaman artikel */
  onApplySummary?: (points: string[]) => void;
  /** "panel" = kolom sempit di editor, "halaman" = halaman penuh /admin/chatbot */
  tampilan?: "panel" | "halaman";
  /**
   * Tautan kembali ke admin. Halaman ChatBot tidak punya sidebar/topbar,
   * jadi tanpa ini pengguna tidak punya jalan pulang selain tombol Back.
   */
  hrefKembali?: string;
}

interface Pesan {
  peran: "user" | "ai";
  teks: string;
  tipe?: string;
  hasil?: unknown;
}

/** Perintah yang butuh artikel terbuka — tidak ditawarkan di halaman mandiri */
const CONTOH_ARTIKEL = [
  "Buat alternatif judul",
  "Buat Inti Berita",
  "Buat Meta SEO",
  // Sengaja tidak "Ringkas artikel ini" — kalimat itu ambigu antara Inti
  // Berita dan tiga varian panjang, dan terbukti salah diklasifikasi
  "Ringkasan pendek/sedang/panjang",
  "Saran tag",
  "Cek tata bahasa",
  "Kategori apa yang cocok?",
  "Cek duplikasi",
  "Layak jadi breaking news?",
];

const CONTOH_RISET = [
  "Carikan berita terbaru",
  "Berita apa yang belum kita liput?",
  "Cari berita soal ekonomi",
  "Bantu susun pertanyaan wawancara",
];

export default function AiChatPanel({
  title = "",
  content = "",
  articleId,
  onApplyHeadline,
  onApplyExcerpt,
  onApplyCategory,
  onApplyThumbnail,
  onApplyBreaking,
  onApplySeo,
  onApplyTags,
  onApplySummary,
  tampilan = "panel",
  hrefKembali,
}: Props) {
  const halaman = tampilan === "halaman";
  const [pesanList, setPesanList] = useState<Pesan[]>([]);
  const [input, setInput] = useState("");
  const [mengirim, setMengirim] = useState(false);
  const bawahRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bawahRef.current?.scrollIntoView({ behavior: "smooth" });
    // "mengirim" ikut jadi dependency supaya gelembung "sedang mengetik"
    // langsung ikut tergulung ke pandangan, bukan menunggu balasan tiba
  }, [pesanList, mengirim]);

  async function kirim(teksOverride?: string) {
    const teks = (teksOverride ?? input).trim();
    if (!teks || mengirim) return;

    setPesanList((prev) => [...prev, { peran: "user", teks }]);
    setInput("");
    setMengirim(true);

    try {
      const res = await fetch("/api/admin/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pesan: teks,
          title,
          content,
          articleId,
          // "mandiri" memberi tahu server tidak ada editor di halaman ini,
          // supaya pesan "isi konten dulu" tidak menyesatkan
          mandiri: halaman,
          // Riwayat dikirim supaya obrolan nyambung antar pesan. Hanya teks
          // yang dikirim — hasil alat berbentuk struktur tidak perlu diulang
          // ke model dan hanya memboroskan token.
          riwayat: pesanList.map((p) => ({ peran: p.peran, teks: p.teks })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPesanList((prev) => [...prev, { peran: "ai", teks: data.error ?? "Terjadi kesalahan." }]);
        return;
      }
      setPesanList((prev) => [...prev, { peran: "ai", teks: data.balasan, tipe: data.tipe, hasil: data.hasil }]);
    } catch {
      setPesanList((prev) => [...prev, { peran: "ai", teks: "Terjadi kesalahan jaringan." }]);
    } finally {
      setMengirim(false);
    }
  }

  const contoh = halaman ? CONTOH_RISET : [...CONTOH_RISET.slice(0, 2), ...CONTOH_ARTIKEL];
  const teksIsi = halaman ? "text-sm" : "text-xs";

  return (
    <div
      className={
        halaman
          ? "bg-white flex flex-col h-full overflow-hidden"
          : "bg-white border border-gray-100 rounded-xl p-4"
      }
    >
      {/* Garis pemisah dibuat selebar layar, sementara isinya dibatasi di
          tengah supaya baris teks tidak melebar sampai sulit dibaca */}
      <div className={halaman ? "border-b border-gray-100 flex-shrink-0" : ""}>
      <div
        className={
          halaman ? "w-full max-w-4xl mx-auto px-6 pt-5 pb-4 flex items-start justify-between gap-4" : ""
        }
      >
        <div>
        <h3
          className={`font-semibold text-gray-700 mb-1 flex items-center gap-1.5 ${
            halaman ? "text-base" : "text-sm"
          }`}
        >
          <svg
            className={`text-primary-600 ${halaman ? "w-5 h-5" : "w-4 h-4"}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          AI Newsroom Assistant
        </h3>
        <p className={`text-gray-400 ${halaman ? "text-xs" : "text-xs mb-3"}`}>
          {halaman
            ? "Tanya apa saja, atau minta dicarikan berita yang sedang ramai di media lain. Untuk alat bantu artikel, buka artikelnya di editor."
            : "Minta bantuan dengan bahasa sehari-hari. Semua saran perlu kamu setujui dulu."}
        </p>
        </div>

        {halaman && hrefKembali && (
          <Link
            href={hrefKembali}
            className="flex-shrink-0 inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-primary-600 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Kembali ke Admin
          </Link>
        )}
      </div>
      </div>

      <div className={halaman ? "flex-1 min-h-0 overflow-y-auto" : ""}>
      <div className={halaman ? "w-full max-w-4xl mx-auto px-6 py-5" : ""}>
        {pesanList.length === 0 && (
          <div className={`flex flex-wrap gap-1.5 ${halaman ? "" : "mb-3"}`}>
            {contoh.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => kirim(c)}
                className={`bg-gray-50 text-gray-600 rounded-full hover:bg-gray-100 transition-colors ${
                  halaman ? "text-sm px-3.5 py-1.5" : "text-xs px-2.5 py-1"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        )}

        {pesanList.length > 0 && (
          <div className={`space-y-3 ${halaman ? "" : "max-h-96 overflow-y-auto mb-3 pr-1"}`}>
            {pesanList.map((p, i) => (
              <div key={i} className={p.peran === "user" ? "flex justify-end" : "flex justify-start"}>
                <div className={p.peran === "user" ? "max-w-[85%]" : "max-w-full w-full"}>
                  {/* whitespace-pre-wrap: jawaban bebas sering berparagraf
                      dan berpoin, jadi baris barunya harus ikut tampil */}
                  <div
                    className={
                      p.peran === "user"
                        ? `bg-primary-600 text-white rounded-lg rounded-br-sm px-3 py-2 inline-block whitespace-pre-wrap ${teksIsi}`
                        : `bg-gray-50 text-gray-700 rounded-lg rounded-bl-sm px-3 py-2 whitespace-pre-wrap leading-relaxed ${teksIsi}`
                    }
                  >
                    {p.teks}
                  </div>
                  {p.peran === "ai" && p.hasil !== undefined && (
                    <div className="mt-2">
                      <HasilRenderer
                        tipe={p.tipe}
                        hasil={p.hasil}
                        halaman={halaman}
                        onApplyHeadline={onApplyHeadline}
                        onApplyExcerpt={onApplyExcerpt}
                        onApplyCategory={onApplyCategory}
                        onApplyThumbnail={onApplyThumbnail}
                        onApplyBreaking={onApplyBreaking}
                        onApplySeo={onApplySeo}
                        onApplyTags={onApplyTags}
                        onApplySummary={onApplySummary}
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
            {mengirim && (
              <div className="flex justify-start">
                <IndikatorMengetik />
              </div>
            )}
            <div ref={bawahRef} />
          </div>
        )}
      </div>
      </div>

      <div className={halaman ? "border-t border-gray-100 flex-shrink-0" : ""}>
      <div className={`flex gap-2 ${halaman ? "w-full max-w-4xl mx-auto px-6 py-4" : ""}`}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              kirim();
            }
          }}
          placeholder="Tanya atau minta bantuan AI..."
          disabled={mengirim}
          className={`flex-1 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 ${
            halaman ? "px-4 py-2.5 text-sm" : "px-3 py-2 text-xs"
          }`}
        />
        <button
          type="button"
          onClick={() => kirim()}
          disabled={mengirim || !input.trim()}
          className={`bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 ${
            halaman ? "px-5 py-2.5 text-sm" : "px-3 py-2 text-xs"
          }`}
        >
          Kirim
        </button>
      </div>
      </div>
    </div>
  );
}

/**
 * Gelembung "sedang mengetik" — tiga titik yang berdenyut bergantian,
 * dibungkus gelembung yang sama seperti pesan AI biasa supaya terasa
 * seperti kelanjutan percakapan, bukan status loading generik yang
 * terlepas dari alurnya.
 *
 * Kurang-gerak (prefers-reduced-motion) sudah ditangani secara global di
 * globals.css — animasinya otomatis dipercepat jadi nyaris statis di sana,
 * jadi tidak perlu penanganan khusus di sini.
 */
function IndikatorMengetik() {
  return (
    <div className="bg-gray-50 rounded-lg rounded-bl-sm px-3.5 py-3 inline-flex items-center gap-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  );
}

const applyClass = "text-xs text-primary-600 hover:text-primary-700 font-medium";

function HasilRenderer({
  tipe,
  hasil,
  halaman,
  onApplyHeadline,
  onApplyExcerpt,
  onApplyCategory,
  onApplyThumbnail,
  onApplyBreaking,
  onApplySeo,
  onApplyTags,
  onApplySummary,
}: {
  tipe?: string;
  hasil: unknown;
  halaman: boolean;
} & Omit<Props, "title" | "content" | "articleId" | "tampilan">) {
  /** Ukuran teks isi & keterangan menyesuaikan lebar ruang yang tersedia */
  const isi = halaman ? "text-sm" : "text-xs";
  const ket = halaman ? "text-xs" : "text-[10px]";
  const router = useRouter();
  // Indeks topik yang sedang disusunkan drafnya (news-discovery) — hanya
  // satu yang bisa berjalan sekaligus per pesan, cukup satu state lokal
  const [menyusunIndeks, setMenyusunIndeks] = useState<number | null>(null);
  const [errorDraf, setErrorDraf] = useState("");

  if (tipe === "headlines") {
    const opsi = hasil as { headline: string; gaya: string }[];
    if (!opsi?.length) return <p className={`text-gray-400 ${isi}`}>Tidak ada saran.</p>;
    return (
      <ul className="space-y-1.5">
        {opsi.map((o, i) => (
          <li key={i} className="bg-white border border-gray-100 rounded-lg p-2">
            <p className={`text-gray-700 ${isi}`}>{o.headline}</p>
            <div className="flex items-center justify-between mt-1">
              <span className={`text-gray-400 ${ket}`}>{o.gaya}</span>
              {onApplyHeadline && (
                <button type="button" onClick={() => onApplyHeadline(o.headline)} className={applyClass}>
                  Pakai judul ini →
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    );
  }

  if (tipe === "seo") {
    const seo = hasil as { metaTitle: string; metaDescription: string } | null;
    if (!seo?.metaTitle)
      return <p className={`text-gray-400 ${isi}`}>Konten terlalu pendek untuk membuat metadata SEO.</p>;
    return (
      <div className="bg-white border border-gray-100 rounded-lg p-2 space-y-1">
        <p className={`text-gray-700 ${isi}`}><strong>Meta Title:</strong> {seo.metaTitle}</p>
        <p className={`text-gray-700 ${isi}`}><strong>Meta Description:</strong> {seo.metaDescription}</p>
        {onApplySeo && (
          <button type="button" onClick={() => onApplySeo(seo)} className={applyClass}>
            Terapkan ke artikel →
          </button>
        )}
      </div>
    );
  }

  if (tipe === "summary") {
    const poin = hasil as string[];
    if (!poin?.length) return <p className={`text-gray-400 ${isi}`}>Konten terlalu pendek untuk diringkas.</p>;
    return (
      <div className="bg-white border border-gray-100 rounded-lg p-2">
        <ul className={`text-gray-700 space-y-1 list-disc list-inside ${isi}`}>
          {poin.map((p, i) => (
            <li key={i}>{p}</li>
          ))}
        </ul>
        {onApplySummary && (
          <button type="button" onClick={() => onApplySummary(poin)} className={`${applyClass} mt-2`}>
            Tampilkan di halaman artikel →
          </button>
        )}
      </div>
    );
  }

  if (tipe === "summary-variants") {
    const v = hasil as { pendek: string; sedang: string; panjang: string } | null;
    if (!v) return <p className={`text-gray-400 ${isi}`}>Konten terlalu pendek untuk diringkas.</p>;
    return (
      <div className="space-y-1.5">
        {(["pendek", "sedang", "panjang"] as const).map((k) => (
          <div key={k} className="bg-white border border-gray-100 rounded-lg p-2">
            <p className={`text-gray-400 uppercase mb-0.5 ${ket}`}>{k}</p>
            <p className={`text-gray-700 ${isi}`}>{v[k]}</p>
            {onApplyExcerpt && (
              <button type="button" onClick={() => onApplyExcerpt(v[k])} className={`${applyClass} mt-1`}>
                Pakai sebagai ringkasan →
              </button>
            )}
          </div>
        ))}
      </div>
    );
  }

  if (tipe === "tags") {
    const tags = hasil as string[];
    if (!tags?.length) return <p className={`text-gray-400 ${isi}`}>Tidak ada saran tag.</p>;
    return (
      <div className="flex flex-wrap gap-1.5">
        {tags.map((t) =>
          onApplyTags ? (
            <button
              key={t}
              type="button"
              onClick={() => onApplyTags([t])}
              className={`bg-white border border-gray-100 text-gray-600 px-2 py-1 rounded-full hover:border-primary-300 hover:text-primary-600 transition-colors ${isi}`}
            >
              + {t}
            </button>
          ) : (
            <span
              key={t}
              className={`bg-white border border-gray-100 text-gray-600 px-2 py-1 rounded-full ${isi}`}
            >
              {t}
            </span>
          )
        )}
      </div>
    );
  }

  if (tipe === "grammar") {
    const isu = hasil as { excerpt: string; suggestion: string; reason: string }[];
    if (!isu?.length) return <p className={`text-green-600 ${isi}`}>Tidak ditemukan masalah tata bahasa.</p>;
    return (
      <ul className="space-y-1.5">
        {isu.map((x, i) => (
          <li key={i} className="bg-white border border-gray-100 rounded-lg p-2">
            <p className={`text-gray-700 line-through decoration-red-300 ${isi}`}>{x.excerpt}</p>
            <p className={`text-gray-700 mt-0.5 ${isi}`}>→ {x.suggestion}</p>
            <p className={`text-gray-400 mt-0.5 ${ket}`}>{x.reason}</p>
          </li>
        ))}
      </ul>
    );
  }

  if (tipe === "category") {
    const saran = hasil as { id: string; nama: string; alasan: string; yakin: number }[];
    if (!saran?.length) return <p className={`text-gray-400 ${isi}`}>Tidak ada saran kategori.</p>;
    return (
      <ul className="space-y-1.5">
        {saran.map((s, i) => (
          <li key={i} className="bg-white border border-gray-100 rounded-lg p-2">
            <div className="flex items-center justify-between">
              <span className={`font-medium text-gray-700 ${isi}`}>{s.nama}</span>
              <span className={`text-gray-400 ${ket}`}>{s.yakin}%</span>
            </div>
            <p className={`text-gray-400 mt-0.5 ${ket}`}>{s.alasan}</p>
            {onApplyCategory && (
              <button type="button" onClick={() => onApplyCategory(s.id)} className={`${applyClass} mt-1`}>
                Pakai kategori ini →
              </button>
            )}
          </li>
        ))}
      </ul>
    );
  }

  if (tipe === "internal-links") {
    const links = hasil as { slug: string; judul: string; frasa: string; alasan: string }[];
    if (!links?.length) return <p className={`text-gray-400 ${isi}`}>Tidak ada saran tautan internal.</p>;
    return (
      <ul className="space-y-1.5">
        {links.map((l) => (
          <li key={l.slug} className="bg-white border border-gray-100 rounded-lg p-2">
            <p className={`text-gray-700 ${isi}`}>{l.judul}</p>
            <p className={`text-gray-400 mt-0.5 ${ket}`}>Tautkan frasa &ldquo;{l.frasa}&rdquo; — {l.alasan}</p>
            <a href={`/berita/${l.slug}`} target="_blank" rel="noreferrer" className={`${applyClass} mt-1 inline-block`}>
              Lihat artikelnya →
            </a>
          </li>
        ))}
      </ul>
    );
  }

  if (tipe === "duplicates") {
    const matches = hasil as { slug: string; judul: string; kemiripan: number; alasan: string }[];
    if (!matches?.length)
      return <p className={`text-green-600 ${isi}`}>Tidak ditemukan artikel lain yang membahas peristiwa sama.</p>;
    return (
      <ul className="space-y-1.5">
        {matches.map((m) => (
          <li key={m.slug} className="bg-red-50 border border-red-100 rounded-lg p-2">
            <div className="flex items-center justify-between">
              <span className={`font-medium text-gray-700 ${isi}`}>{m.judul}</span>
              <span className={`text-red-600 font-semibold ${ket}`}>{m.kemiripan}% mirip</span>
            </div>
            <p className={`text-gray-500 mt-0.5 ${ket}`}>{m.alasan}</p>
            <a href={`/berita/${m.slug}`} target="_blank" rel="noreferrer" className={`${applyClass} mt-1 inline-block`}>
              Bandingkan artikelnya →
            </a>
          </li>
        ))}
      </ul>
    );
  }

  if (tipe === "thumbnail") {
    const t = hasil as { media: { url: string; filename: string; alasan: string }[]; kataKunci: string[] } | null;
    if (!t) return <p className={`text-gray-400 ${isi}`}>Gagal menyarankan thumbnail.</p>;
    return (
      <div>
        {t.media.length > 0 ? (
          <ul className="space-y-1.5 mb-2">
            {t.media.map((m) => (
              <li key={m.url} className="flex gap-2 bg-white border border-gray-100 rounded-lg p-2">
                <Image src={m.url} alt="" width={48} height={48} className="w-12 h-12 object-cover rounded flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className={`text-gray-500 ${ket}`}>{m.alasan}</p>
                  {onApplyThumbnail && (
                    <button type="button" onClick={() => onApplyThumbnail(m.url)} className={`${applyClass} mt-0.5`}>
                      Pakai gambar ini →
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className={`text-gray-400 mb-1.5 ${isi}`}>Belum ada gambar cocok di Media Library.</p>
        )}
        {t.kataKunci.length > 0 && (
          <p className={`text-gray-400 ${ket}`}>Kata kunci pencarian: {t.kataKunci.join(", ")}</p>
        )}
      </div>
    );
  }

  if (tipe === "breaking") {
    const b = hasil as { layak: boolean; skor: number; alasan: string; indikator: string[] } | null;
    if (!b) return <p className={`text-gray-400 ${isi}`}>Gagal menilai.</p>;
    return (
      <div className={`rounded-lg p-2.5 ${b.layak ? "bg-accent/15 border border-accent/40" : "bg-white border border-gray-100"}`}>
        <div className="flex items-center justify-between mb-1">
          <span className={`font-semibold ${isi} ${b.layak ? "text-accent-text" : "text-gray-600"}`}>
            {b.layak ? "Layak jadi Breaking News" : "Bukan Breaking News"}
          </span>
          <span className={`text-gray-500 ${isi}`}>skor {b.skor}/100</span>
        </div>
        <p className={`text-gray-600 ${isi}`}>{b.alasan}</p>
        {b.indikator.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {b.indikator.map((i) => (
              <span key={i} className={`bg-white/70 text-gray-600 px-2 py-0.5 rounded-full ${ket}`}>
                {i}
              </span>
            ))}
          </div>
        )}
        {b.layak && onApplyBreaking && (
          <button type="button" onClick={() => onApplyBreaking(true)} className={`${applyClass} mt-2`}>
            Tandai sebagai Breaking News →
          </button>
        )}
      </div>
    );
  }

  if (tipe === "timeline") {
    const entri = hasil as { waktu: string; peristiwa: string }[];
    if (!entri?.length)
      return (
        <p className={`text-gray-400 ${isi}`}>
          Artikel ini tidak menyebutkan penanda waktu yang jelas, jadi saya tidak bisa menyusun kronologinya.
        </p>
      );
    return (
      <ol className="space-y-2 border-l-2 border-primary-100 pl-3">
        {entri.map((e, i) => (
          <li key={i}>
            <span className={`font-semibold text-primary-600 ${isi}`}>{e.waktu}</span>
            <p className={`text-gray-700 ${isi}`}>{e.peristiwa}</p>
          </li>
        ))}
      </ol>
    );
  }

  if (tipe === "translate") {
    const t = hasil as { title: string; content: string } | null;
    if (!t) return <p className={`text-gray-400 ${isi}`}>Konten terlalu pendek untuk diterjemahkan.</p>;
    return (
      <div className="bg-white border border-gray-100 rounded-lg p-2 space-y-1">
        <p className={`font-semibold text-gray-700 ${isi}`}>{t.title}</p>
        <div
          className={`text-gray-600 [&_p]:mb-1.5 ${isi}`}
          dangerouslySetInnerHTML={{ __html: t.content }}
        />
        <p className={`text-gray-400 pt-1 ${ket}`}>
          Ini belum disimpan ke mana pun — salin manual kalau mau dijadikan artikel terpisah.
        </p>
      </div>
    );
  }

  if (tipe === "fact-check") {
    const peringatan = hasil as { jenis: string; kutipan: string; catatan: string }[];
    if (!peringatan?.length)
      return <p className={`text-green-600 ${isi}`}>Tidak ada pola mencurigakan yang saya temukan.</p>;
    const LABEL: Record<string, string> = {
      "klaim-tanpa-sumber": "Klaim tanpa sumber",
      "angka-tidak-konsisten": "Angka tidak konsisten",
      "tanggal-tidak-sesuai": "Tanggal janggal",
      "kutipan-tanpa-referensi": "Kutipan tanpa atribusi",
    };
    return (
      <div>
        <ul className="space-y-1.5">
          {peringatan.map((p, i) => (
            <li key={i} className="bg-yellow-50 border border-yellow-100 rounded-lg p-2">
              <span className={`font-semibold text-yellow-700 uppercase ${ket}`}>
                {LABEL[p.jenis] ?? p.jenis}
              </span>
              <p className={`text-gray-700 mt-0.5 ${isi}`}>&ldquo;{p.kutipan}&rdquo;</p>
              <p className={`text-gray-500 mt-0.5 ${ket}`}>{p.catatan}</p>
            </li>
          ))}
        </ul>
        <p className={`text-gray-400 mt-1.5 ${ket}`}>
          Ini cuma peringatan pola tulisan, bukan verifikasi kebenaran — tetap perlu dicek manual.
        </p>
      </div>
    );
  }

  if (tipe === "news-discovery") {
    const r = hasil as {
      topik: {
        judul: string;
        ringkasan: string;
        jumlahMedia: number;
        jumlahBerita: number;
        berita: { judul: string; sumber: string; url: string; ringkasan: string }[];
        sudahDiliput: boolean;
        artikelKita: { id: string; title: string }[];
      }[];
      jumlahSudahDiliput: number;
      totalBerita: number;
      sumberBerhasil: string[];
    } | null;
    if (!r?.topik?.length) return <p className={`text-gray-400 ${isi}`}>Tidak ada topik yang cukup ramai saat ini.</p>;

    /**
     * Menyusun draf LANGSUNG dari cuplikan RSS topik ini (jenis bahan
     * "kutipan-media" — wajib atribusi ke tiap media, lihat PANDUAN_BAHAN di
     * src/lib/ai.ts), lalu membuka form Artikel Baru dengan judul/ringkasan/
     * isi sudah terisi. Draf tidak pernah tersimpan dari sini — wartawan
     * tetap harus meninjau dan menekan "Simpan" sendiri di form seperti
     * artikel manapun.
     */
    async function buatDrafDariTopik(t: NonNullable<typeof r>["topik"][number], indeks: number) {
      setMenyusunIndeks(indeks);
      setErrorDraf("");

      const bahan = [
        `Rangkuman pemberitaan media lain soal "${t.judul}":`,
        "",
        ...t.berita.map(
          (b, i) =>
            `${i + 1}. [${b.sumber}] ${b.judul}\n   ${b.ringkasan || "(tidak ada cuplikan)"}\n   Sumber: ${b.url}`
        ),
      ].join("\n");

      try {
        const res = await fetch("/api/admin/ai/draft", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bahan, jenis: "kutipan-media", arahan: t.judul }),
        });
        const data = await res.json();
        if (!res.ok || !data.draf) {
          setErrorDraf(data.error ?? "Gagal menyusun draf dari topik ini.");
          return;
        }
        kirimDraftSiapIsi({
          ...data.draf,
          ...(data.kategori && { categoryId: data.kategori.id, categoryNama: data.kategori.nama }),
        });
        router.push("/admin/artikel/baru");
      } catch {
        setErrorDraf("Terjadi kesalahan jaringan saat menyusun draf.");
      } finally {
        setMenyusunIndeks(null);
      }
    }

    return (
      <div>
        {/* Di halaman penuh, kartu topik dijajar dua kolom supaya tidak
            memanjang ke bawah dan lebih cepat dipindai redaksi */}
        {/* items-start: tanpa ini kartu pendek ikut meregang setinggi kartu
            terpanjang di barisnya, menyisakan ruang kosong menganga di bawah
            tombol draf — jumlah berita per topik memang tidak pernah sama */}
        <ul className={halaman ? "grid gap-3 md:grid-cols-2 items-start" : "space-y-2"}>
          {r.topik.map((t, i) => (
            <li
              key={i}
              className={`rounded-lg border ${halaman ? "p-4" : "p-2.5"} ${
                t.sudahDiliput ? "bg-white border-gray-100" : "bg-accent/10 border-accent/40"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <span className={`font-semibold text-gray-700 ${halaman ? "text-base" : "text-xs"}`}>
                  {t.judul}
                </span>
                <span className={`text-gray-500 whitespace-nowrap flex-shrink-0 ${ket}`}>
                  {t.jumlahMedia} media · {t.jumlahBerita} berita
                </span>
              </div>
              <p className={`text-gray-500 mt-0.5 ${halaman ? "text-sm" : "text-[11px]"}`}>{t.ringkasan}</p>

              <p
                className={`font-medium mt-1.5 ${ket} ${
                  t.sudahDiliput ? "text-green-600" : "text-accent-text"
                }`}
              >
                {t.sudahDiliput
                  ? `Sudah kita liput: ${t.artikelKita.map((a) => a.title).join(" · ")}`
                  : "Belum kita liput"}
              </p>

              <ul className={`mt-1.5 space-y-1 ${halaman ? "mt-2.5 space-y-1.5" : ""}`}>
                {t.berita.map((b) => (
                  <li key={b.url} className={`leading-snug ${halaman ? "text-sm" : "text-[11px]"}`}>
                    <a
                      href={b.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-gray-600 hover:text-primary-600 hover:underline"
                    >
                      <span className="text-gray-400">{b.sumber}</span> — {b.judul}
                    </a>
                  </li>
                ))}
              </ul>

              <button
                type="button"
                onClick={() => buatDrafDariTopik(t, i)}
                disabled={menyusunIndeks !== null}
                className={`${applyClass} mt-2.5 inline-flex items-center gap-1 disabled:opacity-50`}
              >
                {menyusunIndeks === i ? "Menyusun draf..." : "Buatkan draf artikel dari topik ini →"}
              </button>
            </li>
          ))}
        </ul>

        {errorDraf && <p className={`text-red-600 mt-2 ${ket}`}>{errorDraf}</p>}

        <p className={`text-gray-400 mt-2 ${ket}`}>
          Dari {r.totalBerita} berita di {r.sumberBerhasil.length} sumber RSS publik
          {r.jumlahSudahDiliput > 0 && (
            <>
              {" "}
              — {r.jumlahSudahDiliput} topik ramai lain disembunyikan karena sudah kita liput
            </>
          )}
          . &ldquo;Buatkan draf&rdquo; menyusun draf awal dari cuplikan ini dengan atribusi wajib ke tiap
          media, lalu langsung mengisi form Artikel Baru — tetap harus kamu tinjau, lengkapi liputan
          sendiri, dan simpan manual.
        </p>
      </div>
    );
  }

  if (tipe === "writing") {
    const saran = hasil as { jenis: string; kutipan: string; saran: string }[];
    if (!saran?.length) return <p className={`text-green-600 ${isi}`}>Tulisannya sudah cukup baik, tidak ada masukan.</p>;
    const LABEL: Record<string, string> = {
      "kalimat-panjang": "Kalimat kepanjangan",
      "paragraf-tidak-jelas": "Paragraf kurang jelas",
      "perlu-sumber": "Perlu sumber",
      "perlu-kutipan": "Perlu kutipan narasumber",
      "perlu-data": "Perlu data pendukung",
    };
    return (
      <div>
        <ul className="space-y-1.5">
          {saran.map((s, i) => (
            <li key={i} className="bg-blue-50 border border-blue-100 rounded-lg p-2">
              <span className={`font-semibold text-blue-700 uppercase ${ket}`}>
                {LABEL[s.jenis] ?? s.jenis}
              </span>
              <p className={`text-gray-700 mt-0.5 ${isi}`}>&ldquo;{s.kutipan}&rdquo;</p>
              <p className={`text-gray-500 mt-0.5 ${ket}`}>{s.saran}</p>
            </li>
          ))}
        </ul>
        <p className={`text-gray-400 mt-1.5 ${ket}`}>
          Ini cuma penanda lokasi yang bisa diperkuat — sumber/kutipan/datanya tetap kamu yang cari.
        </p>
      </div>
    );
  }

  return null;
}
