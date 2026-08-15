# LAPORAN PERUBAHAN — KEAMANAN (CYBERSECURITY)

 NAMA PERUBAHAN, FITUR ATAU PERBAIKAN, TANGGAL PERUBAHAN

---

| Nama Perubahan | Fitur / Perbaikan | Tanggal |
| --- | --- | --- |
| Sanitasi HTML hasil AI di panel admin (XSS) | Perbaikan — keamanan | 14 Agustus 2026 |
| Header Content-Security-Policy (CSP) | Perbaikan — keamanan | 14 Agustus 2026 |
| Audit keamanan menyeluruh (8 area) | Pemeriksaan | 14 Agustus 2026 |
| Region function Vercel dipindah ke Singapura | Perbaikan — performa | 14 Agustus 2026 |
| Catatan audit & studi kasus downtime | Dokumentasi | 14 Agustus 2026 |

> **Status: sudah di-deploy & terverifikasi di produksi (15 Agustus 2026).**
> Commit `45459a2` (keamanan) dan `879c4b0` (region) sudah ter-push ke `main` dan aktif di
> `media.linkproductive.com`. Hasil pengukuran ada di bagian Verifikasi.

---

## Detail Perubahan

### 1. Sanitasi HTML hasil AI di panel admin (XSS)

**Masalah:** dua tempat merender hasil AI lewat `dangerouslySetInnerHTML` tanpa disaring
lebih dulu. Isi `content` dari AI tidak sepenuhnya tepercaya — fitur riset web menarik teks
dari website pihak ketiga (Tavily/RSS), sehingga halaman yang sengaja disusun untuk menjebak
AI (*prompt injection*) bisa membuat AI ikut menuliskan kode berbahaya seperti
`<img src=x onerror=...>`. Kode itu lalu berjalan di browser **admin yang sedang login**,
bukan di browser pengunjung biasa — berisiko mencuri sesi admin.

Prompt AI memang hanya *meminta* model menulis tag `<p>`/`<h2>` saja, tetapi itu instruksi,
bukan aturan yang dipaksakan kode.

**Perbaikan:** kedua render dibungkus `sanitizeHtml()` (`src/lib/sanitize.ts`) — fungsi
allowlist yang sudah dipakai konsisten di halaman artikel publik.

```tsx
dangerouslySetInnerHTML={{ __html: sanitizeHtml(draf.content) }}
```

**Catatan lanjutan:** `sanitizeHtml()` berbasis regex, bukan parser DOM sungguhan, sehingga
secara umum lebih rawan di-*bypass* oleh HTML bertingkat. Ini pola lama yang dipakai
menyeluruh di codebase; kalau suatu saat mau diperkuat, `isomorphic-dompurify` adalah
pilihan standar industri.

**Berkas:** `src/app/admin/(dashboard)/artikel/tulis-ai/TulisAiClient.tsx`,
`src/components/admin/AiChatPanel.tsx`

---

### 2. Header Content-Security-Policy (CSP)

**Perbaikan:** CSP ditambahkan sebagai lapisan pertahanan kedua — kalau suatu saat ada XSS
yang lolos dari sanitasi, CSP membatasi apa yang bisa dilakukan script tersebut.

**Keputusan desain — sengaja TANPA nonce.** Pendekatan nonce (angka acak sekali pakai per
request) secara teori paling aman, sempat diimplementasikan, lalu **dibatalkan**. Alasannya:
supaya nonce sampai ke HTML, root layout harus memanggil `headers()`. Di App Router
`headers()` adalah *Dynamic API* — memanggilnya di root layout membuat **seluruh halaman**
jadi dynamic. Uji coba menunjukkan dampaknya:

| | Dengan nonce | Tanpa nonce (dipakai) |
| --- | --- | --- |
| `Cache-Control` halaman artikel | `no-store, must-revalidate` | `s-maxage=60, stale-while-revalidate` |
| `x-nextjs-cache` | (tidak ada) | `HIT` |
| Waktu respons | ~0,88 dtk | ~0,009 dtk |
| Status di build | `ƒ` dynamic | `●`/`○` static/SSG |

Artinya dengan nonce, tiap pembaca memicu render penuh + kueri database sendiri — persis
kondisi yang bikin sistem rentan saat traffic melonjak. Untuk situs berita, ketahanan saat
lonjakan pembaca dinilai lebih berharga daripada memblokir eksekusi script inline.

**Sebagai gantinya, jalur pencurian data yang ditutup:** `connect-src`, `img-src`, dan
`form-action` dikunci ke `'self'`, sehingga payload XSS tidak punya kanal untuk mengirim
cookie atau data ke server penyerang. `'unsafe-eval'` hanya muncul di mode development
(dev server Next.js memakai `eval()` untuk fast refresh) dan tidak pernah ikut ke produksi.

**Berkas:** `next.config.ts`

---

### 3. Audit keamanan menyeluruh — hasil pemeriksaan

Delapan area diperiksa. Selain dua temuan di atas, seluruhnya **aman** — dicatat di sini
supaya jelas apa yang sudah diverifikasi, bukan sekadar diasumsikan.

| Area | Status |
| --- | --- |
| Auth & session | Aman |
| API & input validation | 1 temuan (XSS) — sudah diperbaiki, lihat poin 1 |
| Secrets & env management | Aman |
| Dependency & supply chain | Aman (3 `npm audit` high, non-urgent) |
| CSRF | Aman |
| Security headers | 1 gap (CSP) — sudah diperbaiki, lihat poin 2 |
| Upload berkas | Aman |
| Webhook/cron endpoint | Aman |

**Auth & session.** NextAuth v5 + bcrypt, sesi JWT 8 jam, rate-limit percobaan login, dan
role dibaca ulang dari database pada setiap aksi (tidak sekadar percaya klaim di token) —
mencegah kasus "role sudah dicabut tapi token lama masih bilang admin".

**CSRF.** Tidak ada token CSRF khusus, dan memang tidak diperlukan: cookie sesi NextAuth
memakai `SameSite=Lax` bawaan, sehingga browser tidak mengirimkannya pada request
POST/PATCH/DELETE lintas-situs. Request admin yang dipalsukan dari website lain otomatis
dianggap tidak login.
⚠️ Jangan ubah `sameSite` di `src/lib/auth.ts` menjadi `"none"` — itu membuka celah ini.

**Upload berkas** (`src/app/api/admin/upload/route.ts`) — contoh praktik yang baik:
- Tipe file di-allowlist (`jpeg/png/webp`); **SVG ditolak**, menutup celah upload-XSS via
  SVG yang sering terlewat karena SVG bisa memuat `<script>`.
- Nama file tidak pernah berasal dari input pengguna — dibuat server dengan
  `crypto.randomUUID()`, sehingga path traversal mustahil.
- Tipe dicek dari **magic bytes** isi file, bukan sekadar percaya header `Content-Type`.
- Disimpan di Supabase Storage dan disajikan dengan Content-Type yang sudah divalidasi.

**Secrets.** Seluruh API key (Groq/Cerebras/Gemini/Tavily) dibaca lewat `process.env` di
sisi server saja, tidak pernah masuk ke bundle browser, dan tidak pernah ikut tercatat di
log. `.env` sudah di-gitignore.

**Webhook/cron.** Hanya ada satu (`/api/cron/promote-scheduled`), digerbangi `CRON_SECRET`,
dan operasinya idempoten sehingga tidak merusak walau ada yang mencoba mengaksesnya.

**Dependency.** Sisa 3 temuan `npm audit` high berasal dari dalam `node_modules/next`
sendiri (postcss/sharp untuk build & pemrosesan gambar), tidak tercapai lewat API yang live.
Baru hilang lewat upgrade Next.js 16 — tidak mendesak.

---

### 4. Region function Vercel dipindah ke Singapura

Ditemukan saat menelusuri keluhan "situs terasa lambat walau diakses sendirian". Bukan
temuan keamanan, tetapi berasal dari sesi audit yang sama, jadi dicatat di sini.

**Masalah:** header situs live menunjukkan `X-Vercel-Id: sin1::iad1::` — function dieksekusi
di `iad1` (Washington DC, AS) sementara database Supabase berada di Singapura
(`ap-southeast-1`). Setiap kueri database menyeberangi Pasifik bolak-balik.

Pemecahan waktu request membuktikan ini **bukan** masalah jaringan pengguna:

```
dns 0,026s   connect 0,034s   tls 0,098s   ← jaringan sehat (~0,1 dtk)
TTFB 5,6s                                  ← server memproses (5,5 dtk)
```

**Perbaikan:** `"regions": ["sin1"]` ditambahkan ke `vercel.json`.

**Hasil setelah deploy — berhasil.** Sempat dikhawatirkan paket Hobby akan mengabaikan
setelan `regions` di `vercel.json` dan mengharuskan perubahan lewat dashboard, tetapi
ternyata dihormati. Header berubah dari `X-Vercel-Id: sin1::iad1::` menjadi
`sin1::sin1::` — function kini sekamar dengan database.

| `/api/health` (hanya `SELECT 1`) | Sebelum | Sesudah |
| --- | --- | --- |
| TTFB | 1,55 / 1,58 / 1,61 dtk | 0,26 / 0,36 / 0,37 / 0,58 / 0,62 dtk |

Turun sekitar 3–6 kali lipat. Karena setiap aksi tombol membayar ongkos ini per kueri,
tombol admin yang menjalankan beberapa kueri berurutan ikut terpangkas berlipat.

**Berkas:** `vercel.json`

---

### 5. Dokumentasi

- **`docs/security-review-2026-08-11.md`** — catatan belajar: konsep XSS (reflected/stored/
  DOM-based), kenapa React aman tetapi `dangerouslySetInnerHTML` adalah pintu belakangnya,
  temuan dan perbaikannya, serta hasil pemeriksaan seluruh area lain.
- **`docs/studi-kasus-lp-iss-downtime.md`** — studi kasus dari project lain (LP-ISS, sistem
  seleksi siswa): sistem down total padahal hanya **89 siswa** mendaftar, karena serverless
  membuka koneksi database langsung (port 5432) alih-alih lewat connection pooler
  (port 6543). Sudah diverifikasi LinkProMedia tidak punya masalah yang sama —
  `DATABASE_URL` memang sudah mengarah ke pooler.

---

## Verifikasi

- `npx tsc --noEmit` — lulus tanpa error.
- `npm run build` — sukses, halaman artikel tetap berstatus `●` (SSG) dan `/` berstatus
  prerendered dengan `revalidate: 60`; CSP tidak merusak caching.
- Diuji di browser terhadap build produksi: homepage, halaman login admin, dan halaman
  artikel (termasuk gambar dari Supabase/Cloudinary) dimuat tanpa pelanggaran CSP.
- Header CSP dikonfirmasi terkirim pada respons.

### Verifikasi di produksi (15 Agustus 2026, setelah deploy)

Diukur langsung ke `media.linkproductive.com`:

| | Sebelum deploy | Sesudah deploy |
| --- | --- | --- |
| Region function (`X-Vercel-Id`) | `sin1::iad1::` | `sin1::sin1::` |
| `/api/health` (jalur tombol) | 1,55–1,72 dtk | 0,26–0,62 dtk |
| Halaman utama | `MISS`, 5,6 dtk | `HIT`, 0,27–0,35 dtk |
| Halaman artikel | `HIT`, 0,49 dtk | `HIT`, 0,50 dtk |
| Header CSP | tidak ada | aktif |

CSP yang terkirim di produksi sudah benar — `script-src 'self' 'unsafe-inline'` **tanpa**
`'unsafe-eval'`, membuktikan cabang `NODE_ENV === "production"` bekerja dan kelonggaran
dev tidak ikut ter-deploy.

Catatan: halaman utama sempat masih `MISS` beberapa saat setelah push. Ternyata commit
`fcefd6a` (halaman utama statis/ISR) sudah ter-push sebelumnya tetapi belum pernah
ter-deploy; push kali ini yang akhirnya memicu deployment berisi perbaikan itu.

### Catatan soal uji beban

Uji beban 1000 koneksi bersamaan sempat dijalankan di laptop, tetapi angkanya **tidak valid**
sebagai gambaran produksi: satu mesin menjalankan server sekaligus alat penyerangnya,
sehingga keduanya berebut CPU. Selain itu di Vercel halaman ter-cache dilayani CDN edge,
bukan oleh function Node, sehingga kapasitas sebenarnya jauh di atas apa pun yang bisa
diukur dari satu laptop. Untuk angka yang berarti, uji beban harus diarahkan ke preview
deployment dari mesin terpisah.

---

## Sisa pekerjaan (tidak mendesak)

- Upgrade ke Next.js 16 untuk membereskan 3 sisa temuan `npm audit` high.
- Pertimbangkan `isomorphic-dompurify` menggantikan `sanitizeHtml()` berbasis regex, kalau
  butuh jaminan lebih kuat terhadap HTML bertingkat.
- Tambahkan komentar di `src/lib/auth.ts` yang menegaskan "jangan ubah `sameSite`", supaya
  proteksi CSRF implisit tidak ter-regresi tanpa sadar di kemudian hari.
- `POST /api/analytics` terpanggil pada setiap kunjungan dan tidak ikut ter-cache, jadi
  tetap satu operasi tulis per pengunjung saat traffic melonjak.
