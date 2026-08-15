# Studi Kasus: Production Down — LP-ISS (Seleksi Siswa Industri)

Studi kasus dari pengalaman nyata: sistem pendaftaran/seleksi siswa (`LP-ISS`, project terpisah di `C:\Users\ASUS\Documents\interview\lp-iss`) sempat down total saat form pendaftaran dibuka, dengan hanya **89 siswa** yang mengakses. Dicatat di sini sebagai bahan belajar karena pola kegagalannya sangat umum terjadi di kombinasi **Next.js + serverless (Vercel) + PostgreSQL**, dan mudah terulang di project lain kalau tidak diwaspadai sejak awal.

## Kronologi masalah

- Stack: Next.js (App Router, Server Actions), Prisma ORM, PostgreSQL di Supabase, hosting di Vercel.
- Saat form pendaftaran (`/daftar`) dibuka untuk umum, hanya ~89 siswa yang mencoba mendaftar dalam rentang waktu berdekatan — jumlah yang secara umum **sangat kecil** untuk ukuran "traffic tinggi".
- Sistem down total: request menggantung/timeout, submit gagal, halaman lain pun ikut terganggu.

**Poin penting:** 89 pengguna bersamaan seharusnya bukan beban berat untuk aplikasi web modern. Down di angka sekecil itu adalah tanda kuat ada **bug/kesalahan konfigurasi spesifik**, bukan murni soal "kurang kapasitas".

## Root cause

Ditemukan lewat pemeriksaan `prisma/schema.prisma` project tersebut — komentarnya sendiri sudah mendokumentasikan penyebabnya:

```prisma
datasource db {
  provider  = "postgresql"
  // Pooled (PgBouncer, port 6543) — used for normal app queries. Serverless
  // functions open many short-lived connections; without pooling this quickly
  // exhausts Supabase's direct connection limit (this is what broke production).
  url       = env("DATABASE_URL")
  // Direct (port 5432) — used only for schema sync (`prisma db push` / migrate).
  directUrl = env("DIRECT_URL")
}
```

**Mekanisme kegagalannya:**

```
89 siswa submit form pendaftaran berdekatan waktu
   → Vercel menjalankan banyak instance serverless function secara PARALEL
     (ini bagian yang memang dirancang auto-scale, bukan masalahnya)
   → tiap instance butuh koneksi ke database Postgres
   → saat itu koneksi dibuka LANGSUNG ke Postgres (port 5432, direct connection)
   → Supabase (dan Postgres pada umumnya) punya batas jumlah koneksi
     langsung yang kecil — jauh lebih kecil dari jumlah instance
     serverless yang bisa berjalan bersamaan
   → slot koneksi habis → request gantung/error "too many connections"
   → siswa yang loading lama jadi refresh berkali-kali
     → makin memperberat beban yang sebenarnya kecil
```

Yang sebenarnya down bukan Vercel (auto-scale-nya bekerja sesuai rancangan), dan bukan juga kode aplikasinya (`src/lib/prisma.ts` di project ini sudah benar — pakai pola singleton, `PrismaClient` tidak dibuat ulang tiap request). **Titik gagalnya murni di lapisan koneksi database**: serverless yang bisa spawn banyak instance paralel dipasangkan dengan database yang hanya sanggup menampung koneksi langsung dalam jumlah terbatas.

## Kenapa ini gampang terlewat

- Di development, biasanya cuma satu proses yang jalan (`npm run dev`) → satu koneksi database → tidak pernah kelihatan masalahnya.
- Di Vercel Preview/testing dengan sedikit orang, jumlah instance paralel juga masih kecil → masih aman.
- Baru kelihatan pas jumlah *pengguna nyata dalam waktu berdekatan* melewati batas koneksi database — yang seringkali jauh lebih kecil dari yang dikira (puluhan, bukan ribuan).

## Perbaikan yang diterapkan

Memisahkan dua jenis koneksi database di `prisma/schema.prisma`, dan mengarahkan tiap kebutuhan ke port yang tepat lewat dua environment variable:

| Variabel | Tujuan | Port | Dipakai untuk |
|---|---|---|---|
| `DATABASE_URL` | Pooler (PgBouncer) | `6543` | **Semua query aplikasi** — request dari serverless function |
| `DIRECT_URL` | Koneksi langsung | `5432` | **Hanya** `prisma db push` / `prisma migrate` (perubahan skema) |

`DATABASE_URL` juga diberi parameter `pgbouncer=true&connection_limit=10&pool_timeout=20` — `connection_limit` dibuat kecil **per instance**, karena pooler-nya sendiri (PgBouncer, dijalankan Supabase) yang bertugas menampung banyak koneksi pendek dari banyak instance serverless yang berjalan bersamaan, lalu menyalurkannya ke Postgres lewat kolam koneksi yang jauh lebih sedikit.

### Kenapa pooler menyelesaikan masalah ini
Koneksi langsung ke Postgres itu "mahal" — tiap koneksi baru butuh proses baru di sisi database. Pooler seperti PgBouncer berada di antara aplikasi dan database: ia menerima banyak koneksi pendek dari luar (ratusan sekaligus, cocok untuk pola serverless), tapi ke database aslinya hanya membuka segelintir koneksi yang dipakai bergantian secara efisien. Request yang datang saat semua koneksi sedang dipakai akan **diantre sebentar** (`pool_timeout`), bukan langsung ditolak seperti pada koneksi langsung yang kehabisan slot.

## Pelajaran untuk project berikutnya (checklist)

- [ ] Kalau stack-nya **serverless (Vercel/Netlify/dst) + PostgreSQL**, **selalu** pakai connection pooler (PgBouncer bawaan Supabase/Neon, atau Prisma Accelerate) untuk query aplikasi — jangan pernah koneksi langsung dari serverless function.
- [ ] Koneksi langsung (`directUrl`) hanya untuk migrasi skema, dijalankan dari mesin developer/CI, bukan dari kode aplikasi yang live.
- [ ] Pastikan `PrismaClient` (atau ORM lain) dibuat sekali lewat pola singleton, tidak `new` di setiap request — ini bug terpisah yang sering muncul bersamaan dengan masalah koneksi, walau di kasus LP-ISS ini sudah benar dari awal.
- [ ] Angka "traffic tinggi" itu relatif — kalau down di jumlah pengguna kecil (puluhan), curigai konfigurasi/bug spesifik dulu sebelum berasumsi butuh "scaling" yang lebih besar.
- [ ] Untuk event dengan jadwal diketahui (pembukaan pendaftaran, deadline submit), lakukan load test (`k6`/`Artillery`) beberapa hari sebelumnya untuk menemukan titik gagal ini sebelum kejadian beneran.

## Kaitan dengan LinkProMedia

Project ini (LinkProMedia) juga pakai Prisma + Supabase di Vercel — pola yang sama berlaku. Sudah dicek (11 Agustus 2026): **konfigurasinya sudah benar**. `DATABASE_URL` mengarah ke transaction pooler (port `6543`, `pgbouncer=true&connection_limit=10`), `DIRECT_URL` cuma dipakai untuk `db push`/migrate. Komentar di `prisma/schema.prisma:12-15` bahkan menjelaskan lebih detail: pooler *session mode* (5432) menahan satu koneksi per klien sepanjang sesi dengan `pool_size` terbatas, yang di serverless tiap instance function dihitung sebagai satu klien — jadi kalau dipakai untuk query biasa pun batas itu tetap cepat habis, makanya query aplikasi harus lewat *transaction mode* (6543). Project ini sudah terlindung dari risiko down seperti yang dialami LP-ISS.
