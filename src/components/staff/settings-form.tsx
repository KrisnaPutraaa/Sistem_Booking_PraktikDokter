"use client";

import { type ReactNode, useActionState, useState } from "react";
import { saveSettingsAction, type SettingsState } from "@/app/staf/pengaturan/actions";
import { Button } from "@/components/ui/button";
import type { PanelSettings } from "@/lib/staff/data";
import { minutesOfDay, type SettingsField } from "@/lib/staff/settings-schema";
import { formatWhatsappDisplay } from "@/lib/whatsapp";
import { FieldError, StaffInput, StaffTextarea } from "./field";

const DAYS = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"] as const;
const hhmm = (t: string | null) => (t ? t.slice(0, 5) : "");

export function SettingsForm({ settings }: { settings: PanelSettings }) {
  const [state, formAction, pending] = useActionState<SettingsState, FormData>(saveSettingsAction, {
    status: "idle",
  });
  const errors = state.status === "error" ? state.fieldErrors : undefined;
  const sent = state.status === "error" ? state.values : undefined;

  // Hitungan langsung kuota × durasi terhadap jam praktik (validasi tetap di server).
  const [quota, setQuota] = useState(String(settings.dailyQuota));
  const [avg, setAvg] = useState(String(settings.avgMinutes));
  const [open, setOpen] = useState(hhmm(settings.openTime));
  const [close, setClose] = useState(hhmm(settings.closeTime));
  const needed = Number(quota) * Number(avg);
  const available = open && close ? minutesOfDay(close) - minutesOfDay(open) : 0;
  const fits = Number.isFinite(needed) && available > 0 && needed <= available;

  const field = (name: SettingsField) => ({
    "aria-invalid": errors?.[name] ? true : undefined,
    "aria-describedby": errors?.[name] ? `${name}-error` : undefined,
  });

  return (
    <form action={formAction} noValidate className="mt-6 grid gap-6">
      {state.status === "ok" ? (
        <p role="status" className="rounded-xl bg-done-bg px-4 py-3 text-sm text-done-fg">
          Pengaturan tersimpan.
        </p>
      ) : null}
      {state.status === "error" && state.message ? (
        <p role="alert" className="rounded-xl bg-noshow-bg px-4 py-3 text-sm text-noshow-fg">
          {state.message}
        </p>
      ) : null}

      <Section title="Antrean">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Kuota antrean per hari" name="dailyQuota" error={errors?.dailyQuota}>
            <StaffInput
              id="dailyQuota"
              name="dailyQuota"
              inputMode="numeric"
              value={quota}
              onChange={(e) => setQuota(e.target.value)}
              {...field("dailyQuota")}
            />
          </Field>
          <Field label="Rata-rata durasi per pasien (menit)" name="avgMinutes" error={errors?.avgMinutes}>
            <StaffInput
              id="avgMinutes"
              name="avgMinutes"
              inputMode="numeric"
              value={avg}
              onChange={(e) => setAvg(e.target.value)}
              {...field("avgMinutes")}
            />
          </Field>
        </div>
      </Section>

      <Section title="Jam praktik">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Mulai" name="openTime" error={errors?.openTime}>
            <StaffInput
              id="openTime"
              name="openTime"
              type="time"
              value={open}
              onChange={(e) => setOpen(e.target.value)}
              {...field("openTime")}
            />
          </Field>
          <Field label="Selesai paling lambat" name="closeTime" error={errors?.closeTime}>
            <StaffInput
              id="closeTime"
              name="closeTime"
              type="time"
              value={close}
              onChange={(e) => setClose(e.target.value)}
              {...field("closeTime")}
            />
          </Field>
        </div>
        <p className={`mt-3 text-sm ${fits ? "text-muted" : "text-noshow-fg"}`} aria-live="polite">
          Kuota × durasi = {Number.isFinite(needed) ? needed : "–"} menit dari {Math.max(available, 0)} menit jam praktik
          {fits ? "." : ". Tidak muat: kurangi kuota atau durasi, atau perpanjang jam praktik."}
        </p>

        <fieldset className="mt-4" aria-describedby={errors?.openDays ? "openDays-error" : undefined}>
          <legend className="font-medium">Hari buka</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {DAYS.map((label, i) => (
              <label
                key={label}
                className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-staff-line bg-white px-3 has-checked:border-primary has-checked:bg-tint"
              >
                <input
                  type="checkbox"
                  name="openDays"
                  value={String(i + 1)}
                  defaultChecked={sent ? (sent.openDays ?? []).includes(String(i + 1)) : settings.openDays.includes(i + 1)}
                  className="accent-primary"
                />
                {label}
              </label>
            ))}
          </div>
          <FieldError id="openDays-error" message={errors?.openDays} />
        </fieldset>
      </Section>

      <Section title="Pendaftaran online">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Jam buka pendaftaran" name="registrationOpenTime" error={errors?.registrationOpenTime}>
            <StaffInput
              id="registrationOpenTime"
              name="registrationOpenTime"
              type="time"
              defaultValue={sent?.registrationOpenTime ?? hhmm(settings.registrationOpenTime)}
              {...field("registrationOpenTime")}
            />
          </Field>
          <Field
            label="Jam tutup pendaftaran"
            hint="Kosongkan bila tanpa batas (sampai jam selesai praktik)."
            name="registrationCloseTime"
            error={errors?.registrationCloseTime}
          >
            <StaffInput
              id="registrationCloseTime"
              name="registrationCloseTime"
              type="time"
              defaultValue={sent?.registrationCloseTime ?? hhmm(settings.registrationCloseTime)}
              {...field("registrationCloseTime")}
            />
          </Field>
          <Field label="Pendaftaran ke depan (hari)" hint="0 = hanya hari ini." name="daysAhead" error={errors?.daysAhead}>
            <StaffInput
              id="daysAhead"
              name="daysAhead"
              inputMode="numeric"
              defaultValue={sent?.daysAhead ?? settings.daysAhead}
              {...field("daysAhead")}
            />
          </Field>
          <Field
            label="Batas antrean per nomor WhatsApp per hari"
            name="maxPerWhatsapp"
            error={errors?.maxPerWhatsapp}
          >
            <StaffInput
              id="maxPerWhatsapp"
              name="maxPerWhatsapp"
              inputMode="numeric"
              defaultValue={sent?.maxPerWhatsapp ?? settings.maxPerWhatsapp}
              {...field("maxPerWhatsapp")}
            />
          </Field>
        </div>
        <label className="mt-4 inline-flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            name="walkInEnabled"
            defaultChecked={sent ? sent.walkInEnabled === "on" : settings.walkInEnabled}
            className="size-5 accent-primary"
          />
          <span>Walk-in aktif (staf bisa menambah pasien yang datang langsung)</span>
        </label>
      </Section>

      <Section title="Pengumuman darurat">
        <Field
          label="Teks pengumuman"
          hint="Tampil di halaman pasien. Kosongkan bila tidak ada pengumuman."
          name="emergencyNotice"
          error={errors?.emergencyNotice}
        >
          <StaffTextarea
            id="emergencyNotice"
            name="emergencyNotice"
            maxLength={500}
            defaultValue={sent?.emergencyNotice ?? settings.emergencyNotice ?? ""}
            {...field("emergencyNotice")}
          />
        </Field>
      </Section>

      <Section title="Kontak dan privasi">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Nomor WhatsApp praktik"
            hint="Tampil di halaman Kebijakan Privasi sebagai kontak permintaan hapus data."
            name="practiceWhatsapp"
            error={errors?.practiceWhatsapp}
          >
            <StaffInput
              id="practiceWhatsapp"
              name="practiceWhatsapp"
              inputMode="tel"
              placeholder="0812 3456 7890"
              defaultValue={
                sent?.practiceWhatsapp ?? (settings.practiceWhatsapp ? formatWhatsappDisplay(settings.practiceWhatsapp) : "")
              }
              {...field("practiceWhatsapp")}
            />
          </Field>
          <Field
            label="Anonimkan data pasien otomatis setelah (bulan)"
            hint="Kosongkan = mati (data disimpan sampai diminta dihapus). Bila diisi, nama, WhatsApp, dan keluhan antrean yang lebih tua dihapus setiap malam."
            name="anonymizeAfterMonths"
            error={errors?.anonymizeAfterMonths}
          >
            <StaffInput
              id="anonymizeAfterMonths"
              name="anonymizeAfterMonths"
              inputMode="numeric"
              placeholder="Mati"
              defaultValue={sent?.anonymizeAfterMonths ?? settings.anonymizeAfterMonths ?? ""}
              {...field("anonymizeAfterMonths")}
            />
          </Field>
        </div>
      </Section>

      <div>
        <Button type="submit" size="sm" disabled={pending} className="h-12 px-6 text-base">
          {pending ? "Menyimpan…" : "Simpan pengaturan"}
        </Button>
      </div>
    </form>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-line pt-5 first-of-type:border-t-0 first-of-type:pt-0">
      <h2 className="mb-3 text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Field({
  label,
  hint,
  name,
  error,
  children,
}: {
  label: string;
  hint?: string;
  name: SettingsField;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={name} className="font-medium">
        {label}
      </label>
      {hint ? <p className="text-sm text-muted">{hint}</p> : null}
      <div className="mt-1">{children}</div>
      <FieldError id={`${name}-error`} message={error} />
    </div>
  );
}
