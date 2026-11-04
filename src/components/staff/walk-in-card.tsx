"use client";

import { useActionState } from "react";
import { addWalkInAction, type WalkInState } from "@/app/staf/actions";
import { Button } from "@/components/ui/button";
import { StaffCard } from "./card";
import { FieldError, StaffInput, StaffTextarea } from "./field";

/** Pencatatan pasien walk-in hari ini. Boleh setelah jam tutup pendaftaran online. */
export function WalkInCard({ enabled }: { enabled: boolean }) {
  const [state, formAction, pending] = useActionState<WalkInState, FormData>(addWalkInAction, { status: "idle" });
  const errors = state.status === "error" ? state.fieldErrors : undefined;

  return (
    <StaffCard>
      <h2 className="text-2xl font-semibold">Tambah pasien walk-in</h2>
      <p className="mt-2 text-sm text-muted">
        Untuk pasien yang datang langsung hari ini. Tetap bisa setelah pendaftaran online ditutup.
      </p>

      {!enabled ? (
        <p className="mt-4 rounded-xl bg-tint px-4 py-3 text-sm">Walk-in sedang dimatikan di Pengaturan.</p>
      ) : (
        // key: formulir dikosongkan setelah berhasil.
        <form key={state.status === "ok" ? state.at : "form"} action={formAction} noValidate className="mt-4 grid gap-3">
          {state.status === "ok" ? (
            <p role="status" className="rounded-xl bg-done-bg px-4 py-3 text-sm text-done-fg">
              Pasien walk-in mendapat nomor {state.number}.
            </p>
          ) : null}
          {state.status === "error" && state.message ? (
            <p role="alert" className="rounded-xl bg-noshow-bg px-4 py-3 text-sm text-noshow-fg">
              {state.message}
            </p>
          ) : null}

          <div>
            <label htmlFor="walkin-name" className="font-medium">
              Nama pasien
            </label>
            <StaffInput
              id="walkin-name"
              name="name"
              autoComplete="off"
              maxLength={80}
              className="mt-1"
              aria-invalid={errors?.name ? true : undefined}
              aria-describedby={errors?.name ? "walkin-name-error" : undefined}
            />
            <FieldError id="walkin-name-error" message={errors?.name} />
          </div>
          <div>
            <label htmlFor="walkin-wa" className="font-medium">
              Nomor WhatsApp
            </label>
            <StaffInput
              id="walkin-wa"
              name="whatsapp"
              inputMode="tel"
              autoComplete="off"
              placeholder="0812 3456 7890"
              className="mt-1"
              aria-invalid={errors?.whatsapp ? true : undefined}
              aria-describedby={errors?.whatsapp ? "walkin-wa-error" : undefined}
            />
            <FieldError id="walkin-wa-error" message={errors?.whatsapp} />
          </div>
          <div>
            <label htmlFor="walkin-complaint" className="font-medium">
              Keluhan <span className="font-normal text-muted">(opsional)</span>
            </label>
            <StaffTextarea
              id="walkin-complaint"
              name="complaint"
              maxLength={500}
              className="mt-1"
              aria-invalid={errors?.complaint ? true : undefined}
              aria-describedby={errors?.complaint ? "walkin-complaint-error" : undefined}
            />
            <FieldError id="walkin-complaint-error" message={errors?.complaint} />
          </div>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" name="consent" className="mt-0.5 size-4 accent-primary" />
            <span>Pasien sudah menyetujui datanya dicatat untuk antrean.</span>
          </label>
          <FieldError id="walkin-consent-error" message={errors?.consent} />

          <Button type="submit" disabled={pending} className="mt-1">
            {pending ? "Menyimpan…" : "Tambah ke antrean hari ini"}
          </Button>
        </form>
      )}
    </StaffCard>
  );
}
