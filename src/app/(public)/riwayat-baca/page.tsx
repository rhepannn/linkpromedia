import type { Metadata } from "next";
import ReadingHistoryClient from "./ReadingHistoryClient";

export const metadata: Metadata = {
  title: "Riwayat Baca",
  robots: { index: false, follow: true },
};

export default function ReadingHistoryPage() {
  return <ReadingHistoryClient />;
}
