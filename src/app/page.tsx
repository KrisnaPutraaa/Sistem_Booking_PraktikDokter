import { Suspense } from "react";
import { BorderedBox, BoxSection } from "@/components/ui/bordered-box";
import { Brand, LinkButton, PatientPage } from "@/components/patient/page-shell";
import { SavedQueueLink } from "@/components/patient/saved-queue-link";
import { getPracticeInfo } from "@/lib/patient/data";
import { closedIsoDays, formatClock, formatDayGroups, splitDoctorName } from "@/lib/format";

const DEFAULT_PROFILE = "Pemeriksaan telinga, hidung, dan tenggorokan untuk anak dan dewasa.";

export default function Home() {
  return (
    <PatientPage
      footer={
        <>
          <LinkButton href="/ambil">Ambil nomor antrean</LinkButton>
          <SavedQueueLink />
          <p className="mt-4 text-center text-sm text-muted">
            Nomor antrean per hari. Jam pemeriksaan berupa perkiraan.
          </p>
        </>
      }
    >
      <Brand />
      <Suspense fallback={<PracticeSkeleton />}>
        <PracticeDetails />
      </Suspense>
    </PatientPage>
  );
}

async function PracticeDetails() {
  const info = await getPracticeInfo();
  const doctor = splitDoctorName(info.doctorName);
  const openLabel = formatDayGroups(info.openDays);
  const closedLabel = formatDayGroups(closedIsoDays(info.openDays));

  return (
    <>
      <section className="mt-12">
        <p className="text-accent">Dokter Spesialis THT-KL</p>
        <h1 className="mt-2 text-4xl leading-tight font-medium tracking-tight">
          {doctor.name}
          {doctor.title ? (
            <>
              <br />
              <span className="text-muted">{doctor.title}</span>
            </>
          ) : null}
        </h1>
        <p className="mt-4 text-base text-muted">{info.profileText || DEFAULT_PROFILE}</p>
      </section>

      <BorderedBox className="mt-8">
        <BoxSection label="Jam praktik">
          <div className="flex justify-between gap-4">
            <span>{openLabel}</span>
            <span className="shrink-0">
              {formatClock(info.openTime)} – {formatClock(info.closeTime)}
            </span>
          </div>
          {closedLabel ? (
            <div className="mt-1 flex justify-between gap-4 text-muted">
              <span>{closedLabel}</span>
              <span className="shrink-0">Tutup</span>
            </div>
          ) : null}
        </BoxSection>
        {info.clinicName || info.address ? (
          <BoxSection label="Tempat">
            {info.clinicName ? <p>{info.clinicName}</p> : null}
            {info.address ? <p className="text-muted">{info.address}</p> : null}
          </BoxSection>
        ) : null}
        {info.whatsapp ? (
          <BoxSection label="Kontak">
            <p>WhatsApp {info.whatsapp}</p>
          </BoxSection>
        ) : null}
      </BorderedBox>

      {info.emergencyNotice ? (
        <p className="mt-6 rounded-box bg-noshow-bg px-[18px] py-3 text-sm text-noshow-fg">
          {info.emergencyNotice}
        </p>
      ) : null}
    </>
  );
}

function PracticeSkeleton() {
  return (
    <div aria-busy="true" aria-label="Memuat info praktik" className="mt-12 animate-pulse">
      <div className="h-5 w-48 rounded bg-line" />
      <div className="mt-4 h-10 w-full rounded bg-line" />
      <div className="mt-2 h-10 w-40 rounded bg-line" />
      <div className="mt-8 h-48 rounded-box bg-line" />
    </div>
  );
}
