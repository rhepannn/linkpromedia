"use client";

import { useEffect } from "react";
import { recordArticleView } from "@/lib/clientStorage";

export default function ReadingHistoryRecorder({ slug }: { slug: string }) {
  useEffect(() => {
    recordArticleView(slug);
  }, [slug]);

  return null;
}
