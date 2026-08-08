"use client";

import { useEffect, useState } from "react";

interface Note {
  id: string;
  body: string;
  isSystem: boolean;
  createdAt: string;
  author: { name: string; role: string } | null;
}

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Admin",
  EDITOR: "Editor",
  AUTHOR: "Penulis",
};

export default function EditorialNotes({ articleId }: { articleId: string }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  function load() {
    fetch(`/api/admin/artikel/${articleId}/notes`)
      .then((res) => res.json())
      .then((data) => setNotes(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [articleId]);

  async function send() {
    if (!draft.trim()) return;
    setSending(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/artikel/${articleId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: draft.trim() }),
      });
      if (res.ok) {
        setDraft("");
        load();
      } else {
        const data = await res.json();
        setError(data.error ?? "Gagal menambah catatan.");
      }
    } catch {
      setError("Terjadi kesalahan jaringan.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-1">Catatan Redaksi</h3>
      <p className="text-xs text-gray-400 mb-3">
        Diskusi internal — tidak pernah terlihat oleh pembaca.
      </p>

      {error && <p className="text-xs text-red-500 mb-2">{error}</p>}

      {loading ? (
        <p className="text-xs text-gray-400 py-3 text-center">Memuat...</p>
      ) : notes.length === 0 ? (
        <p className="text-xs text-gray-400 py-3 text-center">Belum ada catatan.</p>
      ) : (
        <ul className="space-y-3 max-h-72 overflow-y-auto mb-3">
          {notes.map((n) => (
            <li
              key={n.id}
              className={`text-xs rounded-lg p-2.5 ${
                n.isSystem ? "bg-primary-50 border border-primary-100" : "bg-gray-50"
              }`}
            >
              <p className="text-gray-700 whitespace-pre-line">{n.body}</p>
              <p className="text-gray-400 mt-1.5">
                {n.author?.name ?? "Sistem"}
                {n.author?.role && ` (${ROLE_LABEL[n.author.role] ?? n.author.role})`} ·{" "}
                {new Date(n.createdAt).toLocaleString("id-ID", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </li>
          ))}
        </ul>
      )}

      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        rows={2}
        placeholder="Tulis catatan untuk tim redaksi..."
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
      />
      <button
        type="button"
        onClick={send}
        disabled={sending || !draft.trim()}
        className="mt-2 w-full bg-primary-600 text-white py-1.5 rounded-lg text-xs font-medium hover:bg-primary-700 transition-colors disabled:opacity-50"
      >
        {sending ? "Mengirim..." : "Kirim Catatan"}
      </button>
    </div>
  );
}
