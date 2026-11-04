import type { NextConfig } from "next";

// CSP sengaja ditunda ke Fase 6 (perlu mengizinkan Turnstile dan script Next).
const securityHeaders = [
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
  // Next dev mencetak argumen Server Action ke terminal (bisa berisi email staf,
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
