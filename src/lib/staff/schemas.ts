import { z } from "zod";
import { normalizeWhatsapp } from "@/lib/whatsapp";

export const loginSchema = z.object({
  email: z
    .string({ error: "Email wajib diisi." })
    .trim()
    .min(1, { error: "Email wajib diisi." })
    .max(254)
    .pipe(z.email({ error: "Format email tidak valid." })),
  password: z
    .string({ error: "Kata sandi wajib diisi." })
    .min(1, { error: "Kata sandi wajib diisi." })
    .max(200),
});

export type LoginField = keyof z.infer<typeof loginSchema>;

/** Aksi tombol di tabel antrean dan status tujuan masing-masing. */
export const STATUS_ACTIONS = {
  call: "in_progress", // Panggil dan Panggil lagi
  finish: "done",
  skip: "waiting", // belum datang, kembali menunggu
  no_show: "no_show",
  restore: "waiting", // tidak hadir disisipkan kembali
} as const;

export type StatusAction = keyof typeof STATUS_ACTIONS;

export const statusActionSchema = z.object({
  entryId: z.uuid(),
  action: z.enum(Object.keys(STATUS_ACTIONS) as [StatusAction, ...StatusAction[]]),
});

export const FEE_MAX = 100_000_000;

/**
 * Tarif dalam rupiah, bilangan bulat. Menerima "150000", "150.000", "Rp 150.000".
 * Isian kosong berarti tarif dihapus (null).
 */
export const feeSchema = z.object({
  entryId: z.uuid(),
  fee: z
    .string()
    .trim()
    .max(20, { error: "Tarif tidak valid." })
    .transform((value, ctx) => {
      const digits = value.replace(/^rp\.?\s*/i, "").replace(/[.\s]/g, "");
      if (digits === "") return null;
      if (!/^[0-9]+$/.test(digits)) {
        ctx.addIssue({ code: "custom", message: "Tarif hanya angka rupiah, tanpa koma." });
        return z.NEVER;
      }
      const n = Number(digits);
      if (!Number.isSafeInteger(n) || n > FEE_MAX) {
        ctx.addIssue({ code: "custom", message: "Tarif terlalu besar." });
        return z.NEVER;
      }
      return n;
    }),
});

export const walkInSchema = z.object({
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
  consent: z.literal("on", { error: "Pastikan pasien sudah menyetujui pencatatan data." }),
});

export type WalkInField = keyof z.infer<typeof walkInSchema>;

/** Pesan untuk kode galat dari trigger dan take_queue. Selain ini: pesan umum. */
export const STAFF_ERROR_MESSAGES: Record<string, string> = {
  INVALID_STATUS_TRANSITION: "Status sudah berubah. Muat ulang panel lalu coba lagi.",
  FEE_NO_SHOW: "Tarif tidak diisi untuk pasien tidak hadir.",
  FEE_NOT_ALLOWED: "Akun ini tidak boleh mengisi tarif.",
  FEE_WITH_STATUS_CHANGE: "Simpan tarif terpisah dari perubahan status.",
  WALK_IN_DISABLED: "Walk-in sedang dimatikan di Pengaturan.",
  WALK_IN_TODAY_ONLY: "Walk-in hanya untuk hari ini.",
  NOT_OPEN_DAY: "Hari ini bukan hari praktik.",
  CLOSED_DAY: "Hari ini praktik libur.",
  DATE_OUT_OF_RANGE: "Tanggal tidak valid.",
  FULL: "Kuota hari ini sudah penuh.",
  TOO_MANY_FOR_NUMBER: "Nomor WhatsApp ini sudah mencapai batas antrean hari ini.",
  ACTOR_REQUIRED: "Akun staf tidak dikenali. Masuk ulang, ya.",
};

export const STAFF_GENERIC_ERROR = "Terjadi gangguan. Coba lagi sebentar lagi.";

/** Pesan Postgres dari raise exception berisi kode saja (mis. "FULL"). */
export function staffErrorMessage(message: string | undefined): string | null {
  const code = (message ?? "").trim();
  return STAFF_ERROR_MESSAGES[code] ?? null;
}
