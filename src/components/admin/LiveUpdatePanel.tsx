"use client";

import { useEffect, useState } from "react";

interface LiveUpdate {
  id: string;
  content: string;
  createdAt: string;
  author: { name: string } | null;
}

interface Props {
  articleId: string;
}

export default function LiveUpdatePanel({ articleId }: Props) {
  const [updates, setUpdates] = useState<LiveUpdate[]>([]);
  const [newContent, setNewContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState("");

  function load() {
    fetch(`/api/admin/artikel/${articleId}/live-updates`)
      .then((res) => res.json())
      .then((data) => setUpdates(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [articleId]);

  async function handleAdd() {
    if (!newContent.trim()) return;
    setPosting(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/artikel/${articleId}/live-updates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newContent.trim() }),
      });
      if (res.ok) {
        setNewContent("");
        load();
      } else {
        const data = await res.json();
        setError(data.error ?? "Gagal menambah update.");
      }
    } catch {
      setError("Terjadi kesalahan jaringan.");
    } finally {
      setPosting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Hapus update ini?")) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/admin/artikel/${articleId}/live-updates/${id}`, { method: "DELETE" });
      if (res.ok) setUpdates((prev) => prev.filter((u) => u.id !== id));
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Update Langsung</h3>

      {error && <p className="text-xs text-red-500 mb-2">{error}</p>}

      <div className="flex flex-col gap-2 mb-4">
        <textarea
          value={newContent}
          onChange={(e) => setNewContent(e.target.value)}
          rows={2}
          placeholder="Tulis update terbaru..."
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={posting || !newContent.trim()}
          className="self-end bg-primary-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-primary-700 transition-colors disabled:opacity-50"
        >
          {posting ? "Mengirim..." : "+ Tambah Update"}
        </button>
      </div>

      {loading ? (
        <p className="text-xs text-gray-400 text-center py-4">Memuat...</p>
      ) : updates.length === 0 ? (
        <p className="text-xs text-gray-400 text-center py-4">Belum ada update.</p>
      ) : (
        <ul className="space-y-3 max-h-72 overflow-y-auto">
          {updates.map((u) => (
            <li key={u.id} className="border-b border-gray-50 last:border-0 pb-3 last:pb-0">
              <p className="text-xs text-gray-700">{u.content}</p>
              <div className="flex items-center justify-between mt-1">
                <p className="text-xs text-gray-400">
                  {u.author?.name ?? "Sistem"} ·{" "}
                  {new Date(u.createdAt).toLocaleString("id-ID", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
                <button
                  type="button"
                  onClick={() => handleDelete(u.id)}
                  disabled={deleting === u.id}
                  className="text-xs text-red-500 hover:text-red-600 disabled:opacity-50"
                >
                  Hapus
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
