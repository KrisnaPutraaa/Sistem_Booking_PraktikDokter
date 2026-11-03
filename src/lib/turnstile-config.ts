/**
 * Kunci uji resmi Cloudflare Turnstile (developers.cloudflare.com/turnstile/troubleshooting/testing).
 * Site key ini selalu lolos dan tampil; secret ini selalu menerima token uji.
 */
export const TURNSTILE_TEST_SITE_KEY = "1x00000000000000000000AA";
export const TURNSTILE_TEST_SECRET_KEY = "1x0000000000000000000000000000000AA";

/** Semua kunci uji berbentuk <digit>x000...<2 huruf>. */
export function isTurnstileTestKey(key: string): boolean {
  return /^[0-9]x0{10,}[A-Z]{2}$/.test(key);
}

export type TurnstileKeys = { siteKey: string; secretKey: string; testMode: boolean };

type Env = {
  NODE_ENV?: string;
  VERCEL_ENV?: string;
  NEXT_PUBLIC_TURNSTILE_SITE_KEY?: string;
  TURNSTILE_SECRET_KEY?: string;
};

/**
 * Pilih kunci Turnstile.
 * - Development lokal dan Preview Vercel: bila kedua kunci kosong, pakai kunci uji.
 * - Produksi (NODE_ENV=production selain Preview Vercel): kedua kunci wajib diisi dan
 *   bukan kunci uji. Gagal tertutup: tanpa kunci yang sah, nomor tidak dibuat.
 * Pesan galat hanya menyebut nama variabel, tidak pernah nilainya.
 */
export function resolveTurnstileKeys(env: Env): TurnstileKeys {
  const siteKey = env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() ?? "";
  const secretKey = env.TURNSTILE_SECRET_KEY?.trim() ?? "";
  const testAllowed = env.NODE_ENV !== "production" || env.VERCEL_ENV === "preview";

  if (!siteKey && !secretKey) {
    if (testAllowed) {
      return { siteKey: TURNSTILE_TEST_SITE_KEY, secretKey: TURNSTILE_TEST_SECRET_KEY, testMode: true };
    }
    throw new Error("Variabel lingkungan tidak ada: NEXT_PUBLIC_TURNSTILE_SITE_KEY, TURNSTILE_SECRET_KEY");
  }
  if (!siteKey || !secretKey) {
    const missing = siteKey ? "TURNSTILE_SECRET_KEY" : "NEXT_PUBLIC_TURNSTILE_SITE_KEY";
    throw new Error(`Variabel lingkungan tidak ada: ${missing}`);
  }

  const testMode = isTurnstileTestKey(siteKey) || isTurnstileTestKey(secretKey);
  if (testMode && !testAllowed) {
    throw new Error("Kunci uji Turnstile tidak boleh dipakai di produksi");
  }
  return { siteKey, secretKey, testMode };
}
