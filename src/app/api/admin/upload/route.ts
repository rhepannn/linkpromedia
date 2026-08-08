import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin, THUMBNAIL_BUCKET } from "@/lib/supabaseAdmin";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activityLog";
import { getValidUserId } from "@/lib/sessionUser";

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const MAGIC_BYTES: { bytes: number[]; type: string }[] = [
  { bytes: [0xff, 0xd8, 0xff], type: "image/jpeg" },
  { bytes: [0x89, 0x50, 0x4e, 0x47], type: "image/png" },
  { bytes: [0x52, 0x49, 0x46, 0x46], type: "image/webp" },
];

function validateMagicBytes(buffer: ArrayBuffer, declaredType: string): boolean {
  const header = new Uint8Array(buffer.slice(0, 12));
  for (const magic of MAGIC_BYTES) {
    if (magic.type !== declaredType) continue;
    return magic.bytes.every((b, i) => header[i] === b);
  }
  // WebP: bytes 8-11 should be "WEBP"
  if (declaredType === "image/webp") {
    return header[8] === 0x57 && header[9] === 0x45 && header[10] === 0x42 && header[11] === 0x50;
  }
  return false;
}

// POST /api/admin/upload — upload thumbnail artikel ke Supabase Storage
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) return NextResponse.json({ error: "File tidak ditemukan" }, { status: 400 });

    if (!ALLOWED_TYPES.includes(file.type))
      return NextResponse.json(
        { error: "Format tidak didukung. Gunakan JPG, PNG, atau WebP." },
        { status: 400 }
      );

    if (file.size > MAX_SIZE_BYTES)
      return NextResponse.json({ error: "Ukuran file maksimal 5MB." }, { status: 400 });

    const buffer = await file.arrayBuffer();
    if (!validateMagicBytes(buffer, file.type))
      return NextResponse.json(
        { error: "Format file tidak valid atau rusak." },
        { status: 400 }
      );

    const ext = EXT_BY_TYPE[file.type];
    const filename = `${Date.now()}-${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from(THUMBNAIL_BUCKET)
      .upload(filename, file, { contentType: file.type, cacheControl: "31536000" });

    if (uploadError) {
      console.error("Supabase upload error:", uploadError);
      return NextResponse.json({ error: "Gagal mengunggah gambar" }, { status: 500 });
    }

    const { data } = supabaseAdmin.storage.from(THUMBNAIL_BUCKET).getPublicUrl(filename);

    // Pakai id yang sudah dipastikan ada di DB — sesi bisa "basi"
    const uploadedById = await getValidUserId();

    await prisma.media.create({
      data: {
        url: data.publicUrl,
        filename,
        mimeType: file.type,
        size: file.size,
        uploadedById,
      },
    });

    await logActivity({
      userId: uploadedById,
      action: "MEDIA_UPLOAD",
      description: `Mengunggah gambar "${file.name}"`,
    });

    return NextResponse.json({ url: data.publicUrl });
  } catch {
    return NextResponse.json({ error: "Gagal memproses upload" }, { status: 500 });
  }
}
