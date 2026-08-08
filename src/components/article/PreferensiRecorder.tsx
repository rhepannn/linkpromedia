"use client";

import { useEffect } from "react";
import { recordCategoryPreference, getCategoryPreferences } from "@/lib/clientStorage";

export default function PreferensiRecorder({ categorySlug }: { categorySlug: string }) {
  useEffect(() => {
    recordCategoryPreference(categorySlug);
    const prefs = getCategoryPreferences();
    document.cookie = `lp-pref=${encodeURIComponent(prefs.join(","))}; path=/; max-age=${30 * 24 * 60 * 60}; SameSite=Lax`;
  }, [categorySlug]);

  return null;
}
