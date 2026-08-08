/**
 * Menerapkan tema, ukuran huruf, & lebar sidebar admin SEBELUM halaman
 * digambar, supaya tidak berkedip putih dulu saat pembaca memilih tema gelap
 * atau sidebar sempat melebar lalu menyempit tiap pindah halaman.
 */
const script = `
(function () {
  try {
    var t = localStorage.getItem('linkpromedia:theme');
    if (!t || t === 'system') {
      t = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    document.documentElement.setAttribute('data-theme', t);

    var s = localStorage.getItem('linkpromedia:reader-scale');
    if (s) document.documentElement.style.setProperty('--reader-scale', s);

    if (localStorage.getItem('linkpromedia:sidebar') === 'tutup') {
      document.documentElement.setAttribute('data-sidebar', 'tutup');
    }
  } catch (e) {}
})();
`;

export default function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
