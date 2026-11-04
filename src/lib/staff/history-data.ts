import "server-only";
import type { QueueStatus } from "@/lib/queue-status";
import type { ExportEntry } from "./export-csv";
import type { Period, RecapDay } from "./history";
import type { StaffSession } from "./session";

/**
 * Data Riwayat dan rekap, dibaca dengan sesi staf sendiri (RLS). Tidak memakai
 * service_role. Total tarif dari get_daily_recap sudah null untuk perawat.
 */

export async function getDailyRecap(staff: StaffSession, period: Period): Promise<RecapDay[]> {
  const { data, error } = await staff.supabase.rpc("get_daily_recap", { p_from: period.from, p_to: period.to });
  if (error) throw new Error(`get_daily_recap gagal (${error.code})`);
  return data.map((row) => ({
    date: row.out_date,
    total: row.out_total,
    done: row.out_done,
    noShow: row.out_no_show,
    open: row.out_open,
    timed: row.out_timed,
    // Tipe hasil generator tidak menandai null; nilai sebenarnya bisa null.
    avgMinutes: (row.out_avg_minutes as number | null) ?? null,
    totalFee: (row.out_total_fee as number | null) ?? null,
  }));
}

export type HistoryEntry = {
  id: string;
  number: number;
  name: string;
  status: QueueStatus;
  source: "online" | "walk_in";
  callCount: number;
  calledAt: string | null;
  finishedAt: string | null;
  feeRupiah: number | null;
};

export async function getDayEntries(staff: StaffSession, date: string): Promise<HistoryEntry[]> {
  const { data, error } = await staff.supabase
    .from("queue_entries")
    .select("id, number, name, status, source, call_count, called_at, finished_at, fee_rupiah")
    .eq("queue_date", date)
    .order("number");
  if (error) throw new Error(`queue_entries gagal dibaca (${error.code})`);
  return data.map((row) => ({
    id: row.id,
    number: row.number,
    name: row.name,
    status: row.status,
    source: row.source === "walk_in" ? "walk_in" : "online",
    callCount: row.call_count,
    calledAt: row.called_at,
    finishedAt: row.finished_at,
    feeRupiah: row.fee_rupiah,
  }));
}

const PAGE = 1000; // batas baris bawaan PostgREST per permintaan

/** Semua pasien dalam periode, urut tanggal lalu nomor, dibaca per halaman. */
export async function getExportEntries(staff: StaffSession, period: Period): Promise<ExportEntry[]> {
  const out: ExportEntry[] = [];
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await staff.supabase
      .from("queue_entries")
      .select("queue_date, number, name, status, source, call_count, called_at, finished_at, fee_rupiah")
      .gte("queue_date", period.from)
      .lte("queue_date", period.to)
      .order("queue_date")
      .order("number")
      .range(offset, offset + PAGE - 1);
    if (error) throw new Error(`queue_entries gagal dibaca (${error.code})`);
    for (const row of data) {
      out.push({
        queueDate: row.queue_date,
        number: row.number,
        name: row.name,
        status: row.status,
        source: row.source,
        callCount: row.call_count,
        calledAt: row.called_at,
        finishedAt: row.finished_at,
        feeRupiah: row.fee_rupiah,
      });
    }
    if (data.length < PAGE) return out;
  }
}

/** Jumlah antrean aktif (menunggu atau diperiksa) pada satu tanggal, untuk peringatan hari libur. */
export async function countActiveEntries(staff: StaffSession, date: string): Promise<number> {
  const { count, error } = await staff.supabase
    .from("queue_entries")
    .select("id", { count: "exact", head: true })
    .eq("queue_date", date)
    .in("status", ["waiting", "in_progress"]);
  if (error) throw new Error(`queue_entries gagal dihitung (${error.code})`);
  return count ?? 0;
}

export type ClosedDay = { day: string; reason: string | null; activeCount: number };

/** Hari libur mulai hari ini, beserta jumlah antrean aktif di tanggal itu. */
export async function getUpcomingClosedDays(staff: StaffSession, today: string): Promise<ClosedDay[]> {
  const { data, error } = await staff.supabase
    .from("closed_days")
    .select("day, reason")
    .gte("day", today)
    .order("day");
  if (error) throw new Error(`closed_days gagal dibaca (${error.code})`);
  if (data.length === 0) return [];

  const { data: active, error: activeError } = await staff.supabase
    .from("queue_entries")
    .select("queue_date")
    .in(
      "queue_date",
      data.map((d) => d.day),
    )
    .in("status", ["waiting", "in_progress"]);
  if (activeError) throw new Error(`queue_entries gagal dibaca (${activeError.code})`);
  const counts = new Map<string, number>();
  for (const row of active) counts.set(row.queue_date, (counts.get(row.queue_date) ?? 0) + 1);

  return data.map((d) => ({ day: d.day, reason: d.reason, activeCount: counts.get(d.day) ?? 0 }));
}
