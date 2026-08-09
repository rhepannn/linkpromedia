"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import type { Category, ArticleStatus } from "@/types";
import { ambilDraftSiapIsi } from "@/lib/draftHandoff";
import RichTextEditor from "./RichTextEditor";
import ArticleRevisions from "./ArticleRevisions";
import MediaPicker from "./MediaPicker";
import EditorialNotes from "./EditorialNotes";
import ReviewPanel from "./ReviewPanel";
import VideoPanel from "./VideoPanel";
import TranslationPanel from "./TranslationPanel";

interface InitialData {
  id?: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  categoryId: string;
  status: ArticleStatus;
  thumbnailUrl: string;
  isBreaking: boolean;
  isEditorsPick: boolean;
  scheduledAt: string;
  previewToken?: string | null;
  metaTitle: string;
  metaDescription: string;
  tags: string[];
  aiSummary: string[];
  /** Diisi bila artikel ini sendiri adalah hasil terjemahan dari artikel lain */
  translationOfId?: string | null;
}

interface Props {
  categories: Category[];
  initialData?: InitialData;
  /** Peran pengguna — menentukan status apa saja yang boleh dipilih */
  role: "ADMIN" | "EDITOR" | "AUTHOR";
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export default function ArticleForm({ categories, initialData, role }: Props) {
  const bisaTerbitkan = role === "ADMIN" || role === "EDITOR";
  const isEdit = !!initialData?.id;
  const router = useRouter();

  const [title, setTitle] = useState(initialData?.title ?? "");
  const [slug, setSlug] = useState(initialData?.slug ?? "");
  const [excerpt, setExcerpt] = useState(initialData?.excerpt ?? "");
  const [content, setContent] = useState(initialData?.content ?? "");
  const [categoryId, setCategoryId] = useState(initialData?.categoryId ?? "");
  const [status, setStatus] = useState<ArticleStatus>(
    initialData?.status ?? "DRAFT"
  );
  const [scheduledAt, setScheduledAt] = useState(initialData?.scheduledAt ?? "");
  const [thumbnailUrl, setThumbnailUrl] = useState(initialData?.thumbnailUrl ?? "");
  const [isBreaking, setIsBreaking] = useState(initialData?.isBreaking ?? false);
  const [isEditorsPick, setIsEditorsPick] = useState(initialData?.isEditorsPick ?? false);
  const [metaTitle, setMetaTitle] = useState(initialData?.metaTitle ?? "");
  const [metaDescription, setMetaDescription] = useState(initialData?.metaDescription ?? "");
  const [tags, setTags] = useState<string[]>(initialData?.tags ?? []);
  const [aiSummary, setAiSummary] = useState<string[]>(initialData?.aiSummary ?? []);
  // Menandai redaksi sengaja menghapus Inti Berita, supaya server tidak membuatkan ulang
  const [summaryCleared, setSummaryCleared] = useState(false);
  const [copiedPreview, setCopiedPreview] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [membuatIlustrasi, setMembuatIlustrasi] = useState(false);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Hal yang perlu diverifikasi dari draf AI (kalau form ini dibuka dari
  // tombol "Buatkan draf artikel" di ChatBot) — dicatat sebagai catatan
  // redaksi begitu artikel pertama kali disimpan, lihat handleSubmit
  const [draftPerluDiverifikasi, setDraftPerluDiverifikasi] = useState<string[]>([]);
  // Nama kategori yang dipilihkan AI — dipakai untuk memberi tahu penulis
  // bahwa kolom itu terisi otomatis, bukan pilihannya sendiri
  const [kategoriDariAi, setKategoriDariAi] = useState("");

  // Form artikel baru diisi otomatis kalau dibuka dari ChatBot. Sengaja
  // hanya untuk artikel baru (bukan saat menyunting artikel yang sudah ada),
  // supaya data hasil edit yang sedang berjalan tidak pernah tertimpa diam-diam.
  useEffect(() => {
    if (isEdit) return;
    const draf = ambilDraftSiapIsi();
    if (!draf) return;
    setTitle(draf.title);
    setSlug(slugify(draf.title));
    setExcerpt(draf.excerpt);
    setContent(draf.content);
    setDraftPerluDiverifikasi(draf.perluDiverifikasi);
    // Kategori ikut terisi kalau AI cukup yakin, jadi penulis tinggal
    // meninjau dan menerbitkan tanpa memilih ulang
    if (draf.categoryId) {
      setCategoryId(draf.categoryId);
      setKategoriDariAi(draf.categoryNama ?? "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleTitleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setTitle(val);
    if (!isEdit) setSlug(slugify(val));
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, thumbnail: "Ukuran file maksimal 5MB." }));
      return;
    }

    setUploading(true);
    setErrors((prev) => ({ ...prev, thumbnail: "" }));

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/admin/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (res.ok && data.url) {
        setThumbnailUrl(data.url);
      } else {
        setErrors((prev) => ({ ...prev, thumbnail: data.error ?? "Upload gagal." }));
      }
    } catch {
      setErrors((prev) => ({ ...prev, thumbnail: "Terjadi kesalahan saat upload." }));
    } finally {
      setUploading(false);
    }
  }

  async function buatIlustrasiAi() {
    setMembuatIlustrasi(true);
    setErrors((prev) => ({ ...prev, thumbnail: "" }));
    try {
      const res = await fetch("/api/admin/ai/gambar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, excerpt }),
      });
      const data = await res.json();
      if (res.ok && data.url) {
        setThumbnailUrl(data.url);
      } else {
        setErrors((prev) => ({ ...prev, thumbnail: data.error ?? "Gagal membuat ilustrasi." }));
      }
    } catch {
      setErrors((prev) => ({ ...prev, thumbnail: "Terjadi kesalahan jaringan." }));
    } finally {
      setMembuatIlustrasi(false);
    }
  }

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (!title.trim()) newErrors.title = "Judul wajib diisi.";
    if (!slug.trim()) newErrors.slug = "Slug wajib diisi.";
    if (!categoryId) newErrors.categoryId = "Pilih kategori.";
    if (!content.trim()) newErrors.content = "Konten artikel wajib diisi.";
    if (scheduledAt && new Date(scheduledAt).getTime() <= Date.now()) {
      newErrors.scheduledAt = "Waktu jadwal harus di masa depan.";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent, publishNow?: boolean, forceStatus?: string) {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    // Jadwal (jika diisi & valid) selalu menang atas pilihan status manual
    const isScheduling = !!scheduledAt && new Date(scheduledAt).getTime() > Date.now();
    const finalStatus = forceStatus
      ? forceStatus
      : publishNow
      ? "PUBLISHED"
      : isScheduling
      ? "SCHEDULED"
      : status;

    const payload = {
      title,
      slug,
      excerpt,
      content,
      categoryId,
      status: finalStatus,
      thumbnailUrl,
      isBreaking,
      isEditorsPick,
      metaTitle,
      metaDescription,
      tags,
      // Hanya dikirim kalau redaksi memang mengisi atau sengaja menghapusnya.
      // Kalau dibiarkan kosong, server yang membuatkan otomatis saat artikel tayang.
      ...(aiSummary.length > 0 || summaryCleared ? { aiSummary } : {}),
      scheduledAt: isScheduling ? scheduledAt : null,
    };
    const url = isEdit ? `/api/admin/artikel/${initialData!.id}` : "/api/admin/artikel";
    const method = isEdit ? "PATCH" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        // Artikel baru dari draf AI: tinggalkan jejak audit persis seperti
        // draf yang dibuat lewat Tulis dengan AI, supaya siapa pun yang
        // membuka artikel ini nanti tahu asalnya dan apa yang masih perlu dicek
        if (!isEdit && draftPerluDiverifikasi.length > 0) {
          const artikel = await res.json();
          const catatan = [
            "Draf awal artikel ini disusun AI dari rangkuman pemberitaan media lain (ChatBot).",
            "Seluruh fakta wajib diverifikasi sebelum diterbitkan.",
            `\nPerlu dicek:\n${draftPerluDiverifikasi.map((v) => `- ${v}`).join("\n")}`,
          ].join(" ");
          await fetch(`/api/admin/artikel/${artikel.id}/notes`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ body: catatan }),
          }).catch(() => {});
        }

        router.push("/admin/artikel");
        router.refresh();
      } else {
        const data = await res.json();
        setErrors({ form: data.error ?? "Gagal menyimpan artikel." });
      }
    } catch {
      setErrors({ form: "Terjadi kesalahan jaringan." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={(e) => handleSubmit(e)} className="space-y-6">
      {errors.form && (
        <div role="alert" className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
          {errors.form}
        </div>
      )}

      {/* Muncul kalau form ini diisi otomatis dari ChatBot — draf ini hasil
          rangkuman media lain, bukan liputan sendiri, jadi harus jelas
          kelihatan sebelum wartawan mulai menyunting, bukan cuma dicatat
          diam-diam setelah tersimpan */}
      {draftPerluDiverifikasi.length > 0 && (
        <div className="bg-accent/10 border border-accent/30 rounded-xl p-4">
          <p className="font-semibold text-accent-text text-sm mb-1">
            Draf ini disusun AI dari rangkuman pemberitaan media lain
          </p>
          <p className="text-gray-600 text-xs leading-relaxed mb-2">
            Bukan hasil liputan LinkProMedia sendiri. Wajib diverifikasi dan dilengkapi liputan/konfirmasi
            independen sebelum diterbitkan.
          </p>
          <ul className="space-y-1">
            {draftPerluDiverifikasi.map((v, i) => (
              <li key={i} className="text-xs text-gray-600 flex gap-2">
                <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-accent" />
                {v}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── KOLOM KIRI (konten utama) ── */}
        <div className="lg:col-span-2 space-y-5">

          {/* Judul */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1.5">
              Judul Artikel <span className="text-red-500">*</span>
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={handleTitleChange}
              placeholder="Masukkan judul berita..."
              className={`w-full border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${errors.title ? "border-red-300 bg-red-50" : "border-gray-200"}`}
            />
            {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title}</p>}
          </div>

          {/* Slug */}
          <div>
            <label htmlFor="slug" className="block text-sm font-medium text-gray-700 mb-1.5">
              Slug (URL) <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 hidden sm:inline flex-shrink-0">linkpromedia.id/berita/</span>
              <input
                id="slug"
                type="text"
                value={slug}
                onChange={(e) => setSlug(slugify(e.target.value))}
                placeholder="url-artikel-anda"
                className={`flex-1 border rounded-lg px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-500 ${errors.slug ? "border-red-300 bg-red-50" : "border-gray-200"}`}
              />
            </div>
            {errors.slug && <p className="text-xs text-red-500 mt-1">{errors.slug}</p>}
          </div>

          {/* Excerpt */}
          <div>
            <label htmlFor="excerpt" className="block text-sm font-medium text-gray-700 mb-1.5">
              Ringkasan <span className="text-gray-400 text-xs font-normal">(opsional, untuk preview & SEO)</span>
            </label>
            <textarea
              id="excerpt"
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              rows={3}
              maxLength={300}
              placeholder="Ringkasan singkat artikel (maks. 300 karakter)..."
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            />
            <p className="text-xs text-gray-400 text-right mt-0.5">{excerpt.length}/300</p>
          </div>

          {/* Konten */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Konten Artikel <span className="text-red-500">*</span>
            </label>

            <RichTextEditor content={content} onChange={setContent} error={!!errors.content} />

            {errors.content && <p className="text-xs text-red-500 mt-1">{errors.content}</p>}
          </div>
        </div>

        {/* ── KOLOM KANAN (metadata) ── */}
        <div className="space-y-5">

          {/* Video hanya relevan untuk artikel yang isinya sudah ada, jadi
              panelnya sendiri yang menahan tombolnya sampai konten cukup */}
          <VideoPanel
            title={title}
            content={content}
            thumbnailUrl={thumbnailUrl}
            namaKategori={categories.find((c) => c.id === categoryId)?.name}
            slug={slug}
          />

          {/* Status & aksi */}
          <div className="bg-white border border-gray-100 rounded-xl p-4 space-y-4">
            <h3 className="text-sm font-semibold text-gray-700">Publikasi</h3>

            <div>
              <label htmlFor="status" className="block text-xs font-medium text-gray-600 mb-1.5">Status</label>
              <select
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value as ArticleStatus)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
              >
                <option value="DRAFT">Draft</option>
                <option value="IN_REVIEW">Diajukan ke editor</option>
                {bisaTerbitkan && <option value="PUBLISHED">Terbit</option>}
                {bisaTerbitkan && <option value="ARCHIVED">Arsip</option>}
                {status === "SCHEDULED" && <option value="SCHEDULED">Terjadwal</option>}
              </select>
              {!bisaTerbitkan && (
                <p className="text-xs text-gray-400 mt-1">
                  Sebagai penulis, artikelmu perlu ditinjau editor sebelum terbit.
                </p>
              )}
            </div>

            <div>
              <label htmlFor="scheduledAt" className="block text-xs font-medium text-gray-600 mb-1.5">
                Jadwalkan publikasi <span className="text-gray-400 font-normal">(opsional)</span>
              </label>
              <input
                id="scheduledAt"
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${errors.scheduledAt ? "border-red-300 bg-red-50" : "border-gray-200"}`}
              />
              {errors.scheduledAt ? (
                <p className="text-xs text-red-500 mt-1">{errors.scheduledAt}</p>
              ) : (
                <p className="text-xs text-gray-400 mt-1">
                  Isi untuk terbit otomatis pada waktu tertentu. Mengabaikan pilihan status di atas.
                </p>
              )}
            </div>

            <div className="space-y-2 pt-1 border-t border-gray-100">
              <label className="flex items-center gap-2 pt-3 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isBreaking}
                  onChange={(e) => setIsBreaking(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                Tandai sebagai <span className="font-semibold text-accent-text">Breaking News</span>
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isEditorsPick}
                  onChange={(e) => setIsEditorsPick(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                Tampilkan di <span className="font-semibold">Editor&apos;s Pick</span>
              </label>
            </div>

            {isEdit && initialData?.previewToken && (
              <div className="pt-3 border-t border-gray-100">
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Link Preview</label>
                <div className="flex gap-2">
                  <input
                    readOnly
                    value={`/berita/preview/${initialData.previewToken}`}
                    className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-gray-50 text-gray-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(
                        `${window.location.origin}/berita/preview/${initialData.previewToken}`
                      );
                      setCopiedPreview(true);
                      setTimeout(() => setCopiedPreview(false), 1500);
                    }}
                    className="text-xs border border-gray-200 px-2.5 rounded-lg text-gray-600 hover:bg-gray-50 flex-shrink-0"
                  >
                    {copiedPreview ? "Tersalin!" : "Salin"}
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Lihat hasil akhir artikel (termasuk draft) sebelum diterbitkan.
                </p>
              </div>
            )}

            <div className="flex flex-col gap-2 pt-1">
              <button
                type="submit"
                disabled={saving}
                className="w-full bg-primary-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {saving ? (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : null}
                {saving ? "Menyimpan..." : isEdit ? "Simpan Perubahan" : "Simpan Artikel"}
              </button>

              {!isEdit && bisaTerbitkan && (
                <button
                  type="button"
                  disabled={saving}
                  onClick={(e) => handleSubmit(e, true)}
                  className="w-full border border-primary-600 text-primary-600 py-2 rounded-lg text-sm font-medium hover:bg-primary-50 transition-colors disabled:opacity-60"
                >
                  Simpan & Terbitkan
                </button>
              )}

              {!bisaTerbitkan && status !== "IN_REVIEW" && (
                <button
                  type="button"
                  disabled={saving}
                  onClick={(e) => {
                    setStatus("IN_REVIEW");
                    handleSubmit(e, false, "IN_REVIEW");
                  }}
                  className="w-full border border-primary-600 text-primary-600 py-2 rounded-lg text-sm font-medium hover:bg-primary-50 transition-colors disabled:opacity-60"
                >
                  Ajukan ke Editor
                </button>
              )}

              <button
                type="button"
                onClick={() => router.back()}
                className="w-full text-gray-500 py-2 rounded-lg text-sm hover:text-gray-700 transition-colors"
              >
                Batal
              </button>
            </div>
          </div>

          {/* Kategori */}
          <div className="bg-white border border-gray-100 rounded-xl p-4">
            <label htmlFor="categoryId" className="block text-sm font-semibold text-gray-700 mb-3">
              Kategori <span className="text-red-500">*</span>
            </label>
            <select
              id="categoryId"
              value={categoryId}
              onChange={(e) => {
                setCategoryId(e.target.value);
                // Begitu penulis memilih sendiri, penanda "dipilih AI" tidak
                // relevan lagi — pilihannya sekarang miliknya
                setKategoriDariAi("");
              }}
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white ${errors.categoryId ? "border-red-300" : "border-gray-200"}`}
            >
              <option value="">-- Pilih Kategori --</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
            {kategoriDariAi && (
              <p className="text-xs text-text-muted mt-1.5">
                Dipilihkan AI berdasarkan isi draf. Ganti kalau kurang tepat.
              </p>
            )}
            {errors.categoryId && <p className="text-xs text-red-500 mt-1">{errors.categoryId}</p>}
          </div>

          {/* Inti Berita — hanya saat MENYUNTING artikel yang sudah ada.
              Waktu membuat artikel baru, panel ini cuma bikin kerja dua kali:
              Inti Berita dibuat otomatis saat artikel terbit, dan kalau mau
              dibuat lebih dulu tinggal minta lewat ChatBot. Di halaman edit
              panel ini tetap dipertahankan karena ini satu-satunya tempat
              untuk melihat dan menghapus Inti Berita artikel yang sudah tayang. */}
          {isEdit && (
            <div className="bg-white border border-gray-100 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">
                Inti Berita <span className="text-gray-400 font-normal text-xs">(tampil ke pembaca)</span>
              </h3>
              {aiSummary.length === 0 ? (
                <p className="text-xs text-text-muted">
                  Belum ada. Dibuat otomatis saat artikel terbit, atau minta &ldquo;Buat Inti Berita&rdquo;
                  lewat ChatBot di atas.
                </p>
              ) : (
                <>
                  <ul className="text-xs text-gray-700 space-y-1.5">
                    {aiSummary.map((p, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-primary-600" />
                        {p}
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    onClick={() => {
                      setAiSummary([]);
                      setSummaryCleared(true);
                    }}
                    className="mt-2 text-xs text-red-500 hover:text-red-600"
                  >
                    Hapus inti berita
                  </button>
                </>
              )}
            </div>
          )}

          {/* SEO */}
          <div className="bg-white border border-gray-100 rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">Metadata SEO</h3>
            <div>
              <label htmlFor="metaTitle" className="block text-xs font-medium text-gray-600 mb-1.5">
                Meta Title <span className="text-gray-400 font-normal">({metaTitle.length}/60)</span>
              </label>
              <input
                id="metaTitle"
                type="text"
                value={metaTitle}
                onChange={(e) => setMetaTitle(e.target.value)}
                maxLength={70}
                placeholder="Kosongkan untuk pakai judul artikel"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label htmlFor="metaDescription" className="block text-xs font-medium text-gray-600 mb-1.5">
                Meta Description <span className="text-gray-400 font-normal">({metaDescription.length}/160)</span>
              </label>
              <textarea
                id="metaDescription"
                value={metaDescription}
                onChange={(e) => setMetaDescription(e.target.value)}
                maxLength={200}
                rows={3}
                placeholder="Kosongkan untuk pakai ringkasan artikel"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
              />
            </div>
          </div>

          {/* Tags */}
          <div className="bg-white border border-gray-100 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Tag</h3>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {tags.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 text-xs bg-primary-50 text-primary-600 px-2 py-1 rounded-full"
                  >
                    {t}
                    <button
                      type="button"
                      onClick={() => setTags(tags.filter((x) => x !== t))}
                      className="hover:text-primary-800"
                      aria-label={`Hapus tag ${t}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
            <input
              type="text"
              placeholder="Ketik tag lalu tekan Enter..."
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  const val = e.currentTarget.value.trim().toLowerCase();
                  if (val && !tags.includes(val)) setTags([...tags, val]);
                  e.currentTarget.value = "";
                }
              }}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Thumbnail */}
          <div className="bg-white border border-gray-100 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Thumbnail</h3>

            {/* Preview */}
            {thumbnailUrl && (
              <div className="relative aspect-video rounded-lg overflow-hidden bg-gray-100 mb-3">
                {/* unoptimized: editor bisa menempel URL dari domain mana pun,
                    jadi tidak bisa dibatasi ke daftar remotePatterns */}
                <Image
                  src={thumbnailUrl}
                  alt="Preview thumbnail"
                  fill
                  unoptimized
                  sizes="400px"
                  className="object-cover"
                />
                <button
                  type="button"
                  onClick={() => setThumbnailUrl("")}
                  className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1 hover:bg-black/80 transition-colors"
                  aria-label="Hapus thumbnail"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}

            <label
              htmlFor="thumbnail-upload"
              className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-lg p-4 cursor-pointer transition-colors ${uploading ? "border-primary-300 bg-primary-50" : "border-gray-200 hover:border-primary-300 hover:bg-primary-50"}`}
            >
              {uploading ? (
                <svg className="w-5 h-5 text-primary-500 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              )}
              <span className="text-xs text-gray-500 text-center">
                {uploading ? "Mengupload..." : "Klik untuk upload gambar\nJPG, PNG, WebP — maks 5MB"}
              </span>
              <input
                id="thumbnail-upload"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleImageUpload}
                className="sr-only"
                disabled={uploading}
              />
            </label>

            <button
              type="button"
              onClick={() => setShowMediaPicker(true)}
              className="w-full mt-2 text-xs border border-gray-200 text-gray-600 py-2 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Pilih dari Media Library
            </button>

            <button
              type="button"
              onClick={buatIlustrasiAi}
              disabled={membuatIlustrasi || title.trim().length < 10}
              className="w-full mt-2 text-xs border border-primary-200 text-primary-600 py-2 rounded-lg hover:bg-primary-50 transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
            >
              {membuatIlustrasi ? (
                <>
                  <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Membuat ilustrasi... (~20 dtk)
                </>
              ) : (
                "Buat Ilustrasi AI dari judul"
              )}
            </button>
            {title.trim().length < 10 && !membuatIlustrasi && (
              <p className="text-xs text-text-muted mt-1">
                Isi judul dulu — ilustrasi dibuat dari judul artikel.
              </p>
            )}
            {thumbnailUrl.includes("ai-ilustrasi-") && (
              <p className="text-xs text-accent-text mt-1.5">
                Ini ilustrasi buatan AI, bukan foto peristiwa — pastikan pembaca tidak
                terkecoh mengiranya dokumentasi asli.
              </p>
            )}

            {/* URL manual */}
            <div className="mt-3">
              <input
                type="url"
                value={thumbnailUrl}
                onChange={(e) => setThumbnailUrl(e.target.value)}
                placeholder="Atau tempel URL gambar..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            {errors.thumbnail && <p className="text-xs text-red-500 mt-1">{errors.thumbnail}</p>}
          </div>

          {/* Update Langsung (artikel live) */}

          {/* Terjemahan — hanya untuk artikel asli, bukan artikel hasil terjemahan */}
          {isEdit && initialData?.id && !initialData?.translationOfId && (
            <TranslationPanel articleId={initialData.id} />
          )}

          {/* Riwayat Revisi */}
          {/* Keputusan editor atas artikel yang diajukan penulis */}
          {isEdit && initialData?.id && status === "IN_REVIEW" && bisaTerbitkan && (
            <ReviewPanel articleId={initialData.id} />
          )}

          {/* Diskusi internal redaksi */}
          {isEdit && initialData?.id && <EditorialNotes articleId={initialData.id} />}

          {isEdit && initialData?.id && <ArticleRevisions articleId={initialData.id} />}
        </div>
      </div>

      {showMediaPicker && (
        <MediaPicker
          onSelect={(url) => {
            setThumbnailUrl(url);
            setShowMediaPicker(false);
          }}
          onClose={() => setShowMediaPicker(false)}
        />
      )}
    </form>
  );
}
