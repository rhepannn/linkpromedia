"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

interface MediaItem {
  id: string;
  url: string;
  filename: string;
  mimeType: string;
  size: number;
  createdAt: string;
  uploadedBy: { name: string } | null;
  usageCount: number;
}

interface Props {
  initialMedia: MediaItem[];
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function MediaLibraryClient({ initialMedia }: Props) {
  const [media, setMedia] = useState(initialMedia);
  const [deleting, setDeleting] = useState<string | null>(null);
  const router = useRouter();

  async function handleDelete(id: string, filename: string) {
    if (!confirm(`Hapus gambar "${filename}"? Tindakan ini tidak dapat dibatalkan.`)) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/admin/media/${id}`, { method: "DELETE" });
      if (res.ok) {
        setMedia((prev) => prev.filter((m) => m.id !== id));
        router.refresh();
      } else {
        const data = await res.json();
        alert(data.error ?? "Gagal menghapus media.");
      }
    } catch {
      alert("Terjadi kesalahan jaringan.");
    } finally {
      setDeleting(null);
    }
  }

  if (media.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-divider text-center py-16 text-text-muted text-sm">
        Belum ada gambar yang diupload. Upload thumbnail lewat form artikel untuk mengisi Media Library.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {media.map((item) => (
        <div key={item.id} className="bg-white rounded-xl border border-divider overflow-hidden group">
          <div className="relative aspect-video bg-gray-100">
            <Image
              src={item.url}
              alt={item.filename}
              fill
              sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
              className="object-cover"
            />
            {item.usageCount > 0 ? (
              <span className="absolute top-2 left-2 bg-green-100 text-green-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                Dipakai {item.usageCount} artikel
              </span>
            ) : (
              <span className="absolute top-2 left-2 bg-gray-200 text-gray-600 text-xs font-semibold px-2 py-0.5 rounded-full">
                Tidak dipakai
              </span>
            )}
          </div>
          <div className="p-3">
            <p className="text-xs text-heading truncate font-medium">{item.filename}</p>
            <p className="text-xs text-text-muted mt-0.5">
              {formatSize(item.size)} · {item.uploadedBy?.name ?? "Sistem"}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(item.url)}
                className="flex-1 text-xs border border-gray-200 text-gray-600 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Salin URL
              </button>
              <button
                type="button"
                onClick={() => handleDelete(item.id, item.filename)}
                disabled={deleting === item.id || item.usageCount > 0}
                title={item.usageCount > 0 ? "Tidak bisa dihapus — masih dipakai artikel" : "Hapus"}
                className="text-xs border border-gray-200 text-red-500 px-2.5 py-1.5 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
