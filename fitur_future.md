# Fitur Masa Depan — Belum Dikerjakan

Catatan fitur dari daftar "Future Ideas" roadmap yang sempat ditandai dibatalkan, tapi ternyata masih diminati user (dibahas ulang 2026-08-05). Statusnya: **ditunda**, bukan dibatalkan — user mau lanjut ke hal lain dulu, ini catatan supaya tidak perlu riset ulang dari nol nanti.

---

## AI Video Article — ✅ SUDAH DIKERJAKAN (2026-08-05)

**Perkiraan awal di dokumen ini SALAH.** Dulu ditulis fitur ini butuh layanan render berbayar (Shotstack/Creatomate) karena Vercel serverless tidak punya `ffmpeg`. Ternyata perakitan video bisa dilakukan **sepenuhnya di browser** lewat canvas + MediaRecorder — terbukti menghasilkan berkas MP4 asli 1080×1920 yang bisa diputar, tanpa ffmpeg, tanpa server render, tanpa biaya.

Sudah terpasang sebagai panel "Video Artikel" di editor artikel:

- `src/lib/videoScript.ts` — AI memecah artikel jadi 3–6 adegan teks (Groq, sudah aktif)
- `src/lib/videoRenderer.ts` — merakit adegan jadi MP4 di browser
- `src/components/admin/VideoPanel.tsx` — UI redaksi (susun naskah → sunting → render → unduh)
- `src/app/api/admin/ai/video-script/route.ts` — endpoint naskah

**Dua batasan yang harus diketahui sebelum mengubah `videoRenderer.ts`:**

1. Gambar digerakkan `setInterval`, **bukan** `requestAnimationFrame`. rAF berhenti total saat tab tidak terlihat, jadi render menggantung selamanya kalau redaksi pindah tab.
2. Perekaman berjalan **real-time**. MediaRecorder memberi cap waktu per frame saat ditangkap, jadi menggambar secepat mungkin merusak durasi video. Video 15 detik memang butuh 15 detik untuk direkam — ini batasan MediaRecorder, bukan kelambatan yang bisa dioptimalkan.

### Yang MASIH tertunda dari fitur ini: narasi suara

Versi sekarang **video bisu dengan teks layar** — format standar reels berita, karena mayoritas ditonton tanpa suara.

Untuk menambah narasi, tetap butuh API TTS berbayar (ElevenLabs / Google Cloud TTS / OpenAI TTS). Web Speech API bawaan browser tidak bisa direkam ke dalam video — keluarannya langsung ke perangkat audio, tidak bisa disalurkan ke MediaRecorder. Kalau nanti TTS ditambahkan, audionya digabungkan ke stream lewat `AudioContext` + `MediaStreamDestination`, lalu dicampur dengan stream canvas.

---

## AI Podcast Generator

Mengubah artikel jadi audio (ringkasan dibacakan, format podcast singkat).

### Alur teknis (lebih sederhana dari Video Article)

1. **Naskah** — sama seperti Video Article, pakai Groq untuk meringkas jadi skrip narasi.
2. **Suara** — sama-sama butuh API TTS berbayar (ElevenLabs/Google Cloud TTS/OpenAI TTS) karena hasilnya harus jadi file audio yang bisa diunduh/diputar ulang, bukan cuma Web Speech API browser.
3. **Selesai** — tidak perlu tahap render video/ffmpeg sama sekali. File audio (MP3) bisa langsung disimpan ke storage (Supabase Storage yang sudah dipakai Media Library) dan disajikan lewat `<audio>` player biasa.

### Kenapa ini jauh lebih mudah dari Video Article

Tidak ada masalah render/ffmpeg/serverless timeout — cuma butuh satu API TTS dan penyimpanan file yang infrastrukturnya sudah ada (Supabase Storage). Ini kandidat yang lebih masuk akal untuk dicoba lebih dulu.

**Rekomendasi:** kalau mau mulai eksplorasi salah satu dari dua fitur ini, mulai dari sini dulu — biaya riset & percobaan jauh lebih murah, dan infrastrukturnya sudah 90% ada.

---

## Ringkasan status

| | AI Podcast Generator | AI Video Article |
|---|---|---|
| Status | Tertunda | **Sudah jalan** (versi bisu) |
| Provider baru dibutuhkan | 1 (TTS berbayar) | Tidak ada — Groq yang sudah aktif sudah cukup |
| Infrastruktur baru | Tidak ada (pakai Supabase Storage yang ada) | Tidak ada — dirakit di browser |
| Risiko timeout serverless | Tidak ada | Tidak ada — tidak menyentuh server sama sekali |
| Sisa pekerjaan | Seluruhnya | Hanya narasi suara (butuh TTS berbayar) |

Catatan: kedua fitur ini sekarang tersisa **satu hambatan yang sama** — API text-to-speech berbayar. Kalau nanti berlangganan satu TTS, keduanya bisa dilengkapi sekaligus.
