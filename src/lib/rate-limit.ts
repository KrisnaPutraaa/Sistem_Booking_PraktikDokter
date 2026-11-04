/**
 * Batas percobaan (Fase 6). Bagian murni: daftar batas dan pembacaan IP klien.
 * Penghitungan ada di database (hit_rate_limit), kunci disimpan sebagai HMAC,
 * jadi IP dan email tidak pernah tersimpan mentah. Lihat rate-limit.server.ts.
 *
 * Batas ini kebijakan keamanan, bukan pengaturan praktik, sehingga ditulis di
 * kode (bukan practice_settings). Ambil nomor sengaja longgar: operator seluler
 * sering memakai satu IP untuk banyak pelanggan, dan Turnstile sudah menyaring bot.
 */
export const RATE_LIMITS = {
  takeQueueIp: { bucket: "take_queue_ip", max: 10, windowSeconds: 15 * 60 },
  loginIp: { bucket: "login_ip", max: 20, windowSeconds: 15 * 60 },
  loginEmail: { bucket: "login_email", max: 8, windowSeconds: 15 * 60 },
  mfaUser: { bucket: "mfa_user", max: 8, windowSeconds: 15 * 60 },
  recoveryUser: { bucket: "recovery_user", max: 5, windowSeconds: 60 * 60 },
  passwordUser: { bucket: "password_user", max: 5, windowSeconds: 15 * 60 },
} as const;

export type RateLimitRule = (typeof RATE_LIMITS)[keyof typeof RATE_LIMITS];

const IPV4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;

/**
 * IP klien dari header yang dipasang Vercel. Vercel menimpa x-forwarded-for
 * dengan IP asli, jadi nilai dari klien tidak dipercaya mentah-mentah; di luar
 * Vercel (mis. lokal) header bisa tidak ada dan semua permintaan berbagi satu
 * kunci "unknown". IPv6 diringkas ke prefiks /64 karena satu pelanggan biasanya
 * memegang satu /64 penuh.
 */
export function clientIpKey(get: (name: string) => string | null): string {
  const raw =
    get("x-vercel-forwarded-for") ?? get("x-real-ip") ?? get("x-forwarded-for")?.split(",")[0] ?? null;
  const ip = raw?.trim() ?? "";
  if (IPV4.test(ip)) return ip;
  const v6 = ipv6Prefix64(ip);
  return v6 ?? "unknown";
}

function ipv6Prefix64(ip: string): string | null {
  if (!ip.includes(":") || ip.length > 45 || !/^[0-9a-fA-F:.]+$/.test(ip)) return null;
  const parts = ip.split("::");
  if (parts.length > 2) return null;
  const head = parts[0] ? parts[0].split(":") : [];
  const tail = parts.length === 2 && parts[1] ? parts[1].split(":") : [];
  // IPv4 tertanam (::ffff:1.2.3.4) dihitung dua kelompok.
  const groups = (list: string[]) => list.reduce((n, g) => n + (IPV4.test(g) ? 2 : 1), 0);
  const missing = 8 - groups(head) - groups(tail);
  if (parts.length === 1 && missing !== 0) return null;
  if (missing < 0) return null;
  const full = [...head, ...Array<string>(parts.length === 2 ? missing : 0).fill("0"), ...tail];
  if (full.slice(0, 4).some((g) => !/^[0-9a-fA-F]{1,4}$/.test(g))) return null;
  return `${full
    .slice(0, 4)
    .map((g) => g.toLowerCase().replace(/^0+(?=.)/, ""))
    .join(":")}::/64`;
}

/** Pesan umum: tidak menyebut batas persis atau akun mana yang dicoba. */
export const RATE_LIMITED_MESSAGE = "Terlalu banyak percobaan. Tunggu sekitar 15 menit, lalu coba lagi.";
