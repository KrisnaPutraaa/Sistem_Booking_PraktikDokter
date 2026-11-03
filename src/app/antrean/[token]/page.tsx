import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BorderedBox, BoxSection } from "@/components/ui/bordered-box";
import { Brand, ChevronIcon, LinkButton, PatientPage } from "@/components/patient/page-shell";
import { Greeting, RememberQueue } from "@/components/patient/queue-client";
import { getMyQueue, getPracticeInfo, type MyQueue } from "@/lib/patient/data";
import { addMinutes, formatClock, formatLongDate } from "@/lib/format";
import { todayInAppZone } from "@/lib/time";

export default function NomorAntreanPage({ params, searchParams }: PageProps<"/antrean/[token]">) {
  return (
    <PatientPage footer={<LinkButton href="/">Kembali ke beranda</LinkButton>}>
      <Brand />
      <Suspense fallback={<TicketSkeleton />}>
        <Ticket params={params} searchParams={searchParams} />
      </Suspense>
    </PatientPage>
  );
}

async function Ticket({
  params,
  searchParams,
}: Pick<PageProps<"/antrean/[token]">, "params" | "searchParams">) {
  const [{ token }, query] = await Promise.all([params, searchParams]);
  const [queue, info] = await Promise.all([getMyQueue(token), getPracticeInfo()]);
  if (!queue) notFound();

  const isNew = query.baru === "1" && queue.status === "waiting";
  const today = todayInAppZone();
  const arriveAt = formatClock(addMinutes(queue.estTime, -info.avgMinutes));

  return (
    <>
      <RememberQueue token={token} number={queue.number} date={queue.date} />

      <header className="mt-4 flex flex-col items-center text-center">
        {isNew ? (
          <span className="flex size-11 items-center justify-center rounded-full bg-tint text-accent">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="size-5">
              <path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        ) : null}
        <h1 className="mt-4 text-2xl font-medium tracking-tight">
          {isNew ? "Antrean berhasil dibuat" : "Nomor antreanmu"}
        </h1>
        {isNew ? <Greeting token={token} /> : null}
      </header>

      <BorderedBox className="mt-6 text-center">
        <BoxSection className="py-6">
          <p className="text-sm tracking-[0.12em] text-muted uppercase">Nomor antrean</p>
          <p className="mt-1 text-[104px] leading-none font-semibold tracking-tight text-accent">
            {queue.number}
          </p>
          <p className="mt-4 text-lg font-medium">{formatLongDate(queue.date)}</p>
          <p className="text-muted">{statusLine(queue, today)}</p>
        </BoxSection>
        <Link
          href={`/antrean/${token}/berjalan`}
          className="flex items-center justify-between px-[18px] py-4 text-left hover:bg-tint"
        >
          <span className="text-muted">Antrean berjalan sekarang</span>
          <span className="flex shrink-0 items-center gap-3 font-medium whitespace-nowrap">
            {queue.nowServing ? `No. ${queue.nowServing}` : "Belum dimulai"}
            <ChevronIcon direction="right" className="size-4" />
          </span>
        </Link>
      </BorderedBox>

      {queue.status === "waiting" && queue.date >= today ? (
        <BorderedBox className="mt-4">
          <p className="px-[18px] pt-4 pb-3 text-sm tracking-wide text-muted uppercase">Yang perlu kamu lakukan</p>
          <ol>
            {[
              "Screenshot halaman ini sebagai bukti antrean.",
              `Datang ke ${info.clinicName ?? "tempat praktik"} sekitar pukul ${arriveAt}.`,
              "Sebutkan nama atau nomor antrean ke perawat.",
            ].map((text, i) => (
              <li key={text} className="flex gap-4 border-t border-line px-[18px] py-4">
                <span className="font-semibold text-accent">{i + 1}</span>
                <span>{text}</span>
              </li>
            ))}
          </ol>
        </BorderedBox>
      ) : null}
    </>
  );
}

function statusLine(queue: MyQueue, today: string): string {
  if (queue.status === "in_progress") return "Giliranmu sekarang. Silakan masuk ke ruang periksa.";
  if (queue.status === "done") return "Pemeriksaan selesai. Semoga lekas sembuh.";
  if (queue.status === "no_show") return "Ditandai tidak hadir. Bila sudah di tempat, hubungi perawat.";
  if (queue.date < today) return "Tanggal antrean ini sudah lewat.";
  return `Perkiraan dipanggil sekitar pukul ${formatClock(queue.estTime)}`;
}

function TicketSkeleton() {
  return (
    <div aria-busy="true" aria-label="Memuat nomor antrean" className="mt-6 animate-pulse">
      <div className="mx-auto h-8 w-56 rounded bg-line" />
      <div className="mt-6 h-72 rounded-box bg-line" />
      <div className="mt-4 h-48 rounded-box bg-line" />
    </div>
  );
}
