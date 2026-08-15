import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/**",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            // SAMEORIGIN, bukan DENY: pratinjau langsung di /admin/pengaturan
            // meng-iframe halaman "/" (same-origin). DENY memblokir SEMUA
            // framing termasuk milik sendiri, jadi pratinjau tampil kosong di
            // produksi. Clickjacking dari situs lain tetap tertangkal.
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value:
              "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
          {
            // CSP sengaja TANPA nonce. Nonce mengharuskan nilainya tertanam di
            // HTML tiap request, artinya root layout harus membaca headers() —
            // dan itu membuat SELURUH halaman jadi dynamic, sehingga halaman
            // artikel kehilangan status statis/ISR-nya dan tiap pembaca memicu
            // render + kueri DB sendiri. Untuk situs berita, ketahanan saat
            // lonjakan pembaca lebih berharga daripada memblokir eksekusi
            // script inline.
            //
            // Karena itu script-src memakai 'unsafe-inline' (dibutuhkan skrip
            // bootstrap inline Next.js & ThemeScript), tapi jalur PENCURIAN
            // data tetap ditutup: connect-src/img-src/form-action membatasi ke
            // mana data boleh dikirim, jadi payload XSS tidak punya kanal untuk
            // mengirim cookie ke server penyerang.
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              // 'unsafe-eval' hanya muncul di dev — dev server Next.js
              // memakai eval() untuk fast refresh; build produksi tidak.
              `script-src 'self' 'unsafe-inline'${
                process.env.NODE_ENV === "production" ? "" : " 'unsafe-eval'"
              }`,
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https://res.cloudinary.com https://*.public.blob.vercel-storage.com https://*.supabase.co",
              "media-src 'self' blob:",
              "font-src 'self' data:",
              "connect-src 'self'",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'self'",
            ].join("; "),
          },
        ],
      },
      {
        source: "/(.*)",
        headers: [
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
        ],
        has: [{ type: "header", key: "x-forwarded-proto", value: "https" }],
      },
    ];
  },
};

export default nextConfig;
