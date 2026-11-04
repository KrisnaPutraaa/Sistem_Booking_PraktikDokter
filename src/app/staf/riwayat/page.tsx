import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { StaffCard } from "@/components/staff/card";
import { HistoryDay } from "@/components/staff/history-day";
import { PeriodForm } from "@/components/staff/period-form";
import { RecapSummaryCards, RecapTable } from "@/components/staff/recap";
import { StaffHeader, StaffTabs } from "@/components/staff/staff-header";
import { formatLongDate } from "@/lib/format";
import { parsePeriod, summarizeRecap } from "@/lib/staff/history";
import { getDailyRecap, getDayEntries } from "@/lib/staff/history-data";
import { canCorrectName, canExportCsv, canManageFee, canReopenDone, canSeeFeeTotals } from "@/lib/staff/roles";
import { requireStaff } from "@/lib/staff/session";
import { isCalendarDate, todayInAppZone } from "@/lib/time";

export default function RiwayatPage({ searchParams }: PageProps<"/staf/riwayat">) {
  return (
    <Suspense fallback={<HistorySkeleton />}>
      <History searchParams={searchParams} />
    </Suspense>
  );
}

async function History({ searchParams }: { searchParams: PageProps<"/staf/riwayat">["searchParams"] }) {
  await connection();
  const staff = await requireStaff();
  const params = await searchParams;
  const today = todayInAppZone();
  const period = parsePeriod(params, today);
  const showFeeTotals = canSeeFeeTotals(staff.role);

  const days = await getDailyRecap(staff, period);
  const summary = summarizeRecap(days, showFeeTotals);

  const selected = typeof params.tanggal === "string" && isCalendarDate(params.tanggal) ? params.tanggal : null;
  const dayEntries = selected ? await getDayEntries(staff, selected) : null;

  const periodQuery = `dari=${period.from}&sampai=${period.to}`;

  return (
    <main className="mx-auto w-full max-w-[1330px] px-4 py-6 sm:px-6">
      <StaffHeader staff={staff} />

      <StaffCard className="mt-6 min-w-0">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <h1 className="text-2xl font-semibold sm:text-[28px]">Riwayat dan rekap</h1>
          {canExportCsv(staff.role) ? (
            // Unduhan berkas biasa (bukan navigasi Next), jadi <a>, bukan <Link>.
            <a
              href={`/staf/riwayat/ekspor?${periodQuery}`}
              download
              className="inline-flex h-10 items-center rounded-lg bg-soft px-4 text-sm font-medium hover:bg-soft/70"
            >
              Ekspor rekap CSV
            </a>
          ) : null}
        </div>
        <div className="mt-4">
          <StaffTabs role={staff.role} active="history" />
        </div>

        <PeriodForm period={period} today={today} />

        <RecapSummaryCards summary={summary} />

        {days.length === 0 ? (
          <p className="mt-8 text-muted">Belum ada antrean pada periode ini.</p>
        ) : (
          <RecapTable
            days={days}
            today={today}
            showFee={showFeeTotals}
            selected={selected}
            dayHref={(date) => `/staf/riwayat?${periodQuery}&tanggal=${date}`}
          />
        )}
      </StaffCard>

      {selected && dayEntries ? (
        <StaffCard className="mt-6 min-w-0">
          <div id="detail" className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-2xl font-semibold">Pasien {formatLongDate(selected)}</h2>
            <Link href={`/staf/riwayat?${periodQuery}`} className="text-sm text-accent underline">
              Tutup detail
            </Link>
          </div>
          <HistoryDay
            key={selected}
            entries={dayEntries}
            showFee={canManageFee(staff.role)}
            canCorrectName={canCorrectName(staff.role)}
            canReopen={canReopenDone(staff.role)}
          />
        </StaffCard>
      ) : null}
    </main>
  );
}

function HistorySkeleton() {
  return (
    <main aria-busy="true" aria-label="Memuat riwayat" className="mx-auto w-full max-w-[1330px] animate-pulse px-6 py-6">
      <div className="h-8 w-64 rounded bg-staff-line" />
      <div className="mt-6 h-[520px] rounded-box bg-staff-line" />
    </main>
  );
}
