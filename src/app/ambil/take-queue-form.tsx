"use client";

import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { BorderedBox } from "@/components/ui/bordered-box";
import { UnderlineInput } from "@/components/ui/underline-input";
import { BackLink, PageTitle, PatientPage } from "@/components/patient/page-shell";
import { cn } from "@/lib/cn";
import { addMinutes, formatClock, formatDayOption } from "@/lib/format";
import type { DayStatus } from "@/lib/patient/data";
import { firstNameOf, saveQueue } from "@/lib/patient/saved-queue";
import { takeQueueAction, type TakeQueueState } from "./actions";

export type DayOption = {
  date: string;
  status: DayStatus;
  remaining: number;
  reason: string | null;
  nextNumber: number;
};

const UNAVAILABLE_TEXT: Partial<Record<DayStatus, string>> = {
  full: "Kuota sudah penuh",
  holiday: "Praktik libur",
  registration_closed: "Pendaftaran hari ini sudah ditutup",
  registration_not_open: "Pendaftaran hari ini belum dibuka",
};

const UNAVAILABLE_TAG: Partial<Record<DayStatus, string>> = {
  full: "Penuh",
  holiday: "Libur",
  registration_closed: "Ditutup",
  registration_not_open: "Belum dibuka",
};

export function TakeQueueForm({
  days,
  today,
  initialDate,
  openTime,
  avgMinutes,
  siteKey,
}: {
  days: DayOption[];
  today: string;
  initialDate: string | null;
  openTime: string;
  avgMinutes: number;
  siteKey: string;
}) {
  const router = useRouter();
  const turnstile = useRef<TurnstileInstance>(null);
  const [state, formAction, pending] = useActionState<TakeQueueState, FormData>(takeQueueAction, {
    status: "idle",
  });

  // Isian dikendalikan supaya tidak hilang saat server menolak.
  const [date, setDate] = useState<string | null>(initialDate);
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [complaint, setComplaint] = useState("");
  const [consent, setConsent] = useState(false);

  useEffect(() => {
    if (state.status === "ok") {
      saveQueue(
        { token: state.token, number: state.number, date: state.date, firstName: firstNameOf(name) },
        today,
      );
      router.replace(`/antrean/${state.token}?baru=1`);
    } else if (state.status === "error") {
      // Token Turnstile hanya sekali pakai; minta yang baru untuk percobaan berikutnya.
      turnstile.current?.reset();
    }
    // name sengaja tidak ikut: efek hanya bereaksi pada hasil Server Action.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, router, today]);

  const errors = state.status === "error" ? (state.fieldErrors ?? {}) : {};
  const selected = days.find((d) => d.date === date && d.status === "available") ?? null;
  const done = state.status === "ok";

  return (
    <PatientPage>
      <BackLink href="/" />
      <PageTitle title="Pilih hari" subtitle="Kamu akan mendapat nomor antrean, bukan jam pasti." />

      <form action={formAction} className="mt-6" noValidate>
        {days.length === 0 ? (
          <p className="text-muted">Belum ada hari praktik yang bisa dipilih. Coba lagi besok, ya.</p>
        ) : (
          <fieldset>
            <legend className="sr-only">Hari antrean</legend>
            <BorderedBox>
              {days.map((d) =>
                d.status === "available" ? (
                  <label
                    key={d.date}
                    className={cn(
                      "flex cursor-pointer items-center justify-between gap-4 px-[18px] py-4",
                      "has-focus-visible:outline-2 has-focus-visible:-outline-offset-2 has-focus-visible:outline-primary",
                      date === d.date && "bg-tint",
                    )}
                  >
                    <span>
                      <span className="block text-lg">{formatDayOption(d.date, today)}</span>
                      <span className="block text-muted">{d.remaining} antrean tersisa</span>
                    </span>
                    <input
                      type="radio"
                      name="date"
                      value={d.date}
                      checked={date === d.date}
                      onChange={() => setDate(d.date)}
                      className="peer sr-only"
                    />
                    <span
                      aria-hidden="true"
                      className={cn(
                        "flex size-[22px] shrink-0 items-center justify-center rounded-full border-2",
                        date === d.date ? "border-accent bg-accent" : "border-box-line",
                      )}
                    >
                      {date === d.date ? <span className="size-2 rounded-full bg-white" /> : null}
                    </span>
                  </label>
                ) : (
                  <UnavailableDay key={d.date} day={d} today={today} />
                ),
              )}
            </BorderedBox>
            {errors.date ? <p className="mt-2 text-sm text-noshow-fg">{errors.date}</p> : null}
          </fieldset>
        )}

        {selected ? (
          <div className="mt-4 flex items-center justify-between rounded-box border border-box-line px-[18px] py-3.5">
            <span className="text-muted">Nomor antreanmu</span>
            <span className="font-medium text-accent">
              {selected.nextNumber} · sekitar{" "}
              {formatClock(addMinutes(openTime, (selected.nextNumber - 1) * avgMinutes))}
            </span>
          </div>
        ) : null}

        <BorderedBox className="mt-4">
          <UnderlineInput
            label="Nama pasien (wajib)"
            name="name"
            autoComplete="name"
            placeholder="Budi Santoso"
            maxLength={80}
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={errors.name}
          />
          <UnderlineInput
            label="Nomor WhatsApp (wajib)"
            name="whatsapp"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="0812 0000 0000"
            maxLength={32}
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            error={errors.whatsapp}
          />
          <UnderlineInput
            label="Keluhan (opsional)"
            name="complaint"
            placeholder="Telinga kanan berdenging"
            maxLength={500}
            value={complaint}
            onChange={(e) => setComplaint(e.target.value)}
            error={errors.complaint}
          />
        </BorderedBox>

        <label className="mt-5 flex items-start gap-3 text-sm text-muted">
          <input
            type="checkbox"
            name="consent"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-0.5 size-5 shrink-0 accent-primary"
          />
          <span>
            Saya setuju nama, nomor WhatsApp, dan keluhan ini dipakai praktik untuk mengatur antrean dan
            menghubungi saya.
          </span>
        </label>
        {errors.consent ? <p className="mt-1 text-sm text-noshow-fg">{errors.consent}</p> : null}

        <div className="mt-5">
          <Turnstile
            ref={turnstile}
            siteKey={siteKey}
            options={{ language: "id", size: "flexible", action: "ambil-nomor" }}
          />
          {errors.turnstileToken ? (
            <p className="mt-1 text-sm text-noshow-fg">{errors.turnstileToken}</p>
          ) : null}
        </div>

        {state.status === "error" && state.message ? (
          <p role="alert" className="mt-5 rounded-box bg-noshow-bg px-[18px] py-3 text-sm text-noshow-fg">
            {state.message}
          </p>
        ) : null}

        <Button type="submit" className="mt-8" disabled={pending || done || days.length === 0}>
          {pending || done ? "Memproses…" : "Ambil nomor antrean"}
        </Button>
      </form>
    </PatientPage>
  );
}

function UnavailableDay({ day, today }: { day: DayOption; today: string }) {
  const body = (
    <>
      <span>
        <span className="block text-lg text-muted">{formatDayOption(day.date, today)}</span>
        <span className="block text-muted">{day.reason || UNAVAILABLE_TEXT[day.status]}</span>
      </span>
      <span className="text-muted">{UNAVAILABLE_TAG[day.status]}</span>
    </>
  );
  // Hari penuh mengarah ke layar Hari penuh (desain 2b); yang lain tidak bisa dipilih.
  if (day.status === "full") {
    return (
      <Link
        href={`/ambil?penuh=${day.date}`}
        className="flex items-center justify-between gap-4 px-[18px] py-4 hover:bg-tint"
      >
        {body}
      </Link>
    );
  }
  return (
    <div aria-disabled="true" className="flex items-center justify-between gap-4 px-[18px] py-4">
      {body}
    </div>
  );
}
