"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Terjemahan {
  id: string;
  title: string;
  slug: string;
  language: string;
  status: string;
}

const BAHASA = [
  { kode: "en", nama: "Inggris" },
  { kode: "ja", nama: "Jepang" },
  { kode: "ar", nama: "Arab" },
];

const LABEL_STATUS: Record<string, string> = {
  DRAFT: "Draft",
  IN_REVIEW: "Ditinjau",
  SCHEDULED: "Terjadwal",
  PUBLISHED: "Terbit",
  ARCHIVED: "Arsip",
};

export default function TranslationPanel({ articleId }: { articleId: string }) {
  const [daftar, setDaftar] = useState<Terjemahan[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [membuat, setMembuat] = useState<string | null>(null);
  const [error, setError] = useState("");

  function muat() {
    fetch(`/api/admin/artikel/${articleId}/terjemahan`)
      .then((res) => res.json())
      .then((data) => setDaftar(Array.isArray(data) ? data : []))
      .finally(() => setMemuat(false));
  }

  useEffect(() => {
    muat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [articleId]);

  async function buat(kode: string) {
    setMembuat(kode);
    setError("");
    try {
      const res = await fetch(`/api/admin/artikel/${articleId}/terjemahan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bahasa: kode }),
      });
      const data = await res.json();
      if (res.ok) {
        setDaftar((prev) => [...prev, data]);
      } else {
        setError(data.error ?? "Gagal membuat terjemahan.");
      }
    } catch {
      setError("Terjadi kesalahan jaringan.");
    } finally {
      setMembuat(null);
    }
  }

  const sudahAda = new Set(daftar.map((t) => t.language));

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-1">Terjemahan</h3>
      <p className="text-xs text-gray-400 mb-3">
        Disimpan sebagai draf terpisah — wajib diperiksa sebelum diterbitkan.
      </p>

      {error && <p className="text-xs text-red-500 mb-2">{error}</p>}

      {memuat ? (
        <p className="text-xs text-gray-400">Memuat...</p>
      ) : (
        <>
          {daftar.length > 0 && (
            <ul className="space-y-1.5 mb-3">
              {daftar.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-2 bg-gray-50 rounded-lg px-2.5 py-1.5">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-gray-700 truncate">{t.title}</p>
                    <p className="text-[10px] text-gray-400">
                      {BAHASA.find((b) => b.kode === t.language)?.nama ?? t.language} · {LABEL_STATUS[t.status] ?? t.status}
                    </p>
                  </div>
                  <Link
                    href={`/admin/artikel/${t.id}`}
                    className="text-xs text-primary-600 hover:text-primary-700 font-medium flex-shrink-0"
                  >
                    Sunting →
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <div className="flex flex-wrap gap-2">
            {BAHASA.filter((b) => !sudahAda.has(b.kode)).map((b) => (
              <button
                key={b.kode}
                type="button"
                onClick={() => buat(b.kode)}
                disabled={membuat !== null}
                className="text-xs border border-primary-200 text-primary-600 px-2.5 py-1.5 rounded-lg hover:bg-primary-50 transition-colors disabled:opacity-50"
              >
                {membuat === b.kode ? "Menerjemahkan..." : `+ ${b.nama}`}
              </button>
            ))}
          </div>

          {sudahAda.size === BAHASA.length && (
            <p className="text-xs text-gray-400">Semua bahasa sudah diterjemahkan.</p>
          )}
        </>
      )}
    </div>
  );
}
