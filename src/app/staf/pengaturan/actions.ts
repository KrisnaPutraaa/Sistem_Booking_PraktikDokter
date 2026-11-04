"use server";

import { refresh } from "next/cache";
import { countActiveEntries } from "@/lib/staff/history-data";
import { canEditSettings } from "@/lib/staff/roles";
import { STAFF_GENERIC_ERROR } from "@/lib/staff/schemas";
import { currentStaff } from "@/lib/staff/session";
import {
  closedDayDeleteSchema,
  closedDaySchema,
  type SettingsField,
  settingsConstraintMessage,
  settingsSchema,
} from "@/lib/staff/settings-schema";
import { todayInAppZone } from "@/lib/time";

/**
 * Aksi halaman Pengaturan (dokter dan pemilik). Peran diperiksa di sini, lalu
 * perubahan memakai sesi staf sendiri: RLS settings_update dan closed_days_*
 * berlaku, constraint practice_settings menjadi pengaman terakhir, dan trigger
 * audit mencatat actor = auth.uid().
 */

const NOT_ALLOWED = "Pengaturan hanya bisa diubah dokter dan pemilik.";
const SESSION_EXPIRED = "Sesi berakhir. Masuk ulang, ya.";

export type SettingsState =
  | { status: "idle" }
  | {
      status: "error";
      message?: string;
      fieldErrors?: Partial<Record<SettingsField, string>>;
      // Isian yang dikirim, supaya formulir tidak kosong lagi setelah galat.
      values?: SettingsFormValues;
    }
  | { status: "ok"; at: number };

export type SettingsFormValues = Partial<Record<Exclude<SettingsField, "openDays">, string>> & { openDays?: string[] };

export async function saveSettingsAction(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  const staff = await currentStaff();
  if (!staff) return { status: "error", message: SESSION_EXPIRED };
  if (!canEditSettings(staff.role)) return { status: "error", message: NOT_ALLOWED };

  const text = (name: string) => {
    const v = formData.get(name);
    return typeof v === "string" ? v : undefined;
  };
  const values: SettingsFormValues = {
    dailyQuota: text("dailyQuota"),
    avgMinutes: text("avgMinutes"),
    openTime: text("openTime"),
    closeTime: text("closeTime"),
    registrationOpenTime: text("registrationOpenTime"),
    registrationCloseTime: text("registrationCloseTime"),
    openDays: formData.getAll("openDays").filter((v) => typeof v === "string"),
    daysAhead: text("daysAhead"),
    maxPerWhatsapp: text("maxPerWhatsapp"),
    walkInEnabled: text("walkInEnabled"),
    emergencyNotice: text("emergencyNotice"),
    practiceWhatsapp: text("practiceWhatsapp"),
    anonymizeAfterMonths: text("anonymizeAfterMonths"),
  };
  const parsed = settingsSchema.safeParse(values);
  if (!parsed.success) {
    const fieldErrors: Partial<Record<SettingsField, string>> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as SettingsField | undefined;
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { status: "error", message: "Periksa lagi isian yang ditandai.", fieldErrors, values };
  }

  const s = parsed.data;
  const { data, error } = await staff.supabase
    .from("practice_settings")
    .update({
      daily_quota: s.dailyQuota,
      avg_minutes: s.avgMinutes,
      open_time: s.openTime,
      close_time: s.closeTime,
      registration_open_time: s.registrationOpenTime,
      cutoff_time: s.registrationCloseTime,
      open_days: s.openDays,
      days_ahead: s.daysAhead,
      max_per_whatsapp: s.maxPerWhatsapp,
      walk_in_enabled: s.walkInEnabled,
      emergency_notice: s.emergencyNotice,
      whatsapp: s.practiceWhatsapp,
      anonymize_after_months: s.anonymizeAfterMonths,
    })
    .eq("id", 1)
    .select("id");

  if (error) {
    const friendly = settingsConstraintMessage(error.message);
    if (!friendly) console.error("simpan pengaturan gagal", { code: error.code });
    return { status: "error", message: friendly ?? STAFF_GENERIC_ERROR, values };
  }
  // RLS menyaring baris tanpa galat: 0 baris berarti tidak berhak.
  if (!data || data.length === 0) return { status: "error", message: NOT_ALLOWED };

  refresh();
  return { status: "ok", at: Date.now() };
}

export type ClosedDayState =
  | { status: "idle" }
  | { status: "error"; message: string; field?: "day" | "reason" }
  | { status: "ok"; at: number; day: string; activeCount: number };

export async function addClosedDayAction(_prev: ClosedDayState, formData: FormData): Promise<ClosedDayState> {
  const staff = await currentStaff();
  if (!staff) return { status: "error", message: SESSION_EXPIRED };
  if (!canEditSettings(staff.role)) return { status: "error", message: NOT_ALLOWED };

  const value = (name: string) => {
    const v = formData.get(name);
    return typeof v === "string" ? v : undefined;
  };
  const parsed = closedDaySchema(todayInAppZone()).safeParse({ day: value("day"), reason: value("reason") });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = issue?.path[0] === "reason" ? "reason" : "day";
    return { status: "error", message: issue?.message ?? "Tanggal tidak valid.", field };
  }

  const { error } = await staff.supabase
    .from("closed_days")
    .upsert({ day: parsed.data.day, reason: parsed.data.reason }, { onConflict: "day" });
  if (error) {
    console.error("simpan hari libur gagal", { code: error.code });
    return { status: "error", message: error.code === "42501" ? NOT_ALLOWED : STAFF_GENERIC_ERROR };
  }

  const activeCount = await countActiveEntries(staff, parsed.data.day);
  refresh();
  return { status: "ok", at: Date.now(), day: parsed.data.day, activeCount };
}

export async function deleteClosedDayAction(day: string): Promise<{ ok: boolean; message?: string }> {
  const staff = await currentStaff();
  if (!staff) return { ok: false, message: SESSION_EXPIRED };
  if (!canEditSettings(staff.role)) return { ok: false, message: NOT_ALLOWED };

  const parsed = closedDayDeleteSchema.safeParse({ day });
  if (!parsed.success) return { ok: false, message: "Tanggal tidak valid." };

  const { data, error } = await staff.supabase.from("closed_days").delete().eq("day", parsed.data.day).select("day");
  if (error) {
    console.error("hapus hari libur gagal", { code: error.code });
    return { ok: false, message: STAFF_GENERIC_ERROR };
  }
  if (!data || data.length === 0) return { ok: false, message: "Hari libur tidak ditemukan." };
  refresh();
  return { ok: true };
}
