"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

const SESSION_KEY = "linkpromedia:session";

/** ID sesi kunjungan — hidup selama tab dibuka, bukan pengenal permanen */
function getSessionId(): string {
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    // Penyimpanan diblokir — pakai id sekali pakai
    return crypto.randomUUID();
  }
}

/**
 * Merekam kunjungan halaman & lama baca.
 *
 * Cukup mengirim path — server yang mencocokkannya ke artikel, sehingga
 * komponen ini bisa dipasang sekali saja di layout tanpa risiko rekam ganda.
 */
export default function AnalyticsTracker() {
  const pathname = usePathname();
  const viewIdRef = useRef<string | null>(null);
  const startedAtRef = useRef<number>(Date.now());
  const sentRef = useRef(false);

  useEffect(() => {
    viewIdRef.current = null;
    startedAtRef.current = Date.now();
    sentRef.current = false;

    let cancelled = false;

    fetch("/api/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: pathname,
        sessionId: getSessionId(),
        referrer: document.referrer || null,
      }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.viewId) viewIdRef.current = data.viewId;
      })
      .catch(() => {
        // Statistik gagal direkam tidak boleh mengganggu pembaca
      });

    /** Kirim lama baca — dipanggil saat halaman ditinggalkan */
    function sendDuration() {
      if (sentRef.current || !viewIdRef.current) return;
      sentRef.current = true;

      const duration = Math.round((Date.now() - startedAtRef.current) / 1000);
      if (duration < 2) return; // terlalu singkat, kemungkinan salah klik

      const payload = JSON.stringify({ viewId: viewIdRef.current, duration });

      // sendBeacon tetap terkirim walau halaman sudah ditutup
      if (navigator.sendBeacon) {
        navigator.sendBeacon("/api/analytics/duration", payload);
      } else {
        fetch("/api/analytics/duration", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payload,
          keepalive: true,
        }).catch(() => {});
      }
    }

    // 'pagehide' lebih andal daripada 'beforeunload' di perangkat seluler
    window.addEventListener("pagehide", sendDuration);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") sendDuration();
    });

    return () => {
      cancelled = true;
      sendDuration();
      window.removeEventListener("pagehide", sendDuration);
    };
  }, [pathname]);

  return null;
}
