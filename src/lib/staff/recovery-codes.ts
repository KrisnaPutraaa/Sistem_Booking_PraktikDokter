/**
 * Kode pemulihan verifikasi dua langkah. 10 karakter dari 32 huruf/angka yang
 * tidak mudah tertukar (tanpa 0, O, 1, I), sekitar 50 bit acak per kode.
 * Database hanya menyimpan HMAC-nya (replace_recovery_codes).
 */
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const RECOVERY_CODE_COUNT = 10;
const LENGTH = 10;

export function generateRecoveryCodes(count = RECOVERY_CODE_COUNT): string[] {
  const codes = new Set<string>();
  while (codes.size < count) {
    const bytes = crypto.getRandomValues(new Uint8Array(LENGTH));
    // 256 habis dibagi 32, jadi modulo tidak membuat bias.
    codes.add(Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join(""));
  }
  return [...codes];
}

/** Tampilan: ABCDE-FGHJK. */
export function formatRecoveryCode(code: string): string {
  return `${code.slice(0, 5)}-${code.slice(5)}`;
}

/** Masukan pengguna: huruf kecil, spasi, dan tanda hubung diabaikan. */
export function normalizeRecoveryCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, "");
}
