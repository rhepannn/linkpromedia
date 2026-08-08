/**
 * Menyisipkan data terstruktur Schema.org ke halaman.
 * Dibaca mesin pencari, tidak terlihat oleh pembaca.
 */
export default function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
