import type { PanelSummary } from "@/lib/staff/data";

export function SummaryCards({ summary }: { summary: PanelSummary }) {
  const cards = [
    { label: "Antrean hari ini", value: String(summary.total), tone: "text-ink" },
    {
      label: "Sedang diperiksa",
      value: summary.nowServing === null ? "–" : `No. ${summary.nowServing}`,
      tone: "text-accent",
    },
    { label: "Menunggu", value: String(summary.waiting), tone: "text-waiting-fg" },
    { label: "Selesai", value: String(summary.done), tone: "text-done-fg" },
  ];
  return (
    <dl className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
      {cards.map((c) => (
        <div key={c.label} className="rounded-box border border-staff-line bg-white px-5 py-4">
          <dt className="text-muted">{c.label}</dt>
          <dd className={`mt-1 text-4xl font-semibold ${c.tone}`}>{c.value}</dd>
        </div>
      ))}
    </dl>
  );
}
