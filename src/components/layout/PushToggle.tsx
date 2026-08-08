"use client";

import { useEffect, useState } from "react";

type Status = "memeriksa" | "tidak-didukung" | "mati" | "hidup" | "ditolak";

/** Kunci VAPID datang sebagai base64url, sedangkan browser minta ArrayBuffer */
function base64UrlKeBuffer(base64: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normal = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const biner = atob(normal);
  const buffer = new ArrayBuffer(biner.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < biner.length; i++) bytes[i] = biner.charCodeAt(i);
  return buffer;
}

/**
 * Tombol izin Push Notification.
 *
 * Sengaja TIDAK memunculkan dialog izin secara otomatis saat halaman dibuka.
 * Permintaan izin yang muncul tiba-tiba hampir selalu ditolak pembaca, dan
 * penolakan itu permanen — browser tidak akan menanyakannya lagi. Jadi
 * dialog hanya muncul setelah pembaca menekan tombol ini sendiri.
 */
export default function PushToggle() {
  const [status, setStatus] = useState<Status>("memeriksa");
  const [sibuk, setSibuk] = useState(false);

  useEffect(() => {
    const didukung =
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

    if (!didukung) {
      setStatus("tidak-didukung");
      return;
    }
    if (Notification.permission === "denied") {
      setStatus("ditolak");
      return;
    }

    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setStatus(sub ? "hidup" : "mati"))
      .catch(() => setStatus("tidak-didukung"));
  }, []);

  async function nyalakan() {
    setSibuk(true);
    try {
      const izin = await Notification.requestPermission();
      if (izin !== "granted") {
        setStatus(izin === "denied" ? "ditolak" : "mati");
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64UrlKeBuffer(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
      });

      const json = sub.toJSON();
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: sub.endpoint, keys: json.keys }),
      });

      if (res.ok) setStatus("hidup");
      else {
        // Server menolak — jangan tinggalkan langganan yatim di browser
        await sub.unsubscribe();
        setStatus("mati");
      }
    } catch {
      setStatus("mati");
    } finally {
      setSibuk(false);
    }
  }

  async function matikan() {
    setSibuk(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        }).catch(() => {});
        await sub.unsubscribe();
      }
      setStatus("mati");
    } finally {
      setSibuk(false);
    }
  }

  if (status === "memeriksa" || status === "tidak-didukung") return null;

  if (status === "ditolak") {
    // Tampil di footer navy — text-muted terlalu gelap di sana (2,6:1)
    return (
      <p className="text-xs text-gray-400">
        Notifikasi diblokir di pengaturan browser. Aktifkan lewat ikon gembok di bilah alamat.
      </p>
    );
  }

  return (
    <button
      type="button"
      onClick={status === "hidup" ? matikan : nyalakan}
      disabled={sibuk}
      className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-colors disabled:opacity-50 ${
        status === "hidup"
          ? "bg-primary-600 text-white hover:bg-primary-700"
          : "border border-gray-300 text-gray-600 hover:border-primary-300 hover:text-primary-600"
      }`}
    >
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1h6z" />
      </svg>
      {sibuk ? "Memproses..." : status === "hidup" ? "Notifikasi Aktif" : "Aktifkan Notifikasi"}
    </button>
  );
}
