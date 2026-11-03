import { formatInTimeZone } from "date-fns-tz";

/** Zona waktu tunggal aplikasi. Semua tanggal antrean dihitung di zona ini, bukan UTC. */
export const APP_TIMEZONE = "Asia/Makassar";

/** Tanggal hari ini di WITA, format yyyy-MM-dd (cocok dengan kolom date di Postgres). */
export function todayInAppZone(now: Date = new Date()): string {
  return formatInTimeZone(now, APP_TIMEZONE, "yyyy-MM-dd");
}

/** Jam sekarang di WITA, format HH:mm. */
export function timeInAppZone(now: Date = new Date()): string {
  return formatInTimeZone(now, APP_TIMEZONE, "HH:mm");
}
