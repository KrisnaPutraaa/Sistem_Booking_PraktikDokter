import { formatInTimeZone } from "date-fns-tz";
import { id } from "date-fns/locale/id";

/**
 * Format tanggal dan jam untuk layar pasien. Tanggal datang dari Postgres sebagai
 * yyyy-MM-dd (tanggal kalender WITA), jadi diformat apa adanya di UTC supaya
 * zona waktu server tidak menggeser harinya.
 */
function calendarDate(date: string): Date {
  return new Date(`${date}T00:00:00Z`);
}

/** "Rabu, 4 Nov" */
export function formatDay(date: string): string {
  return formatInTimeZone(calendarDate(date), "UTC", "EEEE, d MMM", { locale: id });
}

/** "Hari ini, Selasa 3 Nov" untuk hari ini, selain itu "Rabu, 4 Nov". */
export function formatDayOption(date: string, today: string): string {
  if (date !== today) return formatDay(date);
  return `Hari ini, ${formatInTimeZone(calendarDate(date), "UTC", "EEEE d MMM", { locale: id })}`;
}

/** "Rabu, 4 Nov 2026" */
export function formatLongDate(date: string): string {
  return formatInTimeZone(calendarDate(date), "UTC", "EEEE, d MMM yyyy", { locale: id });
}

/** Kolom time Postgres ("18:30:00") menjadi "18.30". */
export function formatClock(time: string): string {
  const [h = "00", m = "00"] = time.split(":");
  return `${h.padStart(2, "0")}.${m.padStart(2, "0")}`;
}

/** Tambah (atau kurangi) menit pada jam "HH:mm[:ss]", hasil "HH:mm:00" dalam rentang satu hari. */
export function addMinutes(time: string, minutes: number): string {
  const [h = "0", m = "0"] = time.split(":");
  const total = (((Number(h) * 60 + Number(m) + minutes) % 1440) + 1440) % 1440;
  const hh = String(Math.floor(total / 60)).padStart(2, "0");
  const mm = String(total % 60).padStart(2, "0");
  return `${hh}:${mm}:00`;
}

const DAY_NAMES = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"] as const;

/**
 * Label hari ISO (1 = Senin ... 7 = Minggu): {1..6} -> "Senin – Sabtu",
 * {1,3,5} -> "Senin, Rabu, Jumat". Tiga hari berurutan atau lebih ditulis
 * sebagai rentang. Kosong menghasilkan "".
 */
export function formatDayGroups(isoDays: readonly number[]): string {
  const days = [...new Set(isoDays)].filter((d) => d >= 1 && d <= 7).sort((a, b) => a - b);
  const runs: number[][] = [];
  for (const day of days) {
    const run = runs.at(-1);
    if (run && run.at(-1) === day - 1) run.push(day);
    else runs.push([day]);
  }

  const parts: string[] = [];
  for (const run of runs) {
    const first = DAY_NAMES[run[0]! - 1]!;
    const last = DAY_NAMES[run.at(-1)! - 1]!;
    if (run.length >= 3) parts.push(`${first} – ${last}`);
    else parts.push(...run.map((d) => DAY_NAMES[d - 1]!));
  }
  return parts.join(", ");
}

/** Hari ISO yang tidak termasuk hari praktik. */
export function closedIsoDays(openDays: readonly number[]): number[] {
  return [1, 2, 3, 4, 5, 6, 7].filter((d) => !openDays.includes(d));
}

/** Nama dokter "dr. X, Sp.THT-KL" dipisah di koma terakhir untuk judul dua baris. */
export function splitDoctorName(name: string): { name: string; title: string | null } {
  const i = name.lastIndexOf(",");
  if (i === -1) return { name, title: null };
  return { name: name.slice(0, i + 1), title: name.slice(i + 1).trim() || null };
}

/**
 * Kalimat info pendaftaran di Beranda, dari practice_settings
 * (registration_open_time, cutoff_time, days_ahead). Jam dalam WITA.
 */
export function registrationInfo(opts: {
  openTime: string;
  closeTime: string | null;
  daysAhead: number;
}): { hours: string; range: string } {
  const open = formatClock(opts.openTime);
  const hours = opts.closeTime
    ? `Pendaftaran online ditutup pukul ${formatClock(opts.closeTime)} dan dibuka lagi pukul ${open} pada hari praktik.`
    : `Pendaftaran online dibuka mulai pukul ${open} pada hari praktik.`;
  const range =
    opts.daysAhead > 0
      ? `Anda bisa mendaftar untuk hari ini sampai ${opts.daysAhead} hari ke depan.`
      : "Pendaftaran hanya untuk hari ini.";
  return { hours, range };
}

/** 150000 menjadi "Rp150.000" (tanpa desimal). */
export function formatRupiah(value: number): string {
  return `Rp${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(value)}`;
}
