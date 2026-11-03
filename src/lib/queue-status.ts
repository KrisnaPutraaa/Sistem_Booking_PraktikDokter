/** Sama dengan enum queue_status di database (docs/Panduan, bagian 5.1). */
export const QUEUE_STATUSES = ["waiting", "in_progress", "done", "no_show"] as const;

export type QueueStatus = (typeof QUEUE_STATUSES)[number];

export const QUEUE_STATUS_LABEL: Record<QueueStatus, string> = {
  waiting: "menunggu",
  in_progress: "diperiksa",
  done: "selesai",
  no_show: "tidak hadir",
};
