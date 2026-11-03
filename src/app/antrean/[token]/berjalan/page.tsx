import { notFound } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { BorderedBox, BoxSection } from "@/components/ui/bordered-box";
import { BackLink, LinkButton, PageTitle, PatientPage } from "@/components/patient/page-shell";
import { AutoRefresh } from "@/components/patient/queue-client";
import { getMyQueue, getNextWaiting } from "@/lib/patient/data";
import { formatClock, formatDay } from "@/lib/format";
import { QUEUE_STATUS_LABEL } from "@/lib/queue-status";
import { todayInAppZone } from "@/lib/time";

const REFRESH_MS = 15_000;

export default function AntreanBerjalanPage({ params }: PageProps<"/antrean/[token]/berjalan">) {
  return (
    <Suspense fallback={<BoardSkeleton />}>
      <Board params={params} />
    </Suspense>
  );
}

async function Board({ params }: Pick<PageProps<"/antrean/[token]/berjalan">, "params">) {
  const { token } = await params;
  const [queue, next] = await Promise.all([getMyQueue(token), getNextWaiting(token)]);
  if (!queue) notFound();

  const today = todayInAppZone();
  const isToday = queue.date === today;
  // Polling hanya berguna selama antrean hari ini masih berjalan untuk pasien ini.
  const live = isToday && (queue.status === "waiting" || queue.status === "in_progress");

  return (
    <PatientPage footer={<LinkButton href={`/antrean/${token}`} variant="outline">Kembali ke nomor saya</LinkButton>}>
      {live ? <AutoRefresh intervalMs={REFRESH_MS} /> : null}
      <BackLink href={`/antrean/${token}`} />
      <PageTitle title="Antrean berjalan" subtitle="Pantau giliranmu tanpa perlu bertanya ke perawat." />

      <BorderedBox className="mt-6">
        <BoxSection className="py-6 text-center">
          <p className="text-sm tracking-[0.12em] text-muted uppercase">Sedang diperiksa</p>
          <p className="mt-1 text-[104px] leading-none font-semibold tracking-tight text-accent">
            {queue.nowServing ?? "–"}
          </p>
          <p className="mt-3 text-muted">
            {!isToday && queue.date > today
              ? `Antrean dimulai ${formatDay(queue.date)}`
              : queue.nowServing === null
                ? "Belum ada pasien yang dipanggil"
                : live
                  ? "Diperbarui otomatis"
                  : "Antrean hari itu sudah berakhir"}
          </p>
        </BoxSection>
        <Row label="Nomor kamu">
          <span className="font-semibold text-accent">{queue.number}</span>
        </Row>
        <Row label="Sisa antrean">
          {queue.status === "waiting" ? `${queue.waitingAhead} pasien` : QUEUE_STATUS_LABEL[queue.status]}
        </Row>
        {queue.status === "waiting" ? (
          <Row label="Perkiraan dipanggil">sekitar {formatClock(queue.estTime)}</Row>
        ) : null}
      </BorderedBox>

      {next.length > 0 ? (
        <>
          <h2 className="mt-8 text-sm tracking-wide text-muted uppercase">Berikutnya</h2>
          <BorderedBox className="mt-3">
            {next.map((n, i) => (
              <div key={n} className="flex items-center justify-between px-[18px] py-3.5">
                <span className="text-lg">No. {n}</span>
                <span className={i === 0 ? "text-accent" : "text-muted"}>
                  {n === queue.number ? "nomor kamu" : i === 0 ? "berikutnya" : "menunggu"}
                </span>
              </div>
            ))}
          </BorderedBox>
        </>
      ) : null}
    </PatientPage>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between px-[18px] py-4">
      <span className="text-muted">{label}</span>
      <span className="text-lg font-medium">{children}</span>
    </div>
  );
}

function BoardSkeleton() {
  return (
    <PatientPage>
      <div aria-busy="true" aria-label="Memuat antrean berjalan" className="animate-pulse">
        <div className="size-10" />
        <div className="mt-4 h-10 w-56 rounded bg-line" />
        <div className="mt-6 h-96 rounded-box bg-line" />
      </div>
    </PatientPage>
  );
}
