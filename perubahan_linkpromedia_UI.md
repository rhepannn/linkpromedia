# FORMAT LAPORAN PERUBAHAN
 NAMA PERUBAHAN, FITUR ATAU PERBAIKAN, TANGGAL PERUBAHAN

---

| Nama Perubahan | Fitur / Perbaikan | Tanggal |
| --- | --- | --- |
| Halaman utama kembali statis (ISR) — hapus pemicu dynamic rendering | Perbaikan | 14 Agustus 2026 |
| Hilangkan waterfall kueri di halaman utama | Perbaikan | 14 Agustus 2026 |
| Streaming per seksi dengan Suspense + kerangka pemuatan | Perbaikan | 14 Agustus 2026 |
| Personalisasi urutan kategori dipindah ke sisi klien | Perbaikan | 14 Agustus 2026 |

---

## Latar Belakang

Muncul pertanyaan apakah perlu menambahkan **splash screen** agar situs terasa
"langsung tampil semua". Setelah ditelusuri, splash screen **tidak dipakai** —
halaman utama sudah memakai Server Components dan mengirim HTML lengkap dari server,
jadi tidak ada tahap kosong yang perlu ditutupi. Splash screen justru menunda konten
yang sebenarnya sudah siap, dan merugikan LCP serta SEO untuk situs berita.

Delay yang dirasakan ternyata berasal dari dua hal lain di bawah ini.

---

## Detail Perubahan

### 1. Halaman utama kembali statis (ISR)

**Masalah:** `getPreferensiKategori()` memanggil `cookies()` dan dipakai langsung di
halaman utama. Di Next.js App Router, `cookies()` adalah Dynamic API — memakainya
membuat SELURUH route jadi dynamic, sehingga `export const revalidate = 60` tidak
pernah berlaku. Akibatnya setiap pengunjung memicu render baru + seluruh kueri DB
dari nol, dan HTML tidak pernah tersaji dari cache ISR/CDN.

**Perbaikan:** pembacaan cookie dihapus dari jalur render server.
`src/lib/preferensiPembaca.ts` dihapus karena menjadi dead code sekaligus jebakan —
memanggilnya di halaman mana pun akan mematikan cache halaman itu tanpa peringatan.

**Dampak:** dulu setiap pengunjung memicu render + sekitar 10 kueri DB sendiri.
Sekarang HTML tersaji dari cache, dan DB hanya tersentuh sekali per 60 detik.

**Bukti:** tabel route hasil `next build` menunjukkan `○ /` dengan `Revalidate 1m`
(sebelumnya `ƒ` alias dynamic).

**Berkas:** `src/app/(public)/page.tsx`, `src/lib/preferensiPembaca.ts` (dihapus)

---

### 2. Hilangkan waterfall kueri

**Masalah:** ada tiga gelombang kueri berurutan — `Promise.all([...])` →
`await getCategories()` → `await Promise.all(artikel per kategori)`. Gelombang kedua
menunggu gelombang pertama padahal tidak bergantung padanya sama sekali.

**Perbaikan:** setiap seksi menarik datanya sendiri di dalam `<Suspense>` masing-masing,
sehingga React menjalankan semuanya paralel. Komponen `HomePage` tidak lagi `async`.

**Berkas:** `src/app/(public)/page.tsx`

---

### 3. Streaming per seksi dengan Suspense

**Perbaikan:** halaman dipecah jadi komponen async terpisah — `SeksiHero`,
`SeksiPilihanRedaksi`, `SeksiTren`, `SeksiBeritaTerbaru`, `SeksiKategori` — masing-masing
dibungkus `<Suspense>`. Hero dapat tersaji lebih dulu tanpa menunggu seluruh halaman.

Kerangka pemuatan (`KerangkaHero`, `KerangkaTerbaru`) dibuat setinggi konten aslinya
supaya konten yang menyusul tidak mendorong apa pun ke bawah (menjaga CLS tetap rendah).

**Berkas:** `src/app/(public)/page.tsx`

---

### 4. Personalisasi urutan kategori di sisi klien

**Perbaikan:** komponen baru `KategoriPersonalisasi` membaca cookie `lp-pref` setelah
hidrasi, lalu menaikkan kategori favorit memakai `order` CSS — bukan memindahkan node,
sehingga DOM tidak dibongkar-pasang dan gambar tidak termuat ulang. Label
"· favorit kamu" dirender tersembunyi di HTML statis (`keteranganTersembunyi` pada
`JudulSeksi`) lalu diungkap klien, supaya preferensi tidak bocor ke HTML bersama.

**Perubahan tata letak yang disengaja:** kategori favorit kini berada dalam satu blok
di bawah "Berita Terbaru", bukan blok terpisah di atasnya. Karena personalisasi terjadi
setelah hidrasi, posisi lama akan mendorong seluruh halaman turun setiap kali dimuat.
Letak baru berada di bawah layar, jadi pengurutan ulangnya tidak terlihat pembaca.

**Penurunan yang aman:** tanpa JavaScript, pembaca tetap melihat seluruh kategori —
hanya urutannya yang bawaan.

**Berkas:** `src/components/article/KategoriPersonalisasi.tsx` (baru),
`src/components/layout/JudulSeksi.tsx`

---

## Verifikasi

- `npx tsc --noEmit` — lulus tanpa error.
- `npm run build` — sukses (exit 0), 87 halaman statis dihasilkan.
- Tabel route: `○ /` dengan `Revalidate 1m` / `Expire 1y`.
- HTML pra-render halaman utama: 147 KB konten nyata, 11 `<section>`, 5 seksi kategori
  ber-`data-kategori` dalam urutan bawaan, dan 5 label favorit seluruhnya ber-class
  `hidden` (preferensi tidak bocor ke HTML bersama).
