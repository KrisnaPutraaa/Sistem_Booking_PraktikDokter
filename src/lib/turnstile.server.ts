import "server-only";
import { resolveTurnstileKeys } from "./turnstile-config";

const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

function keys() {
  return resolveTurnstileKeys({
    NODE_ENV: process.env.NODE_ENV,
    VERCEL_ENV: process.env.VERCEL_ENV,
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
    TURNSTILE_SECRET_KEY: process.env.TURNSTILE_SECRET_KEY,
  });
}

/** Site key untuk widget di browser (dikirim sebagai prop dari Server Component). */
export function turnstileSiteKey(): string {
  return keys().siteKey;
}

/**
 * Verifikasi token Turnstile ke Cloudflare. False bila token ditolak, sudah
 * dipakai, kedaluwarsa, atau Cloudflare tidak bisa dihubungi (gagal tertutup).
 */
export async function verifyTurnstile(token: string): Promise<boolean> {
  const { secretKey } = keys();
  try {
    const res = await fetch(SITEVERIFY_URL, {
      method: "POST",
      body: new URLSearchParams({ secret: secretKey, response: token }),
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { success?: unknown };
    return data.success === true;
  } catch {
    return false;
  }
}
