import { formatInTimeZone } from "date-fns-tz";
import { id } from "date-fns/locale/id";
import { addDaysToDate, daysBetween, isCalendarDate } from "@/lib/time";

/** Fungsi murni untuk Riwayat dan rekap (periode, ringkasan, format). */

/** Sama dengan batas get_daily_recap (p_to - p_from <= 91). */
export const MAX_PERIOD_DAYS = 92;
export const DEFAULT_PERIOD_DAYS = 7;

export type Period = { from: string; to: string };

/** Periode dari query ?dari=&sampai=. Tidak valid atau tidak lengkap: 7 hari terakhir. */
export function parsePeriod(
  params: { dari?: string | string[]; sampai?: string | string[] },
  today: string,
): Period & { isDefault: boolean } {
  const from = typeof params.dari === "string" ? params.dari : "";
  const to = typeof params.sampai === "string" ? params.sampai : "";
  if (isCalendarDate(from) && isCalendarDate(to)) {
    const span = daysBetween(from, to);
    if (span >= 0 && span < MAX_PERIOD_DAYS) return { from, to, isDefault: false };
  }
  return { from: addDaysToDate(today, -(DEFAULT_PERIOD_DAYS - 1)), to: today, isDefault: true };
}

export type RecapDay = {
  date: string;
  total: number;
  done: number;
  noShow: number;
  open: number; // menunggu atau diperiksa
  timed: number; // pasien selesai yang punya durasi
  avgMinutes: number | null;
  totalFee: number | null; // null untuk perawat
};

export type RecapSummary = {
  total: number;
  done: number;
  noShow: number;
  avgMinutes: number | null;
  totalFee: number | null;
};

/** Rata-rata durasi ditimbang jumlah pasien per hari, bukan rata-rata dari rata-rata. */
export function summarizeRecap(days: readonly RecapDay[], showFee: boolean): RecapSummary {
  let timed = 0;
  let minutes = 0;
  for (const d of days) {
    if (d.avgMinutes !== null && d.timed > 0) {
      timed += d.timed;
      minutes += d.avgMinutes * d.timed;
    }
  }
  return {
    total: days.reduce((n, d) => n + d.total, 0),
    done: days.reduce((n, d) => n + d.done, 0),
    noShow: days.reduce((n, d) => n + d.noShow, 0),
    avgMinutes: timed > 0 ? minutes / timed : null,
    totalFee: showFee ? days.reduce((n, d) => n + (d.totalFee ?? 0), 0) : null,
  };
}

const cal = (date: string) => new Date(`${date}T00:00:00Z`);

/** "28 Okt – 3 Nov 2026"; tahun berbeda: "29 Des 2026 – 4 Jan 2027"; satu hari: "3 Nov 2026". */
export function formatPeriod({ from, to }: Period): string {
  const fmt = (d: string, pattern: string) => formatInTimeZone(cal(d), "UTC", pattern, { locale: id });
  if (from === to) return fmt(to, "d MMM yyyy");
  if (from.slice(0, 4) === to.slice(0, 4)) return `${fmt(from, "d MMM")} – ${fmt(to, "d MMM yyyy")}`;
  return `${fmt(from, "d MMM yyyy")} – ${fmt(to, "d MMM yyyy")}`;
}

/** 14.6 -> "15 menit"; null -> "–". */
export function formatDuration(minutes: number | null, unit: "menit" | "mnt" = "menit"): string {
  return minutes === null ? "–" : `${Math.round(minutes)} ${unit}`;
}

/** Durasi satu pasien dari called_at ke finished_at, menit dibulatkan; null bila tidak lengkap. */
export function entryDurationMinutes(calledAt: string | null, finishedAt: string | null): number | null {
  if (!calledAt || !finishedAt) return null;
  const ms = Date.parse(finishedAt) - Date.parse(calledAt);
  return Number.isFinite(ms) && ms >= 0 ? Math.round(ms / 60_000) : null;
}

/** Nama berkas ekspor: rekap-antrean-2026-10-28_2026-11-03.csv */
export function exportFileName({ from, to }: Period): string {
  return `rekap-antrean-${from}_${to}.csv`;
}
