import { connection } from "next/server";
import { Suspense } from "react";
import { StaffCard } from "@/components/staff/card";
import { ClosedDaysCard } from "@/components/staff/closed-days-card";
import { SettingsForm } from "@/components/staff/settings-form";
import { StaffHeader, StaffTabs } from "@/components/staff/staff-header";
import { getPanelSettings } from "@/lib/staff/data";
import { getUpcomingClosedDays } from "@/lib/staff/history-data";
import { canEditSettings } from "@/lib/staff/roles";
import { requireStaff } from "@/lib/staff/session";
import { todayInAppZone } from "@/lib/time";

export default function PengaturanPage() {
  return (
    <Suspense fallback={<SettingsSkeleton />}>
      <Settings />
    </Suspense>
  );
}

async function Settings() {
  await connection();
  const staff = await requireStaff();

  if (!canEditSettings(staff.role)) {
    return (
      <main className="mx-auto w-full max-w-[1330px] px-4 py-6 sm:px-6">
        <StaffHeader staff={staff} />
        <StaffCard className="mt-6">
          <StaffTabs role={staff.role} active="settings" />
          <p className="mt-6">Pengaturan praktik hanya bisa dibuka dokter dan pemilik.</p>
        </StaffCard>
      </main>
    );
  }

  const today = todayInAppZone();
  const [settings, closedDays] = await Promise.all([getPanelSettings(staff), getUpcomingClosedDays(staff, today)]);

  return (
    <main className="mx-auto w-full max-w-[1330px] px-4 py-6 sm:px-6">
      <StaffHeader staff={staff} />
      <div className="mt-6">
        <StaffTabs role={staff.role} active="settings" />
      </div>
      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
        <StaffCard className="min-w-0">
          <h1 className="text-2xl font-semibold sm:text-[28px]">Pengaturan praktik</h1>
          <p className="mt-2 text-sm text-muted">
            Hanya untuk dokter dan pemilik. Perubahan langsung berlaku untuk pendaftaran berikutnya dan dicatat di
            audit log. Semua jam dalam WITA.
          </p>
          <SettingsForm settings={settings} />
        </StaffCard>
        <ClosedDaysCard closedDays={closedDays} today={today} />
      </div>
    </main>
  );
}

function SettingsSkeleton() {
  return (
    <main aria-busy="true" aria-label="Memuat pengaturan" className="mx-auto w-full max-w-[1330px] animate-pulse px-6 py-6">
      <div className="h-8 w-64 rounded bg-staff-line" />
      <div className="mt-6 h-[640px] rounded-box bg-staff-line" />
    </main>
  );
}
