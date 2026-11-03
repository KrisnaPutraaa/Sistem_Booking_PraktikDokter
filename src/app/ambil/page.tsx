import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { z } from "zod";
import { BorderedBox } from "@/components/ui/bordered-box";
import { BackLink, ChevronIcon, LinkButton, PageTitle, PatientPage } from "@/components/patient/page-shell";
import { getAvailability, getPracticeInfo, type DayAvailability } from "@/lib/patient/data";
import { formatDay } from "@/lib/format";
import { todayInAppZone } from "@/lib/time";
import { turnstileSiteKey } from "@/lib/turnstile.server";
import { TakeQueueForm, type DayOption } from "./take-queue-form";

export const metadata: Metadata = {
  title: "Ambil nomor antrean · Praktik THT",
};

const dateParam = z.iso.date();

export default function AmbilPage({ searchParams }: PageProps<"/ambil">) {
  return (
    <Suspense fallback={<AmbilSkeleton />}>
      <AmbilContent searchParams={searchParams} />
    </Suspense>
  );
}

async function AmbilContent({ searchParams }: { searchParams: PageProps<"/ambil">["searchParams"] }) {
  const params = await searchParams;
  const [days, info] = await Promise.all([getAvailability(), getPracticeInfo()]);
  const today = todayInAppZone();

  // Layar Hari penuh hanya untuk tanggal yang memang penuh; selain itu kembali ke formulir.
  const full = dateParam.safeParse(params.penuh);
  if (full.success && days.some((d) => d.date === full.data && d.status === "full")) {
    return <FullDay date={full.data} quota={info.dailyQuota} today={today} days={days} />;
  }

  // Hari yang bukan hari praktik tidak ditampilkan.
  const options: DayOption[] = days
    .filter((d) => d.status !== "closed")
    .map((d) => ({
      date: d.date,
      status: d.status,
      remaining: d.remaining,
      reason: d.reason,
      // Perkiraan nomor berikutnya: kuota - sisa = nomor terakhir yang terpakai.
      nextNumber: info.dailyQuota - d.remaining + 1,
    }));
  const preselect = dateParam.safeParse(params.tanggal);
  const initialDate =
    preselect.success && options.some((o) => o.date === preselect.data && o.status === "available")
      ? preselect.data
      : null;

  return (
    <TakeQueueForm
      days={options}
      today={today}
      initialDate={initialDate}
      openTime={info.openTime}
      avgMinutes={info.avgMinutes}
      siteKey={turnstileSiteKey()}
    />
  );
}

function FullDay({
  date,
  quota,
  today,
  days,
}: {
  date: string;
  quota: number;
  today: string;
  days: DayAvailability[];
}) {
  const others = days.filter((d) => d.status === "available" && d.date !== date);
  return (
    <PatientPage footer={<LinkButton href="/ambil">Pilih hari lain</LinkButton>}>
      <BackLink href="/ambil" />
      <PageTitle
        title={date === today ? "Kuota hari ini penuh" : "Kuota hari itu penuh"}
        subtitle={`Antrean ${formatDay(date)} sudah terisi ${quota} dari ${quota}. Pilih hari lain, ya.`}
      />
      <h2 className="mt-8 text-sm tracking-wide text-muted uppercase">Hari tersedia</h2>
      {others.length > 0 ? (
        <BorderedBox className="mt-3">
          {others.map((d) => (
            <Link
              key={d.date}
              href={`/ambil?tanggal=${d.date}`}
              className="flex items-center justify-between px-[18px] py-4 hover:bg-tint"
            >
              <span>
                <span className="block text-lg">{formatDay(d.date)}</span>
                <span className="block text-muted">{d.remaining} antrean tersisa</span>
              </span>
              <ChevronIcon direction="right" className="size-5 text-muted" />
            </Link>
          ))}
        </BorderedBox>
      ) : (
        <p className="mt-3 text-muted">Belum ada hari lain yang tersedia. Coba lagi besok, ya.</p>
      )}
    </PatientPage>
  );
}

function AmbilSkeleton() {
  return (
    <PatientPage>
      <div aria-busy="true" aria-label="Memuat hari tersedia" className="animate-pulse">
        <div className="size-10" />
        <div className="mt-4 h-10 w-40 rounded bg-line" />
        <div className="mt-3 h-5 w-full rounded bg-line" />
        <div className="mt-6 h-64 rounded-box bg-line" />
      </div>
    </PatientPage>
  );
}
