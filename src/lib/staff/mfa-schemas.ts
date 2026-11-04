import { z } from "zod";

/** Kode 6 digit dari aplikasi authenticator; spasi diabaikan. */
export const totpCodeSchema = z
  .string({ error: "Masukkan 6 digit kode." })
  .transform((v) => v.replace(/\s+/g, ""))
  .pipe(z.string().regex(/^\d{6}$/, { error: "Kode terdiri dari 6 digit angka." }));

export const enrollVerifySchema = z.object({
  factorId: z.uuid(),
  code: totpCodeSchema,
});

export const recoveryCodeSchema = z
  .string({ error: "Masukkan kode pemulihan." })
  .trim()
  .min(1, { error: "Masukkan kode pemulihan." })
  .max(40, { error: "Kode pemulihan tidak valid." });

export const MFA_WRONG_CODE = "Kode salah atau sudah kedaluwarsa. Lihat kode terbaru di aplikasi, lalu coba lagi.";

/**
 * Kebijakan kata sandi staf: minimal 12 karakter (sama dengan setelan Supabase
 * Auth). Maksimal 72 karena batas bcrypt di Supabase Auth.
 */
export const PASSWORD_MIN = 12;

export const passwordChangeSchema = z
  .object({
    current: z.string({ error: "Isi kata sandi saat ini." }).min(1, { error: "Isi kata sandi saat ini." }).max(200),
    next: z
      .string({ error: "Isi kata sandi baru." })
      .min(PASSWORD_MIN, { error: `Kata sandi baru minimal ${PASSWORD_MIN} karakter.` })
      .max(72, { error: "Kata sandi baru maksimal 72 karakter." }),
    confirm: z.string({ error: "Ulangi kata sandi baru." }),
  })
  .superRefine((v, ctx) => {
    if (v.next !== v.confirm) {
      ctx.addIssue({ code: "custom", path: ["confirm"], message: "Ulangan kata sandi tidak sama." });
    }
    if (v.next === v.current) {
      ctx.addIssue({ code: "custom", path: ["next"], message: "Kata sandi baru harus berbeda dari yang lama." });
    }
  });

export type PasswordField = "current" | "next" | "confirm";
