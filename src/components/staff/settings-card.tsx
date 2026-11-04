import { closedIsoDays, formatClock, formatDayGroups } from "@/lib/format";
import type { PanelSettings } from "@/lib/staff/data";
import { StaffCard } from "./card";

/** Ringkasan pengaturan untuk dokter dan pemilik. Penyuntingan menyusul di Fase 5. */
export function SettingsCard({ settings }: { settings: PanelSettings }) {
  const closed = formatDayGroups(closedIsoDays(settings.openDays));
  const rows: [string, string][] = [
    ["Kuota antrean per hari", String(settings.dailyQuota)],
    ["Rata-rata durasi per pasien", `${settings.avgMinutes} menit`],
    [
      "Pendaftaran online",
      settings.registrationCloseTime
        ? `${formatClock(settings.registrationOpenTime)} – ${formatClock(settings.registrationCloseTime)}`
        : `mulai ${formatClock(settings.registrationOpenTime)}`,
    ],
    ["Pendaftaran ke depan", `${settings.daysAhead} hari`],
    ["Walk-in", settings.walkInEnabled ? "Aktif" : "Mati"],
  ];
  return (
    <StaffCard>
      <h2 className="text-2xl font-semibold">Pengaturan praktik</h2>
      <p className="mt-2 text-sm text-muted">Hanya terlihat oleh dokter dan pemilik.</p>
      <dl className="mt-5 divide-y divide-line">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4 py-2">
            <dt>{label}</dt>
            <dd className="text-right">{value}</dd>
          </div>
        ))}
      </dl>
      <h3 className="mt-5">Jam praktik</h3>
      <div className="mt-1 flex justify-between gap-4">
        <span>{formatDayGroups(settings.openDays)}</span>
        <span>
          {formatClock(settings.openTime)} – {formatClock(settings.closeTime)}
        </span>
      </div>
      {closed ? (
        <div className="mt-1 flex justify-between gap-4 text-muted">
          <span>{closed}</span>
          <span>Tutup</span>
        </div>
      ) : null}
      <p className="mt-5 text-sm text-muted">Pengubahan pengaturan tersedia di tahap berikutnya.</p>
    </StaffCard>
  );
}
