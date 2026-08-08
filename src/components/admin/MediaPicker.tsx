"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

interface MediaItem {
  id: string;
  url: string;
  filename: string;
}

interface Props {
  onSelect: (url: string) => void;
  onClose: () => void;
}

export default function MediaPicker({ onSelect, onClose }: Props) {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/media")
      .then((res) => res.json())
      .then((data) => setMedia(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700">Pilih dari Media Library</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-4 overflow-y-auto flex-1">
          {loading ? (
            <p className="text-sm text-gray-400 text-center py-8">Memuat...</p>
          ) : media.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Belum ada gambar di Media Library.</p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {media.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelect(item.url)}
                  className="relative aspect-video rounded-lg overflow-hidden bg-gray-100 border border-transparent hover:border-primary-500 transition-colors"
                  title={item.filename}
                >
                  <Image
                    src={item.url}
                    alt={item.filename}
                    fill
                    sizes="(min-width: 640px) 25vw, 33vw"
                    className="object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
