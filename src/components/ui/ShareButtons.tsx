"use client";

interface Props {
  url: string;
  title: string;
  /** Dipakai untuk mencatat share sebagai sinyal peringkat tren */
  slug?: string;
}

export default function ShareButtons({ url, title, slug }: Props) {
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  /** Catat share; kegagalan pencatatan tidak boleh mengganggu aksi berbagi */
  function catatShare() {
    if (!slug) return;
    const payload = JSON.stringify({ slug });
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/articles/share", new Blob([payload], { type: "application/json" }));
    } else {
      fetch("/api/articles/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true,
      }).catch(() => {});
    }
  }

  const platforms = [
    {
      name: "WhatsApp",
      href: `https://api.whatsapp.com/send?text=${encodedTitle}%20${encodedUrl}`,
      // Hijau terang WhatsApp cuma 2,2:1 dengan teks putih, dan hijau gelap
      // resminya (#128C7E) masih 4,14 — sedikit di bawah ambang. #118275
      // mencapai 4,69 dan masih terbaca sebagai hijau khas WhatsApp.
      bgClass: "bg-[#118275] hover:bg-[#0E6F64]",
      icon: (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
          <path d="M12 0C5.373 0 0 5.373 0 12c0 2.125.557 4.126 1.535 5.861L0 24l6.305-1.654A11.945 11.945 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.96 0-3.795-.5-5.39-1.375l-.387-.23-3.744.982.999-3.647-.252-.4A9.961 9.961 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" />
        </svg>
      ),
    },
    {
      name: "X (Twitter)",
      href: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`,
      bgClass: "bg-black hover:bg-gray-800",
      icon: (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      ),
    },
    {
      name: "Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      bgClass: "bg-blue-600 hover:bg-blue-700",
      icon: (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      ),
    },
  ];

  async function copyLink() {
    catatShare();
    try {
      await navigator.clipboard.writeText(url);
      alert("Link berhasil disalin!");
    } catch {
      // fallback
    }
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-sm font-medium text-gray-600">Bagikan:</span>
      {platforms.map((p) => (
        <a
          key={p.name}
          href={p.href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={catatShare}
          aria-label={`Bagikan ke ${p.name}`}
          className={`inline-flex items-center gap-1.5 text-white text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${p.bgClass}`}
        >
          {p.icon}
          <span className="hidden sm:inline">{p.name}</span>
        </a>
      ))}
      <button
        onClick={copyLink}
        aria-label="Salin link"
        className="inline-flex items-center gap-1.5 text-gray-600 text-xs font-medium px-3 py-1.5 rounded-full border border-gray-200 hover:bg-gray-100 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
        <span className="hidden sm:inline">Salin</span>
      </button>
    </div>
  );
}
