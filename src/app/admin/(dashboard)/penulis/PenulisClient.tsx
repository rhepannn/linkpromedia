"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Penulis {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "EDITOR" | "AUTHOR";
  createdAt: string;
  slug: string | null;
  bio: string | null;
  isVerified: boolean;
}

interface Props {
  initialPenulis: Penulis[];
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Admin",
  EDITOR: "Editor",
  AUTHOR: "Penulis",
};

const ROLE_COLORS: Record<string, string> = {
  ADMIN: "bg-primary-100 text-primary-700",
  EDITOR: "bg-primary-50 text-primary-600",
  AUTHOR: "bg-surface text-text-muted",
};

export default function PenulisClient({ initialPenulis }: Props) {
  const [list, setList] = useState<Penulis[]>(initialPenulis);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"ADMIN" | "EDITOR" | "AUTHOR">("AUTHOR");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState<"ADMIN" | "EDITOR" | "AUTHOR">("AUTHOR");
  const [editSlug, setEditSlug] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editVerified, setEditVerified] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  function resetForm() {
    setName(""); setEmail(""); setPassword(""); setRole("AUTHOR");
    setShowForm(false); setError("");
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError("Semua field wajib diisi."); return;
    }
    if (password.length < 8) {
      setError("Password minimal 8 karakter."); return;
    }
    setError(""); setLoading(true);
    try {
      const res = await fetch("/api/admin/penulis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), password, role }),
      });
      const data = await res.json();
      if (res.ok) {
        setList((prev) => [...prev, data]);
        resetForm();
        router.refresh();
      } else {
        setError(data.error ?? "Gagal menambah penulis.");
      }
    } catch {
      setError("Terjadi kesalahan jaringan.");
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateRole(id: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/penulis/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: editRole, slug: editSlug, bio: editBio, isVerified: editVerified }),
      });
      const data = await res.json();
      if (res.ok) {
        setList((prev) => prev.map((p) => (p.id === id ? { ...p, ...data } : p)));
        setEditingId(null);
        router.refresh();
      } else {
        setError(data.error ?? "Gagal memperbarui data penulis.");
      }
    } catch {
      setError("Terjadi kesalahan jaringan.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string, pName: string) {
    if (!confirm(`Hapus penulis "${pName}"? Data tidak dapat dikembalikan.`)) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/penulis/${id}`, { method: "DELETE" });
      if (res.ok) {
        setList((prev) => prev.filter((p) => p.id !== id));
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.error ?? "Gagal menghapus penulis.");
      }
    } catch {
      setError("Terjadi kesalahan jaringan.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      {error && (
        <div role="alert" className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Tombol tambah */}
      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          Tambah Penulis
        </button>
      ) : (
        /* Form tambah penulis */
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Tambah Penulis Baru</h2>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="p-name" className="block text-xs font-medium text-gray-600 mb-1.5">
                  Nama Lengkap <span className="text-red-500">*</span>
                </label>
                <input
                  id="p-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nama penulis"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  autoFocus
                />
              </div>
              <div>
                <label htmlFor="p-email" className="block text-xs font-medium text-gray-600 mb-1.5">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  id="p-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@linkpromedia.id"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label htmlFor="p-password" className="block text-xs font-medium text-gray-600 mb-1.5">
                  Password <span className="text-red-500">*</span>
                </label>
                <input
                  id="p-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 8 karakter"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label htmlFor="p-role" className="block text-xs font-medium text-gray-600 mb-1.5">
                  Role
                </label>
                <select
                  id="p-role"
                  value={role}
                  onChange={(e) => setRole(e.target.value as typeof role)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                >
                  <option value="AUTHOR">Penulis</option>
                  <option value="EDITOR">Editor</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <button
                type="submit"
                disabled={loading}
                className="bg-primary-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors disabled:opacity-60"
              >
                {loading ? "Menyimpan..." : "Tambah Penulis"}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="border border-gray-200 text-gray-600 px-5 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Batal
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Daftar penulis */}
      <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50">
        {list.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-10">Belum ada penulis terdaftar.</p>
        ) : (
          list.map((p) => (
            <div key={p.id} className="px-5 py-4 hover:bg-gray-50/50 transition-colors">
              <div className="flex items-center gap-4">
                {/* Avatar */}
                <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-bold text-sm flex-shrink-0 select-none">
                  {p.name[0]?.toUpperCase()}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 flex items-center gap-1.5">
                    {p.name}
                    {p.isVerified && (
                      <svg className="w-3.5 h-3.5 text-primary-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-label="Jurnalis terverifikasi">
                        <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    )}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{p.email}{p.slug ? ` · /penulis/${p.slug}` : ""}</p>
                </div>

                {editingId !== p.id && (
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${ROLE_COLORS[p.role]}`}>
                    {ROLE_LABELS[p.role]}
                  </span>
                )}

                {/* Aksi */}
                {editingId !== p.id && (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => {
                        setEditingId(p.id);
                        setEditRole(p.role);
                        setEditSlug(p.slug ?? "");
                        setEditBio(p.bio ?? "");
                        setEditVerified(p.isVerified);
                      }}
                      title="Edit profil"
                      aria-label={`Edit profil ${p.name}`}
                      className="text-gray-400 hover:text-primary-600 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(p.id, p.name)}
                      disabled={loading}
                      title="Hapus penulis"
                      aria-label={`Hapus ${p.name}`}
                      className="text-gray-400 hover:text-red-600 transition-colors disabled:opacity-40"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>

              {/* Panel edit profil lengkap */}
              {editingId === p.id && (
                <div className="mt-3 pl-13 space-y-3 bg-gray-50 rounded-lg p-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Role</label>
                      <select
                        value={editRole}
                        onChange={(e) => setEditRole(e.target.value as typeof editRole)}
                        className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                        autoFocus
                      >
                        <option value="AUTHOR">Penulis</option>
                        <option value="EDITOR">Editor</option>
                        <option value="ADMIN">Admin</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Slug profil publik <span className="text-gray-400 font-normal">(kosongkan = tanpa halaman publik)</span>
                      </label>
                      <input
                        type="text"
                        value={editSlug}
                        onChange={(e) => setEditSlug(e.target.value)}
                        placeholder="nama-penulis"
                        className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Bio singkat</label>
                    <textarea
                      value={editBio}
                      onChange={(e) => setEditBio(e.target.value)}
                      rows={2}
                      placeholder="Ditampilkan di halaman profil publik..."
                      className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                    />
                  </div>
                  <label className="flex items-center gap-2 text-xs text-gray-700">
                    <input
                      type="checkbox"
                      checked={editVerified}
                      onChange={(e) => setEditVerified(e.target.checked)}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    Tandai sebagai jurnalis terverifikasi
                  </label>
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => handleUpdateRole(p.id)}
                      disabled={loading}
                      className="bg-primary-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-primary-700 disabled:opacity-60"
                    >
                      Simpan
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="border border-gray-200 text-gray-500 px-3 py-1.5 rounded-lg text-xs hover:bg-white"
                    >
                      Batal
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
