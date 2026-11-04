import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";
const TURNSTILE = "https://challenges.cloudflare.com";

/**
 * CSP (Fase 6). Tanpa nonce, supaya halaman publik tetap bisa dirender statis
 * (nonce memaksa setiap halaman dinamis). Akibatnya script inline Next masih
 * perlu 'unsafe-inline'; sumber script lain dibatasi ke situs ini dan
 * Turnstile. Browser tidak memakai klien Supabase (pasien lewat Server Action,
 * staf lewat cookie di server), jadi connect-src cukup 'self'.
 * Dev: React butuh 'unsafe-eval' dan HMR memakai websocket.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' ${TURNSTILE}${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  // data: untuk kode QR verifikasi dua langkah (SVG dari Supabase).
  "img-src 'self' data: blob:",
  "font-src 'self'",
  `connect-src 'self' ${TURNSTILE}${isDev ? " ws://localhost:* ws://127.0.0.1:*" : ""}`,
  `frame-src ${TURNSTILE}`,
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "manifest-src 'self'",
  "worker-src 'self' blob:",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
];

// Halaman staf dan nomor pasien: tidak diindeks, tidak di-cache.
const privateHeaders = [
  { key: "X-Robots-Tag", value: "noindex, nofollow" },
  { key: "Cache-Control", value: "no-store" },
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  // Next dev mencetak argumen Server Action ke terminal (bisa berisi username staf,
  // token antrean, atau state formulir). Dimatikan: jangan log data pasien.
  logging: { serverFunctions: false },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // Satu halaman masuk untuk semua peran; alamat lain hanya pengalihan (307).
  async redirects() {
    return [
      { source: "/dokter/masuk", destination: "/staf/masuk", permanent: false },
      { source: "/owner/masuk", destination: "/staf/masuk", permanent: false },
    ];
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/staf", headers: privateHeaders },
      { source: "/staf/:path*", headers: privateHeaders },
      { source: "/antrean/:path*", headers: privateHeaders },
    ];
  },
};

export default nextConfig;
