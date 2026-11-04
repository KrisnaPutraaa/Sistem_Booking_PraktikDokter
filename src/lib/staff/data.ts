import "server-only";
import type { QueueStatus } from "@/lib/queue-status";
import { addMinutes } from "@/lib/format";
import type { StaffSession } from "./session";

/**
 * Data panel staf, dibaca dengan sesi staf sendiri (RLS queue_entries_select dan
 * settings_select). Tidak memakai service_role.
 */

export type PanelEntry = {
  id: string;
  number: number;
  name: string;
  /** Null bila data pasien sudah dianonimkan (dihapus atas permintaan). */
  whatsapp: string | null;
  complaint: string | null;
  status: QueueStatus;
  source: "online" | "walk_in";
  callCount: number;
  feeRupiah: number | null;
  estTime: string;
};

export type PanelSettings = {
  doctorName: string;
  clinicName: string | null;
  dailyQuota: number;
  avgMinutes: number;
  openTime: string;
  closeTime: string;
  openDays: number[];
  registrationOpenTime: string;
  registrationCloseTime: string | null;
  daysAhead: number;
  maxCalls: number;
  maxPerWhatsapp: number;
  walkInEnabled: boolean;
  emergencyNotice: string | null;
};

export async function getPanelSettings(staff: StaffSession): Promise<PanelSettings> {
  const { data, error } = await staff.supabase
    .from("practice_settings")
    .select(
      "doctor_name, clinic_name, daily_quota, avg_minutes, open_time, close_time, open_days, registration_open_time, cutoff_time, days_ahead, max_calls, max_per_whatsapp, walk_in_enabled, emergency_notice",
    )
    .eq("id", 1)
    .single();
  if (error) throw new Error(`practice_settings gagal dibaca (${error.code})`);
  return {
    doctorName: data.doctor_name,
    clinicName: data.clinic_name,
    dailyQuota: data.daily_quota,
    avgMinutes: data.avg_minutes,
    openTime: data.open_time,
    closeTime: data.close_time,
    openDays: data.open_days,
    registrationOpenTime: data.registration_open_time,
    registrationCloseTime: data.cutoff_time,
    daysAhead: data.days_ahead,
    maxCalls: data.max_calls,
    maxPerWhatsapp: data.max_per_whatsapp,
    walkInEnabled: data.walk_in_enabled,
    emergencyNotice: data.emergency_notice,
  };
}

export async function getPanelEntries(
  staff: StaffSession,
  date: string,
  settings: Pick<PanelSettings, "openTime" | "avgMinutes">,
): Promise<PanelEntry[]> {
  const { data, error } = await staff.supabase
    .from("queue_entries")
    .select("id, number, name, whatsapp, complaint, status, source, call_count, fee_rupiah")
    .eq("queue_date", date)
    .order("number");
  if (error) throw new Error(`queue_entries gagal dibaca (${error.code})`);

  return data.map((row) => ({
    id: row.id,
    number: row.number,
    name: row.name,
    whatsapp: row.whatsapp,
    complaint: row.complaint,
    status: row.status,
    source: row.source === "walk_in" ? "walk_in" : "online",
    callCount: row.call_count,
    feeRupiah: row.fee_rupiah,
    estTime: addMinutes(settings.openTime, (row.number - 1) * settings.avgMinutes),
  }));
}

export type PanelSummary = {
  total: number;
  nowServing: number | null;
  waiting: number;
  done: number;
};

export function summarize(entries: readonly PanelEntry[]): PanelSummary {
  const serving = entries.filter((e) => e.status === "in_progress");
  return {
    total: entries.length,
    // Sama dengan get_now_serving: bila lebih dari satu, ambil nomor terbesar.
    nowServing: serving.length > 0 ? Math.max(...serving.map((e) => e.number)) : null,
    waiting: entries.filter((e) => e.status === "waiting").length,
    done: entries.filter((e) => e.status === "done").length,
  };
}
