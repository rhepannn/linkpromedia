import { cache } from "react";
import { prisma } from "@/lib/prisma";
import type { Category } from "@/types";

/**
 * Ambil semua kategori dari database, diurutkan berdasarkan nama.
 * Dibungkus React cache() agar deduplikasi antar komponen dalam satu request.
 */
export const getCategories = cache(async (): Promise<Category[]> => {
  return prisma.category.findMany({ orderBy: { name: "asc" } });
});
