/**
 * Service Worker LinkProMedia — Offline Reading.
 *
 * Prinsip yang dipakai:
 * - Artikel yang PERNAH dibuka pembaca disimpan, supaya bisa dibaca lagi
 *   saat sinyal hilang (di kereta, lift, daerah blank spot).
 * - Halaman berita SELALU diambil dari jaringan lebih dulu (network-first).
 *   Untuk situs berita, menyajikan versi cache padahal ada versi baru itu
 *   berbahaya — pembaca bisa melihat kabar usang tanpa sadar.
 * - Cache hanya dipakai sebagai penyelamat saat jaringan benar-benar gagal.
 * - Halaman admin, API, dan preview TIDAK PERNAH di-cache: isinya bisa
 *   memuat draf/data sensitif dan harus selalu segar.
 */

const VERSI = "v1";
const CACHE_HALAMAN = `linkpromedia-halaman-${VERSI}`;
const CACHE_ASET = `linkpromedia-aset-${VERSI}`;
const HALAMAN_OFFLINE = "/offline";

/** Batas jumlah artikel yang disimpan, supaya penyimpanan ponsel tidak jebol */
const MAKS_HALAMAN_TERSIMPAN = 50;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_HALAMAN).then((cache) => cache.add(HALAMAN_OFFLINE))
  );
  // Aktifkan versi baru tanpa menunggu tab lama ditutup
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((nama) =>
        Promise.all(
          nama
            .filter((n) => n.startsWith("linkpromedia-") && !n.endsWith(VERSI))
            .map((n) => caches.delete(n))
        )
      )
      .then(() => self.clients.claim())
  );
});

/** Buang entri terlama bila cache melewati batas */
async function pangkasCache(namaCache, maks) {
  const cache = await caches.open(namaCache);
  const kunci = await cache.keys();
  if (kunci.length <= maks) return;
  // keys() berurutan dari yang paling lama dimasukkan
  await Promise.all(kunci.slice(0, kunci.length - maks).map((k) => cache.delete(k)));
}

function bolehDisimpan(url) {
  const path = url.pathname;
  // Jangan pernah menyimpan area admin, API, atau pratinjau draf
  if (path.startsWith("/admin") || path.startsWith("/api") || path.includes("/preview/")) {
    return false;
  }
  return true;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  // Hanya tangani permintaan ke domain sendiri
  if (url.origin !== self.location.origin) return;
  if (!bolehDisimpan(url)) return;

  // Halaman (navigasi) — network-first supaya berita selalu yang terbaru
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((respons) => {
          if (respons.ok) {
            const salinan = respons.clone();
            caches.open(CACHE_HALAMAN).then((cache) => {
              cache.put(request, salinan);
              pangkasCache(CACHE_HALAMAN, MAKS_HALAMAN_TERSIMPAN);
            });
          }
          return respons;
        })
        .catch(async () => {
          // Jaringan mati — sajikan versi yang pernah dibaca, atau halaman offline
          const tersimpan = await caches.match(request);
          return tersimpan ?? caches.match(HALAMAN_OFFLINE);
        })
    );
    return;
  }

  // Aset statis JS/CSS — cache-first, isinya ber-hash sehingga versi
  // baru selalu punya URL berbeda. Font menggunakan network-first dengan
  // fallback cache supaya tidak menyajikan versi yang sudah kadaluwarsa.
  if (url.pathname.startsWith("/_next/static")) {
    event.respondWith(
      caches.match(request).then(
        (tersimpan) =>
          tersimpan ??
          fetch(request).then((respons) => {
            if (respons.ok) {
              const salinan = respons.clone();
              caches.open(CACHE_ASET).then((cache) => cache.put(request, salinan));
            }
            return respons;
          })
      )
    );
    return;
  }

  if (request.destination === "font") {
    event.respondWith(
      caches.match(request).then((tersimpan) => {
        const ambil = fetch(request).then((respons) => {
          if (respons.ok) {
            const salinan = respons.clone();
            caches.open(CACHE_ASET).then((cache) => cache.put(request, salinan));
          }
          return respons;
        });
        return tersimpan ?? ambil;
      })
    );
    return;
  }
});

/**
 * Push Notification — menampilkan kabar Breaking News.
 * Payload gagal diurai tidak boleh membuat notifikasi kosong muncul,
 * jadi ada nilai cadangan yang tetap masuk akal bagi pembaca.
 */
self.addEventListener("push", (event) => {
  let data = { title: "LinkProMedia", body: "Ada berita terbaru.", url: "/" };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    // biarkan pakai nilai cadangan
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icon-512.png",
      badge: "/icon-512.png",
      // Notifikasi baru menggantikan yang lama alih-alih menumpuk di layar
      tag: "linkpromedia-breaking",
      renotify: true,
      data: { url: data.url },
    })
  );
});

/** Klik notifikasi — fokuskan tab yang sudah terbuka, atau buka tab baru */
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const tujuan = event.notification.data?.url ?? "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((daftarTab) => {
      for (const tab of daftarTab) {
        if (tab.url.includes(tujuan) && "focus" in tab) return tab.focus();
      }
      return self.clients.openWindow(tujuan);
    })
  );
});
