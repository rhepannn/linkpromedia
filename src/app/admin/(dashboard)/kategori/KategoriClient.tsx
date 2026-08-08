"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Category } from "@/types";

interface Props {
  initialCategories: Category[];
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export default function KategoriClient({ initialCategories }: Props) {
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    setName(e.target.value);
    setSlug(slugify(e.target.value));
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("Nama kategori wajib diisi."); return; }
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/kategori", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), slug: slug || slugify(name) }),
      });
      const data = await res.json();
      if (res.ok) {
        setCategories((prev) => [...prev, data]);
        setName("");
        setSlug("");
        router.refresh();
      } else {
        setError(data.error ?? "Gagal menambah kategori.");
      }
    } catch {
      setError("Terjadi kesalahan jaringan.");
    } finally {
      setLoading(false);
    }
  }

  function startEdit(cat: Category) {
    setEditingId(cat.id);
    setEditName(cat.name);
    setEditSlug(cat.slug);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName("");
    setEditSlug("");
  }

  async function handleUpdate(id: string) {
    if (!editName.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/kategori/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim(), slug: editSlug || slugify(editName) }),
      });
      const data = await res.json();
      if (res.ok) {
        setCategories((prev) => prev.map((c) => (c.id === id ? data : c)));
        cancelEdit();
        router.refresh();
      } else {
        setError(data.error ?? "Gagal memperbarui kategori.");
      }
    } catch {
      setError("Terjadi kesalahan jaringan.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string, catName: string) {
    if (!confirm(`Hapus kategori "${catName}"? Artikel dalam kategori ini akan kehilangan kategorinya.`)) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/kategori/${id}`, { method: "DELETE" });
      if (res.ok) {
        setCategories((prev) => prev.filter((c) => c.id !== id));
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.error ?? "Gagal menghapus kategori.");
      }
    } catch {
      setError("Terjadi kesalahan jaringan.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Form tambah kategori */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Tambah Kategori Baru</h2>
        {error && (
          <div role="alert" className="mb-3 bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2 rounded-lg">
            {error}
          </div>
        )}
        <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 space-y-2">
            <input
              type="text"
              value={name}
              onChange={handleNameChange}
              placeholder="Nama kategori, cth: Teknologi"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(slugify(e.target.value))}
              placeholder="slug-otomatis"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="self-start sm:self-auto bg-primary-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors disabled:opacity-60 whitespace-nowrap"
          >
            + Tambah
          </button>
        </form>
      </div>

      {/* Daftar kategori */}
      <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50">
        {categories.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-10">Belum ada kategori.</p>
        ) : (
          categories.map((cat) => (
            <div key={cat.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50/50 transition-colors">
              {editingId === cat.id ? (
                /* Mode edit */
                <div className="flex-1 flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => { setEditName(e.target.value); setEditSlug(slugify(e.target.value)); }}
                    className="flex-1 border border-primary-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    autoFocus
                  />
                  <input
                    type="text"
                    value={editSlug}
                    onChange={(e) => setEditSlug(slugify(e.target.value))}
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-500"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleUpdate(cat.id)}
                      disabled={loading}
                      className="bg-primary-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-primary-700 disabled:opacity-60"
                    >
                      Simpan
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-gray-50"
                    >
                      Batal
                    </button>
                  </div>
                </div>
              ) : (
                /* Mode tampil */
                <>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800">{cat.name}</p>
                    <p className="text-xs text-gray-400 font-mono mt-0.5">{cat.slug}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => startEdit(cat)}
                      className="text-gray-400 hover:text-primary-600 transition-colors"
                      title="Edit"
                      aria-label={`Edit kategori ${cat.name}`}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(cat.id, cat.name)}
                      disabled={loading}
                      className="text-gray-400 hover:text-red-600 transition-colors disabled:opacity-40"
                      title="Hapus"
                      aria-label={`Hapus kategori ${cat.name}`}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
