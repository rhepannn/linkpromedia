"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  /** Judul artikel — dibacakan lebih dulu sebelum isi */
  title: string;
  /** Isi artikel dalam bentuk HTML */
  content: string;
}

type Status = "idle" | "playing" | "paused";

/** Ubah HTML jadi teks bersih yang enak dibacakan */
function toSpeakableText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, ". ")
    .replace(/<\/(p|h[1-6]|li|blockquote)>/gi, ". ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "dan")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .replace(/\.\s*\./g, ".")
    .trim();
}

export default function TextToSpeech({ title, content }: Props) {
  const [supported, setSupported] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    setSupported(typeof window !== "undefined" && "speechSynthesis" in window);

    // Hentikan pembacaan kalau pembaca pindah halaman
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  function play() {
    const text = `${title}. ${toSpeakableText(content)}`;
    if (!text.trim()) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "id-ID";
    utterance.rate = 1;

    // Pakai suara Bahasa Indonesia kalau tersedia di perangkat pembaca
    const voices = window.speechSynthesis.getVoices();
    const indonesian = voices.find((v) => v.lang === "id-ID" || v.lang.startsWith("id"));
    if (indonesian) utterance.voice = indonesian;

    utterance.onend = () => setStatus("idle");
    utterance.onerror = () => setStatus("idle");

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
    setStatus("playing");
  }

  function pause() {
    window.speechSynthesis.pause();
    setStatus("paused");
  }

  function resume() {
    window.speechSynthesis.resume();
    setStatus("playing");
  }

  function stop() {
    window.speechSynthesis.cancel();
    setStatus("idle");
  }

  if (!supported) return null;

  const btnClass =
    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gray-200 text-xs font-medium text-gray-600 hover:border-primary-300 hover:text-primary-600 transition-colors";

  return (
    <div className="flex items-center gap-2">
      {status === "idle" && (
        <button type="button" onClick={play} className={btnClass} title="Dengarkan artikel ini">
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
              clipRule="evenodd"
            />
          </svg>
          Dengarkan
        </button>
      )}

      {status === "playing" && (
        <>
          <button type="button" onClick={pause} className={btnClass} title="Jeda">
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10A8 8 0 11.999 10 8 8 0 0118 10zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            Jeda
          </button>
          <button type="button" onClick={stop} className={btnClass} title="Berhenti">
            Berhenti
          </button>
        </>
      )}

      {status === "paused" && (
        <>
          <button type="button" onClick={resume} className={btnClass} title="Lanjutkan">
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                clipRule="evenodd"
              />
            </svg>
            Lanjutkan
          </button>
          <button type="button" onClick={stop} className={btnClass} title="Berhenti">
            Berhenti
          </button>
        </>
      )}
    </div>
  );
}
