import type { Metadata } from "next";
import BookmarkClient from "./BookmarkClient";

export const metadata: Metadata = {
  title: "Artikel Tersimpan",
  robots: { index: false, follow: true },
};

export default function BookmarkPage() {
  return <BookmarkClient />;
}
