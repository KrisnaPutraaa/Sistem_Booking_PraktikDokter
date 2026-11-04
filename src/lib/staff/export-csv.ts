import { formatInTimeZone } from "date-fns-tz";
import { toCsv } from "@/lib/csv";
import { QUEUE_STATUS_LABEL, type QueueStatus } from "@/lib/queue-status";
import { APP_TIMEZONE } from "@/lib/time";
import { entryDurationMinutes } from "./history";

/**
 * Isi CSV ekspor rekap (keputusan Fase 5): satu baris per pasien, dengan tarif.
 * WhatsApp dan keluhan sengaja tidak ikut, supaya data pribadi di berkas yang
 * beredar sesedikit mungkin.
 */
export type ExportEntry = {
  queueDate: string;
  number: number;
  name: string;
  status: QueueStatus;
  source: string;
  callCount: number;
  calledAt: string | null;
  finishedAt: string | null;
  feeRupiah: number | null;
};

export const EXPORT_HEADER = [
  "Tanggal",
  "Nomor",
  "Nama",
  "Status",
  "Sumber",
  "Jumlah panggilan",
  "Dipanggil (WITA)",
  "Selesai (WITA)",
  "Durasi (menit)",
  "Tarif (Rp)",
] as const;

const clockWita = (iso: string | null) => (iso ? formatInTimeZone(new Date(iso), APP_TIMEZONE, "HH:mm") : null);

export function buildExportCsv(entries: readonly ExportEntry[]): string {
  const rows = entries.map((e) => [
    e.queueDate,
    e.number,
    e.name,
    QUEUE_STATUS_LABEL[e.status],
    e.source === "walk_in" ? "walk-in" : "online",
    e.callCount,
    clockWita(e.calledAt),
    e.status === "done" ? clockWita(e.finishedAt) : null,
    e.status === "done" ? entryDurationMinutes(e.calledAt, e.finishedAt) : null,
    e.feeRupiah,
  ]);
  return toCsv(EXPORT_HEADER, rows);
}
