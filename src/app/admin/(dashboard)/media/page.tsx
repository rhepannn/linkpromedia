import type { Metadata } from "next";
import { getMediaLibrary } from "@/lib/media";
import MediaLibraryClient from "./MediaLibraryClient";

export const metadata: Metadata = { title: "Media Library" };

export default async function MediaPage() {
  const media = await getMediaLibrary();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-heading">Media Library</h1>
        <p className="text-sm text-text-muted mt-0.5">{media.length} gambar tersimpan</p>
      </div>
      <MediaLibraryClient
        initialMedia={media.map((m) => ({ ...m, createdAt: m.createdAt.toISOString() }))}
      />
    </div>
  );
}
