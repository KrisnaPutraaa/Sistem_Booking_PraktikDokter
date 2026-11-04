import { createHmac } from "node:crypto";

/**
 * Pembuat kode TOTP (RFC 6238: SHA-1, 6 digit, 30 detik) khusus uji database,
 * untuk menaikkan sesi akun uji owner dan dokter ke aal2. Aplikasi sendiri
 * tidak memerlukan ini: verifikasi kode dilakukan server Supabase Auth.
 */
const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function base32Decode(input: string): Buffer {
  const clean = input.replace(/=+$/, "").replace(/\s+/g, "").toUpperCase();
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const char of clean) {
    const idx = BASE32.indexOf(char);
    if (idx < 0) throw new Error("base32 tidak valid");
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

export function hotp(key: Buffer, counter: number, digits = 6): string {
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(counter));
  const mac = createHmac("sha1", key).update(msg).digest();
  const offset = (mac[mac.length - 1] ?? 0) & 0x0f;
  const code = (mac.readUInt32BE(offset) & 0x7fffffff) % 10 ** digits;
  return String(code).padStart(digits, "0");
}

export function totp(secretBase32: string, at = Date.now(), step = 30): string {
  return hotp(base32Decode(secretBase32), Math.floor(at / 1000 / step));
}
