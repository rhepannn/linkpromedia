import type { Metadata } from "next";
import NewsTimeline from "@/components/article/NewsTimeline";

export const metadata: Metadata = {
  title: "Kronologi — LinkProMedia",
  description:
    "Ikuti kronologi peristiwa terkini secara interaktif. Breaking news, laporan langsung, dan perkembangan berita terbaru dalam satu garis waktu.",
};

export default function KronologiPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-heading">Kronologi</h1>
        <p className="text-gray-500 mt-2">
          Garis waktu interaktif — ikuti perkembangan berita dari waktu ke waktu.
        </p>
      </div>
      <NewsTimeline />
    </div>
  );
}
