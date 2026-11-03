import { cn } from "@/lib/cn";
import { QUEUE_STATUS_LABEL, type QueueStatus } from "@/lib/queue-status";

const styles: Record<QueueStatus, string> = {
  waiting: "bg-waiting-bg text-waiting-fg",
  in_progress: "bg-progress-bg text-progress-fg",
  done: "bg-done-bg text-done-fg",
  no_show: "bg-noshow-bg text-noshow-fg",
};

export function StatusBadge({ status, className }: { status: QueueStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-sm whitespace-nowrap",
        styles[status],
        className,
      )}
    >
      {QUEUE_STATUS_LABEL[status]}
    </span>
  );
}
