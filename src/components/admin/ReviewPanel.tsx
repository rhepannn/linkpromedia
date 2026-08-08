"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  articleId: string;
}

/**
 * Panel keputusan editor untuk artikel yang diajukan penulis.
 * Hanya muncul kalau status artikel IN_REVIEW dan pengguna berhak meninjau.
 */
export default function ReviewPanel({ articleId }: Props) {
  const [catatan, setCatatan] = useState("");
  const [busy, setBusy] = useState<"setujui" | "kembalikan" | null>(null);
  const [error, setError] = useState("");
  const router = useRouter();

  async function decide(keputusan: "setujui" | "kembalikan") {
    setBusy(keputusan);
    setError("");
    try {
      const res = await fetch(`/api/admin/artikel/${articleId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keputusan, catatan: catatan.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        router.push("/admin/artikel");
        router.refresh();
      } else {
        setError(data.error ?? "Gagal memproses tinjauan.");
      }
    } catch {
      setError("Terjadi kesalahan jaringan.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="bg-accent/10 border border-accent/30 rounded-xl p-4">
      <h3 className="text-sm font-semibold text-accent-text mb-1">Menunggu Tinjauan</h3>
      <p className="text-xs text-gray-600 mb-3">
        Penulis mengajukan artikel ini untuk ditinjau. Setujui untuk menerbitkan, atau
        kembalikan disertai alasan.
      </p>

      {error && <p className="text-xs text-red-500 mb-2">{error}</p>}

      <textarea
        value={catatan}
        onChange={(e) => setCatatan(e.target.value)}
        rows={2}
        placeholder="Catatan untuk penulis (wajib bila dikembalikan)..."
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none bg-white"
      />

      <div className="flex gap-2 mt-2">
        <button
          type="button"
          onClick={() => decide("setujui")}
          disabled={busy !== null}
          className="flex-1 bg-primary-600 text-white py-2 rounded-lg text-xs font-medium hover:bg-primary-700 transition-colors disabled:opacity-50"
        >
          {busy === "setujui" ? "Memproses..." : "Setujui & Terbitkan"}
        </button>
        <button
          type="button"
          onClick={() => decide("kembalikan")}
          disabled={busy !== null}
          className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-xs font-medium hover:bg-white transition-colors disabled:opacity-50"
        >
          {busy === "kembalikan" ? "Memproses..." : "Kembalikan"}
        </button>
      </div>
    </div>
  );
}
