import "server-only";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { clientIpKey, type RateLimitRule } from "./rate-limit";

/** Kunci IP untuk request ini (lihat clientIpKey). */
export async function requestIpKey(): Promise<string> {
  const h = await headers();
  return clientIpKey((name) => h.get(name));
}

/**
 * Catat satu percobaan dan kembalikan true bila masih dalam batas. Bila
 * database gagal, percobaan diizinkan (fail open) dan hanya kode galat yang
 * dicatat: Turnstile dan batas bawaan Supabase Auth tetap berlaku, dan pasien
 * tidak boleh terhalang karena gangguan penghitung. Kunci tidak pernah dicatat.
 */
export async function allowAttempt(rule: RateLimitRule, key: string): Promise<boolean> {
  const { data, error } = await createAdminClient().rpc("hit_rate_limit", {
    p_bucket: rule.bucket,
    p_key: key,
    p_max: rule.max,
    p_window_seconds: rule.windowSeconds,
  });
  if (error) {
    console.error("hit_rate_limit gagal", { bucket: rule.bucket, code: error.code });
    return true;
  }
  return data === true;
}
