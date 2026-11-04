import { z } from "zod";
import { isCalendarDate } from "@/lib/time";

/**
 * Validasi halaman Pengaturan. Batas angka dan urutan jam sama dengan constraint
 * practice_settings (migrasi Fase 2, 4, 5); database tetap menjadi pengaman
 * terakhir. Jam dalam WITA, format "HH:mm".
 */

const TIME = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

const clock = (label: string) =>
  z
    .string({ error: `${label} wajib diisi.` })
    .trim()
    .regex(TIME, { error: `${label} tidak valid.` })
    .transform((v) => v.slice(0, 5));

const intIn = (label: string, min: number, max: number) =>
  z
    .string({ error: `${label} wajib diisi.` })
    .trim()
    .regex(/^\d{1,4}$/, { error: `${label} harus bilangan bulat.` })
    .transform(Number)
    .pipe(
      z
        .number()
        .min(min, { error: `${label} paling sedikit ${min}.` })
        .max(max, { error: `${label} paling banyak ${max}.` }),
    );

export function minutesOfDay(time: string): number {
  const [h = "0", m = "0"] = time.split(":");
  return Number(h) * 60 + Number(m);
}

export const settingsSchema = z
  .object({
    dailyQuota: intIn("Kuota per hari", 1, 200),
    avgMinutes: intIn("Rata-rata durasi", 1, 120),
    openTime: clock("Jam mulai praktik"),
    closeTime: clock("Jam selesai praktik"),
    registrationOpenTime: clock("Jam buka pendaftaran"),
    registrationCloseTime: z
      .string()
      .trim()
      .optional()
      .transform((v) => v || null)
      .pipe(clock("Jam tutup pendaftaran").nullable()),
    openDays: z
      .array(z.enum(["1", "2", "3", "4", "5", "6", "7"]), { error: "Pilih hari praktik." })
      .min(1, { error: "Pilih paling sedikit satu hari praktik." })
      .transform((days) => [...new Set(days.map(Number))].sort((a, b) => a - b)),
    daysAhead: intIn("Pendaftaran ke depan", 0, 14),
    maxPerWhatsapp: intIn("Batas per WhatsApp", 1, 10),
    walkInEnabled: z
      .literal("on")
      .optional()
      .transform((v) => v === "on"),
    emergencyNotice: z
      .string()
      .trim()
      .max(500, { error: "Pengumuman maksimal 500 karakter." })
      .optional()
      .transform((v) => v || null),
  })
  .superRefine((s, ctx) => {
    const open = minutesOfDay(s.openTime);
    const close = minutesOfDay(s.closeTime);
    if (close <= open) {
      ctx.addIssue({ code: "custom", path: ["closeTime"], message: "Jam selesai harus setelah jam mulai praktik." });
      return;
    }
    const needed = s.dailyQuota * s.avgMinutes;
    const available = close - open;
    if (needed > available) {
      ctx.addIssue({
        code: "custom",
        path: ["dailyQuota"],
        message: `Kuota × durasi = ${needed} menit, melebihi jam praktik (${available} menit). Kurangi kuota atau durasi, atau perpanjang jam praktik.`,
      });
    }
    const regOpen = minutesOfDay(s.registrationOpenTime);
    if (s.registrationCloseTime !== null) {
      const regClose = minutesOfDay(s.registrationCloseTime);
      if (regClose > close) {
        ctx.addIssue({
          code: "custom",
          path: ["registrationCloseTime"],
          message: "Jam tutup pendaftaran tidak boleh setelah jam selesai praktik.",
        });
      }
      if (regOpen >= regClose) {
        ctx.addIssue({
          code: "custom",
          path: ["registrationOpenTime"],
          message: "Jam buka pendaftaran harus sebelum jam tutup pendaftaran.",
        });
      }
    } else if (regOpen >= close) {
      ctx.addIssue({
        code: "custom",
        path: ["registrationOpenTime"],
        message: "Jam buka pendaftaran harus sebelum jam selesai praktik.",
      });
    }
  });

export type SettingsInput = z.input<typeof settingsSchema>;
export type SettingsValues = z.output<typeof settingsSchema>;
export type SettingsField = keyof SettingsValues;

/** Hari libur: hari ini atau setelahnya, alasan opsional (maks 200, sama dengan check tabel). */
export function closedDaySchema(today: string) {
  return z.object({
    day: z
      .string({ error: "Tanggal wajib diisi." })
      .trim()
      .refine(isCalendarDate, { error: "Tanggal tidak valid." })
      .refine((d) => d >= today, { error: "Hari libur hanya untuk hari ini atau setelahnya." }),
    reason: z
      .string()
      .trim()
      .max(200, { error: "Alasan maksimal 200 karakter." })
      .optional()
      .transform((v) => v || null),
  });
}

export const closedDayDeleteSchema = z.object({
  day: z.string().refine(isCalendarDate),
});

/** Nama constraint practice_settings -> pesan untuk staf. */
export const SETTINGS_CONSTRAINT_MESSAGES: Record<string, string> = {
  quota_fits_hours: "Kuota × durasi melebihi jam praktik.",
  practice_hours_order: "Jam selesai harus setelah jam mulai praktik.",
  cutoff_before_close: "Jam tutup pendaftaran tidak boleh setelah jam selesai praktik.",
  registration_window_order: "Jam buka pendaftaran harus sebelum jam tutup pendaftaran.",
  registration_open_before_close: "Jam buka pendaftaran harus sebelum jam selesai praktik.",
  emergency_notice_length: "Pengumuman maksimal 500 karakter.",
};

export function settingsConstraintMessage(message: string | undefined): string | null {
  const text = message ?? "";
  for (const [name, friendly] of Object.entries(SETTINGS_CONSTRAINT_MESSAGES)) {
    if (text.includes(`"${name}"`)) return friendly;
  }
  return null;
}
