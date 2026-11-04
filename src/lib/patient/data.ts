import "server-only";
import { connection } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { QueueStatus } from "@/lib/queue-status";
import { queueTokenSchema } from "./take-queue";

/**
 * Pembaca data untuk halaman pasien. Semuanya lewat klien service_role di server
 * (pasien tidak memakai Supabase di browser) dan tidak di-cache: connection()
 * memastikan dibaca ulang di setiap request.
 */

export type PracticeInfo = {
  doctorName: string;
  clinicName: string | null;
  address: string | null;
  whatsapp: string | null;
  profileText: string | null;
  emergencyNotice: string | null;
  openTime: string;
  registrationOpenTime: string;
  registrationCloseTime: string | null;
  daysAhead: number;
  closeTime: string;
  openDays: number[];
  dailyQuota: number;
  avgMinutes: number;
};

export async function getPracticeInfo(): Promise<PracticeInfo> {
  await connection();
  const { data, error } = await createAdminClient()
    .from("practice_settings")
    .select(
      "doctor_name, clinic_name, address, whatsapp, profile_text, emergency_notice, open_time, close_time, open_days, daily_quota, avg_minutes, registration_open_time, cutoff_time, days_ahead",
    )
    .eq("id", 1)
    .single();
  if (error) throw new Error(`practice_settings gagal dibaca (${error.code})`);

  return {
    doctorName: data.doctor_name,
    clinicName: data.clinic_name,
    address: data.address,
    whatsapp: data.whatsapp,
    profileText: data.profile_text,
    emergencyNotice: data.emergency_notice,
    openTime: data.open_time,
    registrationOpenTime: data.registration_open_time,
    registrationCloseTime: data.cutoff_time,
    daysAhead: data.days_ahead,
    closeTime: data.close_time,
    openDays: data.open_days,
    dailyQuota: data.daily_quota,
    avgMinutes: data.avg_minutes,
  };
}

/** Status dari get_availability. "closed" = bukan hari praktik. */
export type DayStatus =
  | "available"
  | "full"
  | "holiday"
  | "closed"
  | "registration_closed"
  | "registration_not_open";

export type DayAvailability = {
  date: string;
  status: DayStatus;
  remaining: number;
  reason: string | null;
};

const DAY_STATUSES: readonly string[] = [
  "available",
  "full",
  "holiday",
  "closed",
  "registration_closed",
  "registration_not_open",
];

export async function getAvailability(): Promise<DayAvailability[]> {
  await connection();
  const { data, error } = await createAdminClient().rpc("get_availability");
  if (error) throw new Error(`get_availability gagal (${error.code})`);

  return data.map((row) => ({
    date: row.out_date,
    // Status yang tidak dikenal diperlakukan tertutup.
    status: (DAY_STATUSES.includes(row.out_status) ? row.out_status : "closed") as DayStatus,
    remaining: row.out_remaining,
    reason: row.out_reason,
  }));
}

export type MyQueue = {
  number: number;
  date: string;
  status: QueueStatus;
  estTime: string;
  nowServing: number | null;
  waitingAhead: number;
};

/** Null bila token tidak valid atau tidak dikenal. */
export async function getMyQueue(token: string): Promise<MyQueue | null> {
  await connection();
  if (!queueTokenSchema.safeParse(token).success) return null;

  const { data, error } = await createAdminClient().rpc("get_my_queue", { p_token: token });
  if (error) throw new Error(`get_my_queue gagal (${error.code})`);

  const row = data[0];
  if (!row) return null;
  return {
    number: row.out_number,
    date: row.out_queue_date,
    status: row.out_status,
    estTime: row.out_est_time,
    nowServing: row.out_now_serving,
    waitingAhead: row.out_waiting_ahead,
  };
}

/** Nomor-nomor yang menunggu pada tanggal milik token, tanpa nama. */
export async function getNextWaiting(token: string, limit = 3): Promise<number[]> {
  await connection();
  if (!queueTokenSchema.safeParse(token).success) return [];

  const { data, error } = await createAdminClient().rpc("get_next_waiting", {
    p_token: token,
    p_limit: limit,
  });
  if (error) throw new Error(`get_next_waiting gagal (${error.code})`);
  return data.map((row) => row.out_number);
}
