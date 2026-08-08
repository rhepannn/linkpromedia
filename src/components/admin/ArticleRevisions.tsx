"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Revision {
  id: string;
  title: string;
  excerpt: string | null;
  createdAt: string;
  editedBy: { name: string } | null;
}

interface Props {
  articleId: string;
}

export default function ArticleRevisions({ articleId }: Props) {
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetch(`/api/admin/artikel/${articleId}/revisions`)
      .then((res) => res.json())
      .then((data) => setRevisions(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, [articleId]);

  async function handleRestore(revisionId: string) {
    if (!confirm("Pulihkan artikel ke versi ini? Perubahan saat ini akan disimpan sebagai revisi baru dulu.")) return;
    setRestoring(revisionId);
    try {
      const res = await fetch(`/api/admin/artikel/${articleId}/revisions/${revisionId}`, { method: "POST" });
      if (res.ok) {
        router.refresh();
        window.location.reload();
      } else {
        const data = await res.json();
        alert(data.error ?? "Gagal memulihkan artikel.");
      }
    } catch {
      alert("Terjadi kesalahan jaringan.");
    } finally {
      setRestoring(null);
    }
  }

  if (loading) return null;
  if (revisions.length === 0) return null;

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Riwayat Revisi</h3>
      <ul className="space-y-2 max-h-64 overflow-y-auto">
        {revisions.map((rev) => (
          <li key={rev.id} className="flex items-start justify-between gap-2 text-xs border-b border-gray-50 last:border-0 pb-2 last:pb-0">
            <div className="min-w-0">
              <p className="text-gray-700 line-clamp-1">{rev.title}</p>
              <p className="text-gray-400 mt-0.5">
                {rev.editedBy?.name ?? "Sistem"} ·{" "}
                {new Date(rev.createdAt).toLocaleString("id-ID", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleRestore(rev.id)}
              disabled={restoring === rev.id}
              className="flex-shrink-0 text-primary-600 hover:text-primary-700 font-medium disabled:opacity-50"
            >
              {restoring === rev.id ? "..." : "Pulihkan"}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
