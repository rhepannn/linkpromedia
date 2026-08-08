type Hits = Map<string, number[]>;

const buckets: Hits = new Map();

/**
 * Pembatas laju sederhana berbasis memori.
 * Catatan: reset saat server restart & tidak berbagi antar instance —
 * cukup untuk menahan spam dasar, bukan pengganti WAF/Redis di skala besar.
 */
export function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const recent = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);

  if (recent.length >= limit) {
    buckets.set(key, recent);
    return false;
  }

  recent.push(now);
  buckets.set(key, recent);

  // Bersihkan bucket lama sesekali supaya memori tidak menumpuk
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) {
      if (v.every((t) => now - t >= windowMs)) buckets.delete(k);
    }
  }

  return true;
}

/** Ambil IP pengunjung dari header proxy yang lazim dipakai */
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}
