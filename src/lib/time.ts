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

/** Geser tanggal kalender yyyy-MM-dd sebanyak n hari (tanpa zona waktu). */
export function addDaysToDate(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Jumlah hari dari `from` ke `to` (keduanya yyyy-MM-dd). */
export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

/** true bila string yyyy-MM-dd adalah tanggal kalender yang ada. */
export function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}
