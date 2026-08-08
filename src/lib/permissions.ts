export type Role = "ADMIN" | "EDITOR" | "AUTHOR";

/**
 * Pusat aturan hak akses redaksi.
 *
 * Ringkasnya:
 *   ADMIN  — semua hal, termasuk mengelola akun & menghapus kategori
 *   EDITOR — mengelola seluruh artikel, menerbitkan, mengelola kategori
 *   AUTHOR — hanya artikelnya sendiri, tidak bisa menerbitkan langsung
 *            (harus diajukan ke editor lebih dulu)
 */

export function isRole(value: unknown): value is Role {
  return value === "ADMIN" || value === "EDITOR" || value === "AUTHOR";
}

/** Boleh menerbitkan/menjadwalkan/mengarsipkan artikel */
export function canPublish(role: Role): boolean {
  return role === "ADMIN" || role === "EDITOR";
}

/** Boleh meninjau artikel yang diajukan penulis */
export function canReview(role: Role): boolean {
  return role === "ADMIN" || role === "EDITOR";
}

/** Boleh mengubah/menghapus artikel milik orang lain */
export function canManageAllArticles(role: Role): boolean {
  return role === "ADMIN" || role === "EDITOR";
}

/** Boleh menyunting artikel tertentu */
export function canEditArticle(role: Role, articleAuthorId: string, userId: string): boolean {
  if (canManageAllArticles(role)) return true;
  return articleAuthorId === userId;
}

/** Boleh menghapus artikel */
export function canDeleteArticle(role: Role, articleAuthorId: string, userId: string): boolean {
  if (canManageAllArticles(role)) return true;
  // Penulis hanya boleh menghapus tulisannya sendiri
  return articleAuthorId === userId;
}

/** Boleh menambah/menyunting kategori */
export function canManageCategories(role: Role): boolean {
  return role === "ADMIN" || role === "EDITOR";
}

/** Boleh mengelola akun redaksi */
export function canManageUsers(role: Role): boolean {
  return role === "ADMIN";
}

/** Boleh melihat statistik pengunjung */
export function canViewAnalytics(role: Role): boolean {
  return role === "ADMIN" || role === "EDITOR";
}

/** Status yang boleh dipilih langsung oleh peran ini saat menyimpan artikel */
export function allowedStatuses(role: Role): string[] {
  if (canPublish(role)) return ["DRAFT", "IN_REVIEW", "SCHEDULED", "PUBLISHED", "ARCHIVED"];
  // Penulis: simpan sebagai draf, atau ajukan ke editor
  return ["DRAFT", "IN_REVIEW"];
}

export const FORBIDDEN_MESSAGE = "Kamu tidak punya izin untuk melakukan tindakan ini.";
