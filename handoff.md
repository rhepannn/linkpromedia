# Handoff — LinkProMedia

Dokumen ini untuk AI/sesi berikutnya yang melanjutkan proyek ini. Terakhir diperbarui 2026-08-03.

## 1. Apa proyek ini

LinkProMedia — CMS berita (news publisher) berbasis Next.js 15.3.3 App Router + React 19, Prisma 6.12 ORM ke Supabase Postgres, Tailwind v4, next-auth v5 (Credentials provider, JWT session). Bahasa UI/redaksi: Indonesia. Nama variabel/fungsi di banyak file backend sengaja pakai Bahasa Indonesia (`gangguanKoneksiSementara`, `kirimNotifikasiKeSemua`, dsb) — ikuti konvensi itu saat menambah kode baru di file yang sama.

Dokumen roadmap ada di root: `LinkProMedia_Roadmap.md` dan `LinkProMedia_Roadmap_Detailed.md`. Cek keduanya untuk detail tiap fase — dokumen ini hanya ringkasan status + gotcha teknis.

## 2. PENTING: baca AGENTS.md dulu

`AGENTS.md` di root bilang versi Next.js ini punya breaking changes dari training data — cek `node_modules/next/dist/docs/` sebelum menulis kode yang menyentuh API Next.js yang belum familiar.

## 3. Status Roadmap

**Selesai & sudah diverifikasi (bukan cuma `tsc --noEmit`, tapi diuji nyata via browser/DB/script):**
- Phase 1–6: fondasi CMS (auth, artikel, kategori, tag, RBAC, dsb) — dari sesi-sesi sebelumnya.
- Phase 7: AI features (Groq-based) — headline generator, Inti Berita/AI summary auto-enrich saat publish, AI Draft Writer dari bahan (source material) dengan berbagai tipe bahan (siaran pers, wawancara, data/angka, dokumen resmi, catatan lapangan) — semua tipe sudah diuji.
- Audit menyeluruh website (7 kategori, severity Critical/High/Medium).
- Phase 8 (AI Newsroom Assistant, spec dari user).
- Future Ideas (semua kecuali Mobile App) — 4 batch selesai:
  1. Journalist Verification (`User.isVerified`) + Public Author Profile (`/penulis/[slug]`)
  2. Multi-language articles (self-referential `translationOf`/`translations`, `LanguageSwitcher`, admin `TranslationPanel`)
  3. PWA + Offline Reading (`manifest.ts`, `public/sw.js`, `/offline`)
  4. Push Notification (VAPID, `PushSubscription` model, auto-push saat artikel breaking baru terbit)

**Diselesaikan 2026-08-03 (sesi ini):**
- **Personalized Homepage (Phase 7)** — Cookie-based `lp-pref` (`PreferensiRecorder` + `preferensiPembaca.ts`). Homepage membaca preferensi kategori pembaca dari cookie (diset dari halaman artikel setelah membaca), lalu mengurutkan ulang seksi kategori — kategori favorit didahulukan dengan label "· favorit kamu". `ForYouSection` tetap ada sebagai personalisasi AI berbasis localStorage. Tanpa cookie → tampilan default (seperti bukan personalisasi).
- **Kronologi Interaktif (Phase 7)** — Halaman `/kronologi` dengan `NewsTimeline.tsx`: garis waktu visual vertikal, filter Breaking/Live/Semua, date grouping (Hari Ini/Kemarin), infinite scroll. API: `GET /api/kronologi?offset=&limit=&type=`. Data dari artikel PUBLISHED/SCHEDULED (sudah tayang). Link tersedia di Footer, Header (desktop icon) dan Header mobile menu.

**Dibatalkan user (2026-08-03):**
- AI Podcast Generator — dibatalkan, bukan ditunda.
- AI Video Article — dibatalkan, bukan ditunda.
- Mobile App — dibatalkan, bukan dikecualikan.

**Sengaja dilewati (keputusan eksplisit user):**
- AI News Discovery — butuh news API eksternal berbayar, dilewati.

## 4. Instruksi standing dari user (WAJIB diikuti terus)

- **Kerjakan bertahap, jangan sekaligus** — "jangan langsung sekaligus". Batch demi batch, fase demi fase.
- **Kalau ada error, langsung fix, jangan tanya izin dulu** — "kalo ada error langsung fix saja".
- **Verifikasi harus nyata**, bukan cuma type-check. Uji lewat browser sungguhan, query DB langsung, atau script yang mensimulasikan kondisi error nyata (lihat pola di §7). `tsc --noEmit` lolos ≠ fitur bekerja.
- **AI Draft Generator TIDAK BOLEH pernah menulis dari topik bebas** — harus selalu berbasis bahan/source material yang disediakan redaksi (`draftArticleFromSource`). Ini pernah konflik dengan spec Phase 8 user sendiri dan saya sengaja mempertahankan versi yang aman (source-required) daripada mengikuti spec literal.
- **Kredensial/secret langsung disimpan ke `.env`**, jangan ditampilkan ulang tanpa perlu.
- User menjawab pertanyaan lewat AskUserQuestion untuk keputusan besar (mis. urutan Future Ideas, skip item tertentu) — kalau ragu-ragu soal scope besar, tanya dulu, jangan asumsi.

## 5. Isu teknis yang HARUS diketahui sebelum menyentuh `src/lib/prisma.ts`

Ada bug tersembunyi yang sudah pernah menjatuhkan seluruh admin panel (500 di semua route admin): `middleware.ts` → `auth.ts` → `prisma.ts` dieksekusi di **Next.js Edge Runtime**, dan Prisma Client Extensions (`.$extends()`) **tidak boleh dipanggil secara eager saat module-eval time di Edge Runtime** — itu akan crash.

Fix final yang sudah diterapkan (JANGAN diubah struktur intinya tanpa paham risiko ini):

```ts
import { PrismaClient, Prisma } from "@prisma/client";
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };
const basePrisma = globalForPrisma.prisma ?? new PrismaClient({ log: process.env.NODE_ENV === "development" ? ["query","error","warn"] : ["error"] });
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = basePrisma;

const KODE_ERROR_KONEKSI = new Set(["P1001", "P1002", "P2024"]);
function gangguanKoneksiSementara(err: unknown): boolean {
  if (err instanceof Prisma.PrismaClientKnownRequestError) return KODE_ERROR_KONEKSI.has(err.code);
  return err instanceof Prisma.PrismaClientInitializationError;
}
function tunda(ms: number): Promise<void> { return new Promise((r) => setTimeout(r, ms)); }

// Dibungkus fungsi supaya .$extends() TIDAK PERNAH dipanggil saat module-eval di edge runtime
function buatKlienDenganRetry() {
  return basePrisma.$extends({
    query: {
      async $allOperations({ args, query }) {
        const MAKS_PERCOBAAN = 3;
        for (let percobaan = 1; ; percobaan++) {
          try { return await query(args); }
          catch (err) {
            if (percobaan >= MAKS_PERCOBAAN || !gangguanKoneksiSementara(err)) throw err;
            await tunda(300 * percobaan);
          }
        }
      },
    },
  });
}
type PrismaTerextensi = ReturnType<typeof buatKlienDenganRetry>;
export const prisma: PrismaTerextensi =
  process.env.NEXT_RUNTIME === "edge"
    ? (basePrisma as unknown as PrismaTerextensi)
    : buatKlienDenganRetry();
```

Kenapa `ReturnType<typeof buatKlienDenganRetry>` dan bukan union type biasa: union type sempat merusak typing `.groupBy()` di `analytics.ts`/`articles.ts`. Pola ini menghindari kedua masalah sekaligus.

**Pelajaran penting**: bug ini lolos dari testing karena saya sempat hanya menguji retry logic secara terisolasi lewat script, tanpa re-test admin panel via browser sungguhan setelahnya. Selalu re-verifikasi lewat jalur yang sebenarnya dipakai user (browser admin panel), bukan cuma unit-level script, setelah menyentuh file infrastruktur seperti ini.

## 6. Konektivitas DB — flaky, sudah dimitigasi tapi belum "sembuh" akar masalahnya

Ada dua connection string yang pernah dipakai bergantian karena sandbox ini kadang gagal resolve salah satunya:

- **Direct** (IPv6-only, tidak ada A record — sering gagal di sandbox ini):
  `postgresql://postgres:[password]@db.llgadfrlqgfywcogvgws.supabase.co:5432/postgres?schema=public`
- **Session Pooler** (lebih stabil di sandbox ini — **ini yang aktif sekarang di `.env`**):
  `postgresql://postgres.llgadfrlqgfywcogvgws:[password]@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres?schema=public`

Root cause SUDAH TERIDENTIFIKASI (diverifikasi 2026-08-03 via `Resolve-DnsName`, `Test-NetConnection`, `dns.lookup` family:4, dan uji Prisma nyata ke kedua endpoint): **bukan flakiness acak dan bukan masalah Supabase** (dashboard "healthy"). Penyebabnya ada di DNS:

- Host **direct** hanya punya **AAAA record (IPv6-only)** — lookup IPv4-only menghasilkan `ENOTFOUND`. Jadi di jaringan tanpa IPv6 yang berfungsi, direct mustahil dipakai → Prisma melempar **P1001 "Can't reach database server"**.
- Host **pooler** punya **A record IPv4** (dual-stack) — selalu bisa di-resolve di jaringan apa pun (bahkan terlihat diakses via NAT64/DNS64 `64:ff9b::/96`).

Ketersediaan IPv6 di mesin ini bergantung pada Router Advertisement Wi-Fi/ISP — tidak dijamin (bisa hilang setelah reconnect Wi-Fi, ganti jaringan, router restart). Itu sebabnya direct terlihat "kadang hidup kadang mati". **Kesimpulan: tetap pakai pooler — itu solusi definitif untuk environment ini, bukan workaround sementara.** Retry wrapper otomatis di `prisma.ts` (§5, 3x percobaan + backoff) tetap berguna sebagai lapisan tahan banting tambahan.

**Kalau DB tiba-tiba gagal connect**: coba tukar `DATABASE_URL` di `.env` antara dua string di atas (password ada di `.env` yang sudah ada di disk, jangan minta user ketik ulang). Setelah ganti, **stop dev server dulu sebelum `npx prisma generate`** kalau perlu regenerate client (lihat §8 soal file-lock Windows).

## 7. Pola testing yang dipakai di proyek ini

- Script sekali-pakai untuk uji kondisi nyata ditaruh di root dengan suffix `-tmp.ts` (mis. `scripts-cek-status-tmp.ts`, `scripts-uji-push-tmp.ts` — kalau masih ada di git status, itu sisa yang belum dibersihkan, boleh dihapus setelah dicek tidak dibutuhkan lagi). **Selalu hapus script tmp setelah selesai dipakai** — jangan biarkan menumpuk di root.
- Contoh pola "uji kondisi error nyata daripada mock": untuk fitur push notification, alih-alih hanya mock HTTP 410, script sungguhan mengirim ke endpoint FCM asli dengan VAPID key dummy berukuran benar (pakai Node `crypto` untuk generate key dummy yang valid) untuk memicu 410 asli dari server Google, lalu verifikasi baris `PushSubscription` benar-benar terhapus dari DB.
- Anti-halusinasi AI: prompt di `src/lib/ai.ts` selalu punya instruksi eksplisit "hanya gunakan fakta yang eksplisit ada di sumber", TAPI jangan percaya itu saja — selalu tambahkan filter/backstop di level kode (mis. cek mekanis jumlah kata untuk deteksi "kalimat-panjang", larangan angka yang tidak ada di sumber). LLM tidak 100% patuh ke instruksi prompt sendirian.
- RBAC: selalu filter query admin berdasarkan `getSessionActor()` + helper di `src/lib/permissions.ts` (`canEditArticle`, `canDeleteArticle`, `canManageAllArticles`, `allowedStatuses`) — jangan asumsikan role dari session tanpa cek ulang di server.

## 8. Gotcha spesifik Windows

`npx prisma generate` sering gagal dengan `EPERM ... query_engine-windows.dll.node` kalau dev server masih jalan (file lock). Fix: **stop dev server dulu**, baru jalankan `prisma generate`, baru start ulang dev server.

## 9. Environment variables (nama saja — nilai sudah ada di `.env` lokal, JANGAN diminta ulang ke user)

```
AUTH_SECRET, NEXTAUTH_URL, NEXT_PUBLIC_APP_URL
DATABASE_URL              (lihat §6 — bisa perlu ditukar)
SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY   (untuk upload gambar)
ANTHROPIC_API_KEY         (disimpan untuk nanti, BELUM dipakai — saldo kosong)
GROQ_API_KEY              (provider AI AKTIF — llama-3.3-70b-versatile, dipakai di semua fitur AI Phase 7/8)
NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT   (push notification)
```

`.env.example` sudah ada di root sebagai referensi struktur (tanpa nilai asli).

## 10. Arsitektur/file kunci untuk orientasi cepat

- `src/lib/prisma.ts` — client Prisma + retry wrapper (§5, HATI-HATI).
- `src/lib/articles.ts` — semua query artikel publik/admin; `daftarPublikWhere()` = filter list publik (status+visibility+bahasa Indonesia default); `getArticleBySlug` sengaja tidak difilter bahasa karena harus resolve semua versi terjemahan.
- `src/lib/ai.ts` — semua pemanggilan Groq (headline generator, AI summary, draft writer dari bahan, dsb) + backstop anti-halusinasi.
- `src/lib/push.ts` — kirim push notification ke semua subscriber, auto-cleanup subscription mati (404/410).
- `src/lib/permissions.ts`, `src/lib/sessionRole.ts` — RBAC.
- `src/lib/trending.ts` — Trending Score Algorithm (Hacker News-style: bobot kunjungan/tuntas/share + time decay).
- `src/lib/preferensiPembaca.ts` — baca cookie `lp-pref` (preferensi kategori pembaca) dari server.
- `src/lib/clientStorage.ts` — localStorage helpers (reading history, bookmark, category preferences).
- `prisma/schema.prisma` — schema lengkap; catat `postgresqlExtensions` preview feature + `pg_trgm` GIN index untuk search artikel yang cepat.
- `public/sw.js` — service worker PWA (offline reading network-first + push notification). Sengaja tidak cache `/admin`, `/api`, `/preview/`.
- `src/app/(public)/page.tsx` — homepage dengan personalisasi (cookie-based reorder kategori + ForYouSection).
- `src/app/(public)/kronologi/page.tsx` — halaman kronologi interaktif.
- `src/app/(public)/berita/[slug]/page.tsx` — halaman artikel detail (termasuk `PreferensiRecorder`).
- `src/app/(public)/penulis/[slug]/page.tsx` — halaman profil penulis publik.
- `src/app/api/kronologi/route.ts` — API kronologi (GET, paginasi, filter type).
- `src/components/article/ForYouSection.tsx` — rekomendasi artikel berbasis riwayat baca localStorage.
- `src/components/article/NewsTimeline.tsx` — komponen timeline interaktif (filter, date-grouping, infinite scroll).
- `src/components/article/PreferensiRecorder.tsx` — rekam preferensi kategori ke localStorage + cookie.
- `src/components/article/LiveUpdateTimeline.tsx` — polling live update per-artikel.
- `src/components/article/LanguageSwitcher.tsx`, `src/components/admin/TranslationPanel.tsx` — fitur multi-bahasa.
- `audit-prompt.md` — checklist audit menyeluruh (function, UI, DB, SEO, security, performance).

## 11. Langkah pertama yang disarankan untuk sesi baru

1. Jalankan `git status` dan `git log --oneline -10` untuk cek ada perubahan belum ter-commit atau tidak (sesi sebelumnya sengaja tidak commit kecuali diminta user — konfirmasi ke user dulu sebelum commit apa pun, sesuai aturan git safety).
2. Baca `LinkProMedia_Roadmap.md` untuk konfirmasi tidak ada scope baru yang ditambahkan user sejak dokumen ini ditulis.
3. Coba jalankan dev server (`npm run dev`) dan buka admin panel di browser untuk konfirmasi semuanya masih hidup — terutama cek DB connect sukses (lihat §6 kalau gagal).
4. Tanyakan ke user apakah ada prioritas baru, atau lanjut ke item roadmap berikutnya yang belum tersentuh (kalau ada).
