/**
 * Login staf memakai username (revisi Fase 6). Supabase Auth tetap memakai
 * email, jadi username dipetakan ke email internal tetap di domain .test
 * (dicadangkan RFC 2606, tidak pernah bisa menerima email). Pemetaan ini satu
 * arah dan tetap: mengubah domain berarti semua akun harus dipetakan ulang.
 *
 * Pola username: 3–32 karakter, huruf kecil a-z, angka, titik, garis bawah,
 * tanda hubung; diawali dan diakhiri huruf atau angka. Contoh: dhena,
 * perawat.ayu, krisowner.
 */
export const STAFF_EMAIL_DOMAIN = "staf.praktik-tht.test";

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 32;
export const USERNAME_PATTERN = /^[a-z0-9](?:[a-z0-9._-]{1,30})[a-z0-9]$/;

/** Rapikan masukan pengguna: spasi di ujung dibuang, huruf dijadikan kecil. */
export function normalizeUsername(input: string): string {
  return input.trim().toLowerCase();
}

export function isValidUsername(username: string): boolean {
  return USERNAME_PATTERN.test(username);
}

/** Username yang sudah dinormalisasi dan valid menjadi email internal Supabase Auth. */
export function usernameToEmail(username: string): string {
  if (!isValidUsername(username)) throw new Error("username tidak valid");
  return `${username}@${STAFF_EMAIL_DOMAIN}`;
}

/** Kebalikan usernameToEmail untuk tampilan. Null bila email bukan email internal staf. */
export function emailToUsername(email: string): string | null {
  const suffix = `@${STAFF_EMAIL_DOMAIN}`;
  const lower = email.toLowerCase();
  if (!lower.endsWith(suffix)) return null;
  const username = lower.slice(0, -suffix.length);
  return isValidUsername(username) ? username : null;
}
