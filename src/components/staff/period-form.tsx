import Link from "next/link";
import { cn } from "@/lib/cn";
import { formatPeriod, MAX_PERIOD_DAYS, type Period } from "@/lib/staff/history";
import { addDaysToDate } from "@/lib/time";

/** Pilihan periode: pintasan 7/30 hari dan rentang bebas (GET, tanpa JavaScript). */
export function PeriodForm({ period, today }: { period: Period; today: string }) {
  const presets = [7, 30, 90].map((days) => ({
    days,
    from: addDaysToDate(today, -(days - 1)),
  }));

  return (
    <div className="mt-5 flex flex-wrap items-center gap-3">
      <span className="text-muted">Periode</span>
      <span className="inline-flex h-10 items-center rounded-lg border border-staff-line bg-white px-4">
        {formatPeriod(period)}
      </span>
      {presets.map((p) => {
        const active = period.from === p.from && period.to === today;
        return (
          <Link
            key={p.days}
            href={`/staf/riwayat?dari=${p.from}&sampai=${today}`}
            aria-current={active ? "true" : undefined}
            className={cn(
              "inline-flex h-10 items-center rounded-lg px-3 text-sm",
              active ? "bg-soft font-medium" : "text-accent underline hover:bg-tint",
            )}
          >
            {p.days} hari
          </Link>
        );
      })}
      <form method="get" action="/staf/riwayat" className="flex flex-wrap items-center gap-2">
        <label htmlFor="period-from" className="sr-only">
          Dari tanggal
        </label>
        <input
          id="period-from"
          type="date"
          name="dari"
          defaultValue={period.from}
          required
          className="h-10 rounded-lg border border-staff-line bg-white px-3 text-sm"
        />
        <span aria-hidden="true">–</span>
        <label htmlFor="period-to" className="sr-only">
          Sampai tanggal
        </label>
        <input
          id="period-to"
          type="date"
          name="sampai"
          defaultValue={period.to}
          required
          className="h-10 rounded-lg border border-staff-line bg-white px-3 text-sm"
        />
        <button type="submit" className="h-10 rounded-lg bg-soft px-4 text-sm font-medium hover:bg-soft/70">
          Tampilkan
        </button>
        <span className="text-xs text-muted">Paling panjang {MAX_PERIOD_DAYS} hari.</span>
      </form>
    </div>
  );
}
