"use client";

import { useActionState, useState, useTransition } from "react";
import { addClosedDayAction, type ClosedDayState, deleteClosedDayAction } from "@/app/staf/pengaturan/actions";
import { Button } from "@/components/ui/button";
import { formatLongDate } from "@/lib/format";
import type { ClosedDay } from "@/lib/staff/history-data";
import { StaffCard } from "./card";
import { FieldError, StaffInput } from "./field";

/** Hari libur (closed_days) mulai hari ini. Peringatan bila tanggal itu sudah punya antrean aktif. */
export function ClosedDaysCard({ closedDays, today }: { closedDays: ClosedDay[]; today: string }) {
  const [state, formAction, pending] = useActionState<ClosedDayState, FormData>(addClosedDayAction, {
    status: "idle",
  });
  const [message, setMessage] = useState<string | null>(null);
  const [deleting, startDelete] = useTransition();

  function remove(day: string) {
    if (!window.confirm(`Hapus hari libur ${formatLongDate(day)}? Pendaftaran untuk tanggal itu dibuka lagi.`)) return;
    startDelete(async () => {
      const result = await deleteClosedDayAction(day);
      setMessage(result.ok ? null : (result.message ?? "Gagal menghapus."));
    });
  }

  return (
    <StaffCard>
      <h2 className="text-2xl font-semibold">Hari libur</h2>
      <p className="mt-2 text-sm text-muted">
        Tanggal tertentu tanpa praktik, mis. cuti atau hari raya. Pasien tidak bisa mendaftar pada tanggal ini.
      </p>

      <form key={state.status === "ok" ? state.at : "form"} action={formAction} noValidate className="mt-4 grid gap-3">
        {state.status === "ok" ? (
          <p
            role="status"
            className={
              state.activeCount > 0
                ? "rounded-xl bg-waiting-bg px-4 py-3 text-sm text-waiting-fg"
                : "rounded-xl bg-done-bg px-4 py-3 text-sm text-done-fg"
            }
          >
            {formatLongDate(state.day)} ditandai libur.
            {state.activeCount > 0
              ? ` Sudah ada ${state.activeCount} antrean aktif pada tanggal ini. Kabari pasien lewat WhatsApp.`
              : null}
          </p>
        ) : null}
        {state.status === "error" && !state.field ? (
          <p role="alert" className="rounded-xl bg-noshow-bg px-4 py-3 text-sm text-noshow-fg">
            {state.message}
          </p>
        ) : null}
        <div>
          <label htmlFor="closed-day" className="font-medium">
            Tanggal
          </label>
          <StaffInput
            id="closed-day"
            name="day"
            type="date"
            min={today}
            required
            className="mt-1"
            aria-invalid={state.status === "error" && state.field === "day" ? true : undefined}
            aria-describedby={state.status === "error" && state.field === "day" ? "closed-day-error" : undefined}
          />
          <FieldError id="closed-day-error" message={state.status === "error" && state.field === "day" ? state.message : undefined} />
        </div>
        <div>
          <label htmlFor="closed-reason" className="font-medium">
            Alasan <span className="font-normal text-muted">(opsional, tampil ke pasien)</span>
          </label>
          <StaffInput id="closed-reason" name="reason" maxLength={200} autoComplete="off" className="mt-1" />
          <FieldError
            id="closed-reason-error"
            message={state.status === "error" && state.field === "reason" ? state.message : undefined}
          />
        </div>
        <Button type="submit" size="sm" variant="soft" disabled={pending}>
          {pending ? "Menyimpan…" : "Tambah hari libur"}
        </Button>
      </form>

      {message ? (
        <p role="alert" className="mt-4 rounded-xl bg-noshow-bg px-4 py-3 text-sm text-noshow-fg">
          {message}
        </p>
      ) : null}

      {closedDays.length === 0 ? (
        <p className="mt-5 text-sm text-muted">Belum ada hari libur yang akan datang.</p>
      ) : (
        <ul className="mt-5 divide-y divide-line">
          {closedDays.map((d) => (
            <li key={d.day} className="flex items-start justify-between gap-3 py-3">
              <div>
                <p>{formatLongDate(d.day)}</p>
                {d.reason ? <p className="text-sm text-muted">{d.reason}</p> : null}
                {d.activeCount > 0 ? (
                  <p className="mt-1 text-sm text-waiting-fg">{d.activeCount} antrean aktif, kabari pasien.</p>
                ) : null}
              </div>
              <Button size="sm" variant="outline" disabled={deleting} onClick={() => remove(d.day)}>
                Hapus
              </Button>
            </li>
          ))}
        </ul>
      )}
    </StaffCard>
  );
}
