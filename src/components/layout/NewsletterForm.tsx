"use client";

import { useState } from "react";

export default function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setSending(true);
    setMessage("");
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (res.ok) {
        setMessage(data.message ?? "Terima kasih sudah berlangganan.");
        setIsError(false);
        setEmail("");
      } else {
        setMessage(data.error ?? "Gagal mendaftar.");
        setIsError(true);
      }
    } catch {
      setMessage("Terjadi kesalahan jaringan.");
      setIsError(true);
    } finally {
      setSending(false);
    }
  }

  return (
    <div>
      <h3 className="text-white font-semibold text-sm mb-3 uppercase tracking-wide">Newsletter</h3>
      <p className="text-sm text-gray-400 mb-3 leading-relaxed">
        Dapatkan kabar terbaru langsung di email kamu.
      </p>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="email@kamu.com"
          aria-label="Alamat email untuk berlangganan"
          className="flex-1 min-w-0 rounded-lg bg-primary-700 border border-primary-600 px-3 py-2 text-sm text-white placeholder:text-primary-300 focus:outline-none focus:ring-2 focus:ring-accent"
        />
        <button
          type="submit"
          disabled={sending}
          className="flex-shrink-0 bg-accent text-accent-text px-4 py-2 rounded-lg text-sm font-semibold hover:brightness-95 transition disabled:opacity-60"
        >
          {sending ? "..." : "Daftar"}
        </button>
      </form>
      {message && (
        <p role="status" className={`text-xs mt-2 ${isError ? "text-red-300" : "text-green-300"}`}>
          {message}
        </p>
      )}
    </div>
  );
}
