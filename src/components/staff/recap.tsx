import Link from "next/link";
import { cn } from "@/lib/cn";
import { formatLongDate, formatRupiah } from "@/lib/format";
import { formatDuration, type RecapDay, type RecapSummary } from "@/lib/staff/history";

export function RecapSummaryCards({ summary }: { summary: RecapSummary }) {
  const cards = [
    { label: "Total pasien", value: String(summary.total), tone: "text-ink" },
    { label: "Selesai", value: String(summary.done), tone: "text-done-fg" },
    { label: "Tidak hadir", value: String(summary.noShow), tone: "text-waiting-fg" },
    { label: "Rata-rata durasi", value: formatDuration(summary.avgMinutes, "mnt"), tone: "text-ink" },
  ];
  if (summary.totalFee !== null) {
    cards.push({ label: "Total tarif", value: formatRupiah(summary.totalFee), tone: "text-ink" });
  }
  return (
    <dl className={cn("mt-6 grid grid-cols-2 gap-4", cards.length === 5 ? "lg:grid-cols-3 xl:grid-cols-5" : "lg:grid-cols-4")}>
      {cards.map((c) => (
        <div key={c.label} className="min-w-0 rounded-box border border-staff-line bg-white px-5 py-4">
          <dt className="text-muted">{c.label}</dt>
          <dd className={`mt-1 text-3xl font-semibold break-words sm:text-4xl ${c.tone}`}>{c.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function RecapTable({
  days,
  today,
  showFee,
  selected,
  dayHref,
}: {
  days: RecapDay[];
  today: string;
  showFee: boolean;
  selected: string | null;
  dayHref: (date: string) => string;
}) {
  return (
    <div className="mt-6 overflow-x-auto">
      <table className="w-full min-w-[720px] text-left">
        <thead>
          <tr className="border-b border-staff-line text-sm tracking-wider text-muted uppercase">
            <th className="py-3 pr-4 font-normal">Tanggal</th>
            <th className="py-3 pr-4 font-normal">Total pasien</th>
            <th className="py-3 pr-4 font-normal">Selesai</th>
            <th className="py-3 pr-4 font-normal">Tidak hadir</th>
            <th className="py-3 pr-4 font-normal">Rata-rata durasi</th>
            {showFee ? <th className="py-3 font-normal">Total tarif</th> : null}
          </tr>
        </thead>
        <tbody>
          {days.map((d) => (
            <tr key={d.date} className={cn("border-b border-line", d.date === selected && "bg-tint")}>
              <td className="py-4 pr-4">
                <Link
                  href={`${dayHref(d.date)}#detail`}
                  aria-current={d.date === selected ? "true" : undefined}
                  className="underline decoration-staff-line underline-offset-4 hover:decoration-primary"
                >
                  {formatLongDate(d.date)}
                  {d.date === today ? " (hari ini)" : null}
                </Link>
              </td>
              <td className="py-4 pr-4">
                {d.total}
                {d.open > 0 ? <span className="text-muted"> ({openLabel(d, today)})</span> : null}
              </td>
              <td className="py-4 pr-4">{d.done}</td>
              <td className="py-4 pr-4">{d.noShow}</td>
              <td className="py-4 pr-4">{formatDuration(d.avgMinutes)}</td>
              {showFee ? <td className="py-4">{formatRupiah(d.totalFee ?? 0)}</td> : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Keterangan antrean yang belum ditutup (menunggu atau diperiksa). */
function openLabel(d: RecapDay, today: string): string {
  if (d.date === today) return "berjalan";
  if (d.date > today) return "terdaftar";
  return `${d.open} belum ditutup`;
}
