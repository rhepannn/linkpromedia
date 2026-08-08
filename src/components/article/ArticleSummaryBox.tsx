interface Props {
  points: string[];
}

/**
 * Kotak "Inti Berita" yang dilihat PEMBACA di atas isi artikel,
 * supaya inti beritanya tertangkap cepat tanpa membaca seluruh artikel.
 */
export default function ArticleSummaryBox({ points }: Props) {
  if (points.length === 0) return null;

  return (
    <aside className="mb-6 rounded-xl border border-primary-100 bg-primary-50/60 p-5">
      <div className="mb-3 flex items-center gap-2">
        <svg className="h-4 w-4 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        <h2 className="text-sm font-bold uppercase tracking-wide text-primary-700">Inti Berita</h2>
      </div>
      <ul className="space-y-2">
        {points.map((point, i) => (
          <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-body">
            <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary-600" aria-hidden="true" />
            {point}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-text-muted">Rangkuman dibuat otomatis oleh AI dari isi artikel.</p>
    </aside>
  );
}
