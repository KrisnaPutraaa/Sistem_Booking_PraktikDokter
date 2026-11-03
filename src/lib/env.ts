import { z } from "zod";

const publicSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  // Kunci publishable (sb_publishable_...) atau anon lama. Kunci secret tidak boleh
  // masuk ke sini karena variabel NEXT_PUBLIC ikut terkirim ke browser.
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).refine((key) => !key.startsWith("sb_secret_")),
});

export type PublicEnv = z.infer<typeof publicSchema>;

/**
 * Variabel publik. Nama ditulis lengkap (process.env.NEXT_PUBLIC_X) supaya Next
 * bisa menyisipkannya saat build. Divalidasi saat dipakai, bukan saat impor,
 * agar build tetap jalan tanpa .env.local.
 */
export function publicEnv(): PublicEnv {
  return parseEnv(publicSchema, {
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
}

/** Pesan galat hanya menyebut nama variabel, tidak pernah nilainya. */
export function parseEnv<T extends z.ZodType>(schema: T, values: Record<string, unknown>): z.infer<T> {
  const result = schema.safeParse(values);
  if (!result.success) {
    const names = [...new Set(result.error.issues.map((issue) => issue.path.join(".")))];
    throw new Error(`Variabel lingkungan tidak ada atau tidak valid: ${names.join(", ")}`);
  }
  return result.data;
}
