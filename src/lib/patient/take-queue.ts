import { z } from "zod";
import { normalizeWhatsapp } from "@/lib/whatsapp";

/** Validasi formulir Ambil nomor. Batas panjang sama dengan constraint database. */
export const takeQueueSchema = z.object({
  date: z.iso.date({ error: "Pilih hari dulu." }),
  name: z
    .string({ error: "Nama pasien wajib diisi." })
    .trim()
    .min(1, { error: "Nama pasien wajib diisi." })
    .min(2, { error: "Nama pasien minimal 2 huruf." })
    .max(80, { error: "Nama pasien maksimal 80 huruf." }),
  whatsapp: z
    .string({ error: "Nomor WhatsApp wajib diisi." })
    .trim()
    .min(1, { error: "Nomor WhatsApp wajib diisi." })
    .max(32, { error: "Nomor WhatsApp tidak valid. Contoh: 0812 3456 7890." })
    .transform((value, ctx) => {
      const normalized = normalizeWhatsapp(value);
      if (!normalized) {
        ctx.addIssue({ code: "custom", message: "Nomor WhatsApp tidak valid. Contoh: 0812 3456 7890." });
        return z.NEVER;
      }
      return normalized;
    }),
  complaint: z
    .string()
    .trim()
    .max(500, { error: "Keluhan maksimal 500 karakter." })
    .optional()
    .transform((value) => value || null),
  consent: z.literal("on", { error: "Centang persetujuan dulu, ya." }),
  turnstileToken: z
    .string({ error: "Selesaikan verifikasi keamanan dulu." })
    .min(1, { error: "Selesaikan verifikasi keamanan dulu." })
    .max(2048),
});

export type TakeQueueInput = z.infer<typeof takeQueueSchema>;
export type TakeQueueField = keyof TakeQueueInput;

/** Kode exception dari fungsi take_queue (supabase/migrations/..._functions.sql). */
const TAKE_QUEUE_MESSAGES: Record<string, string> = {
  DATE_OUT_OF_RANGE: "Tanggal ini sudah tidak bisa dipilih. Pilih hari lain, ya.",
  NOT_OPEN_DAY: "Praktik tidak buka pada hari itu. Pilih hari lain, ya.",
  CLOSED_DAY: "Praktik libur pada hari itu. Pilih hari lain, ya.",
  REGISTRATION_CLOSED: "Pendaftaran online untuk hari ini sudah ditutup. Pilih hari lain, ya.",
  TOO_MANY_FOR_NUMBER: "Nomor WhatsApp ini sudah mencapai batas antrean untuk hari itu.",
};

export const GENERIC_ERROR = "Maaf, nomor antrean belum bisa dibuat. Coba lagi sebentar lagi.";

export type TakeQueueFailure =
  | { kind: "full" }
  | { kind: "rejected"; code: string; message: string }
  | { kind: "unknown" };

/**
 * Terjemahkan galat take_queue. Exception fungsi dikirim PostgREST sebagai
 * message (mis. "FULL"); selain kode yang dikenal dianggap galat tak terduga.
 */
export function classifyTakeQueueError(message: string | undefined): TakeQueueFailure {
  const code = message?.trim() ?? "";
  if (code === "FULL") return { kind: "full" };
  const friendly = TAKE_QUEUE_MESSAGES[code];
  return friendly ? { kind: "rejected", code, message: friendly } : { kind: "unknown" };
}

/** Token publik antrean: 64 karakter heksadesimal (lihat kolom public_token). */
export const queueTokenSchema = z.string().regex(/^[0-9a-f]{64}$/);
