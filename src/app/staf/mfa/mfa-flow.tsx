"use client";

import { useRouter } from "next/navigation";
import { useActionState, useState, useTransition } from "react";
import { FieldError, StaffInput } from "@/components/staff/field";
import { RecoveryCodesPanel } from "@/components/staff/recovery-codes-panel";
import { Button } from "@/components/ui/button";
import {
  type EnrollVerifyState,
  redeemRecoveryCodeAction,
  startEnrollAction,
  type VerifyState,
  verifyEnrollAction,
  verifyLoginAction,
} from "./actions";

export type MfaMode = "enroll-required" | "enroll-optional" | "verify" | "done";

/**
 * Satu komponen untuk semua langkah, supaya kode pemulihan di state tetap
 * tampil walau halaman dirender ulang setelah sesi naik ke aal2.
 */
export function MfaFlow({ mode }: { mode: MfaMode }) {
  const router = useRouter();
  const [enrollState, enrollAction, enrollPending] = useActionState<EnrollVerifyState, FormData>(verifyEnrollAction, {
    status: "idle",
  });

  if (enrollState.status === "codes") {
    return (
      <RecoveryCodesPanel
        codes={enrollState.codes}
        doneLabel="Lanjut ke panel"
        onDone={() => router.replace("/staf")}
      />
    );
  }

  if (mode === "verify") return <VerifyStep />;

  if (mode === "done") {
    return (
      <div>
        <h1 className="text-2xl font-semibold">Verifikasi dua langkah aktif</h1>
        <p className="mt-3 text-muted">Akun ini sudah memakai kode dari aplikasi authenticator.</p>
        <Button className="mt-6 font-semibold" onClick={() => router.replace("/staf")}>
          Ke panel
        </Button>
      </div>
    );
  }

  return (
    <EnrollStep
      required={mode === "enroll-required"}
      state={enrollState}
      action={enrollAction}
      pending={enrollPending}
    />
  );
}

function EnrollStep({
  required,
  state,
  action,
  pending,
}: {
  required: boolean;
  state: EnrollVerifyState;
  action: (formData: FormData) => void;
  pending: boolean;
}) {
  const [setup, setSetup] = useState<{ factorId: string; qrCode: string; secret: string } | null>(null);
  const [startError, setStartError] = useState<string | null>(null);
  const [starting, startTransition] = useTransition();

  function begin() {
    startTransition(async () => {
      const result = await startEnrollAction();
      if (result.ok) {
        setSetup({ factorId: result.factorId, qrCode: result.qrCode, secret: result.secret });
        setStartError(null);
      } else {
        setStartError(result.message);
      }
    });
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold">Pasang verifikasi dua langkah</h1>
      <p className="mt-3 text-muted">
        {required
          ? "Akun dokter dan pemilik wajib memakai kode dari aplikasi di ponsel saat masuk. Jadi, kata sandi saja tidak cukup untuk membuka data pasien."
          : "Opsional untuk perawat. Setelah dipasang, setiap kali masuk Anda diminta kode dari ponsel."}
      </p>

      <ol className="mt-5 list-decimal space-y-2 pl-5 text-sm">
        <li>
          Pasang aplikasi authenticator di ponsel, misalnya Google Authenticator atau Microsoft Authenticator. Di
          iPhone bisa juga memakai aplikasi Kata Sandi (Passwords).
        </li>
        <li>Tekan Mulai, lalu pindai kode QR dengan aplikasi itu.</li>
        <li>Masukkan 6 digit kode yang muncul di aplikasi.</li>
      </ol>

      {startError ? (
        <p role="alert" className="mt-4 rounded-xl bg-noshow-bg px-4 py-3 text-sm text-noshow-fg">
          {startError}
        </p>
      ) : null}

      {!setup ? (
        <Button className="mt-6 font-semibold" onClick={begin} disabled={starting}>
          {starting ? "Menyiapkan…" : "Mulai"}
        </Button>
      ) : (
        <div className="mt-6">
          {/* eslint-disable-next-line @next/next/no-img-element -- QR SVG dari Supabase berupa data URL */}
          <img src={setup.qrCode} alt="Kode QR untuk aplikasi authenticator" className="mx-auto size-48 rounded-lg bg-white" />
          <details className="mt-3 text-sm">
            <summary className="cursor-pointer text-accent">Tidak bisa memindai? Ketik kunci ini di aplikasi</summary>
            <p className="mt-2 font-mono break-all select-all">{setup.secret.replace(/(.{4})/g, "$1 ").trim()}</p>
          </details>

          <form action={action} noValidate className="mt-5">
            <input type="hidden" name="factorId" value={setup.factorId} />
            <CodeInput error={state.status === "error" ? state.message : undefined} />
            <div className="mt-5 flex flex-wrap gap-3">
              <Button type="submit" className="font-semibold" disabled={pending}>
                {pending ? "Memeriksa…" : "Aktifkan"}
              </Button>
            </div>
          </form>
          <button type="button" onClick={begin} disabled={starting} className="mt-4 text-sm text-accent underline">
            Buat kode QR baru
          </button>
        </div>
      )}
    </div>
  );
}

function VerifyStep() {
  const [useRecovery, setUseRecovery] = useState(false);
  const [state, action, pending] = useActionState<VerifyState, FormData>(verifyLoginAction, { status: "idle" });
  const [recoveryState, recoveryAction, recoveryPending] = useActionState<VerifyState, FormData>(
    redeemRecoveryCodeAction,
    { status: "idle" },
  );

  if (useRecovery) {
    return (
      <div>
        <h1 className="text-2xl font-semibold">Pakai kode pemulihan</h1>
        <p className="mt-3 text-muted">
          Masukkan salah satu kode pemulihan yang Anda simpan saat memasang verifikasi dua langkah. Perangkat lama
          akan dilepas, lalu Anda masuk lagi dan memasang ponsel baru.
        </p>
        <form action={recoveryAction} noValidate className="mt-6">
          {recoveryState.status === "error" ? (
            <p role="alert" className="mb-4 rounded-xl bg-noshow-bg px-4 py-3 text-sm text-noshow-fg">
              {recoveryState.message}
            </p>
          ) : null}
          <label htmlFor="recoveryCode" className="block font-semibold">
            Kode pemulihan
          </label>
          <StaffInput
            id="recoveryCode"
            name="recoveryCode"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            placeholder="ABCDE-FGHJK"
            className="mt-2 font-mono"
          />
          <Button type="submit" className="mt-6 font-semibold" disabled={recoveryPending}>
            {recoveryPending ? "Memeriksa…" : "Lepas perangkat lama"}
          </Button>
        </form>
        <button type="button" onClick={() => setUseRecovery(false)} className="mt-4 text-sm text-accent underline">
          Kembali ke kode dari aplikasi
        </button>
        <p className="mt-4 text-sm text-muted">
          Tidak punya kode pemulihan? Minta pemilik praktik mereset verifikasi dua langkah akun Anda.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold">Masukkan kode verifikasi</h1>
      <p className="mt-3 text-muted">Buka aplikasi authenticator di ponsel, lalu masukkan 6 digit kode Praktik THT.</p>
      <form action={action} noValidate className="mt-6">
        <CodeInput error={state.status === "error" ? state.message : undefined} />
        <Button type="submit" className="mt-6 font-semibold" disabled={pending}>
          {pending ? "Memeriksa…" : "Verifikasi"}
        </Button>
      </form>
      <button type="button" onClick={() => setUseRecovery(true)} className="mt-4 text-sm text-accent underline">
        Ponsel hilang? Pakai kode pemulihan
      </button>
    </div>
  );
}

function CodeInput({ error }: { error?: string }) {
  return (
    <>
      <label htmlFor="code" className="block font-semibold">
        Kode 6 digit
      </label>
      <StaffInput
        id="code"
        name="code"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9 ]*"
        maxLength={7}
        placeholder="123456"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? "code-error" : undefined}
        className="mt-2 font-mono text-lg tracking-widest"
        autoFocus
      />
      <FieldError id="code-error" message={error} />
    </>
  );
}
