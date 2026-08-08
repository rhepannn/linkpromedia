"use client";

import { useEffect, useState } from "react";
import { isBookmarked, toggleBookmark, onBookmarksChange } from "@/lib/clientStorage";

interface Props {
  slug: string;
  variant?: "icon" | "full";
}

export default function BookmarkButton({ slug, variant = "icon" }: Props) {
  const [bookmarked, setBookmarked] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setBookmarked(isBookmarked(slug));
    return onBookmarksChange(() => setBookmarked(isBookmarked(slug)));
  }, [slug]);

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setBookmarked(toggleBookmark(slug));
  }

  if (!mounted) return null;

  if (variant === "full") {
    return (
      <button
        type="button"
        onClick={handleClick}
        className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
          bookmarked
            ? "bg-primary-600 border-primary-600 text-white"
            : "bg-white border-gray-200 text-gray-600 hover:border-primary-300"
        }`}
      >
        <svg className="w-4 h-4" fill={bookmarked ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
        </svg>
        {bookmarked ? "Tersimpan" : "Simpan"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={bookmarked ? "Hapus dari simpanan" : "Simpan artikel"}
      title={bookmarked ? "Hapus dari simpanan" : "Simpan artikel"}
      className={`p-1.5 rounded-full transition-colors ${
        bookmarked ? "text-primary-600" : "text-gray-400 hover:text-primary-600"
      }`}
    >
      <svg className="w-5 h-5" fill={bookmarked ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
      </svg>
    </button>
  );
}
