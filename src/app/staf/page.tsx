import { connection } from "next/server";
import { Suspense } from "react";
import { AutoRefresh } from "@/components/staff/auto-refresh";
import { QueueBoard } from "@/components/staff/queue-board";
import { SettingsCard } from "@/components/staff/settings-card";
import { StaffHeader, StaffTabs } from "@/components/staff/staff-header";
import { SummaryCards } from "@/components/staff/summary-cards";
import { WalkInCard } from "@/components/staff/walk-in-card";
import { formatLongDate } from "@/lib/format";
import { getPanelEntries, getPanelSettings, summarize } from "@/lib/staff/data";
import { canAddWalkIn, canManageFee, canSeeSettings } from "@/lib/staff/roles";
import { requireStaff } from "@/lib/staff/session";
import { todayInAppZone } from "@/lib/time";

export default function StafPage() {
  return (
    <Suspense fallback={<PanelSkeleton />}>
      <Panel />
    </Suspense>
  );
}

async function Panel() {
  await connection();
  const staff = await requireStaff();
  const today = todayInAppZone();
  const settings = await getPanelSettings(staff);
  const entries = await getPanelEntries(staff, today, settings);

  return (
    <main className="mx-auto w-full max-w-[1330px] px-4 py-6 sm:px-6">
      <AutoRefresh intervalMs={10_000} />
      <StaffHeader staff={staff} />

      <SummaryCards summary={summarize(entries)} />

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <QueueBoard
          title={`Antrean ${formatLongDate(today)}`}
          entries={entries}
          maxCalls={settings.maxCalls}
          practice={{ clinicName: settings.clinicName, doctorName: settings.doctorName }}
          showFee={canManageFee(staff.role)}
          tabs={<StaffTabs role={staff.role} active="today" />}
        />
        <div className="grid gap-6">
          {canAddWalkIn(staff.role) ? <WalkInCard enabled={settings.walkInEnabled} /> : null}
          {canSeeSettings(staff.role) ? <SettingsCard settings={settings} /> : null}
        </div>
      </div>
    </main>
  );
}

function PanelSkeleton() {
  return (
    <main aria-busy="true" aria-label="Memuat panel" className="mx-auto w-full max-w-[1330px] animate-pulse px-6 py-6">
      <div className="h-8 w-64 rounded bg-staff-line" />
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-28 rounded-box bg-staff-line" />
        ))}
      </div>
      <div className="mt-6 h-96 rounded-box bg-staff-line" />
    </main>
  );
}
