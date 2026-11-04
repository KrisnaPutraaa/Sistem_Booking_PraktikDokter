"use client";

import Link from "next/link";
import { useActionState, useState, useTransition } from "react";
import {
  changePasswordAction,
  disableOwnMfaAction,
  type PasswordState,
  regenerateRecoveryCodesAction,
  resetStaffMfaAction,
  setStaffActiveAction,
} from "@/app/staf/akun/actions";
import { Button } from "@/components/ui/button";
import { ROLE_LABEL, type StaffRole } from "@/lib/staff/roles";
import { useClearOnHide } from "@/lib/use-clear-on-hide";
import { StaffCard } from "./card";
import { FieldError, StaffInput } from "./field";
import { RecoveryCodesPanel } from "./recovery-codes-panel";

function Alert({ message }: { message: string | null | undefined }) {
  if (!message) return null;
  return (
    <p role="alert" className="mt-4 rounded-xl bg-noshow-bg px-4 py-3 text-sm text-noshow-fg">
      {message}
    </p>
  );
}

export function MySecurityCard({
  fullName,
  username,
  role,
  hasMfa,
  mfaRequired,
  codesRemaining,
}: {
  fullName: string;
  username: string;
  role: StaffRole;
  hasMfa: boolean;
  mfaRequired: boolean;
  codesRemaining: number | null;
}) {
  const [codes, setCodes] = useState<string[] | null>(null);
  useClearOnHide(() => setCodes(null));
  const [error, setError] = useState<string | null>(null);
  const [confirmDisable, setConfirmDisable] = useState(false);
  const [pending, startTransition] = useTransition();

  function regenerate() {
    startTransition(async () => {
      const result = await regenerateRecoveryCodesAction();
      if (result.ok) {
        setCodes(result.codes);
        setError(null);
      } else {
        setError(result.message);
      }
    });
  }

  function disable() {
    startTransition(async () => {
      const result = await disableOwnMfaAction();
      setError(result.message);
    });
  }

  return (
    <StaffCard>
      <h2 className="text-xl font-semibold">Akun saya</h2>
      <dl className="mt-4 grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2 text-sm">
        <dt className="text-muted">Nama</dt>
        <dd>{fullName}</dd>
        <dt className="text-muted">Username</dt>
        <dd className="break-all">{username}</dd>
        <dt className="text-muted">Peran</dt>
        <dd>{ROLE_LABEL[role]}</dd>
        <dt className="text-muted">Verifikasi dua langkah</dt>
        <dd>
          {hasMfa ? "Aktif" : "Belum aktif"}
          <span className="text-muted"> · {mfaRequired ? "wajib untuk peran ini" : "opsional"}</span>
        </dd>
        {hasMfa ? (
          <>
            <dt className="text-muted">Kode pemulihan tersisa</dt>
            <dd>{codesRemaining ?? "-"}</dd>
          </>
        ) : null}
      </dl>

      <Alert message={error} />

      {codes ? (
        <div className="mt-6 border-t border-staff-line pt-6">
          <RecoveryCodesPanel codes={codes} doneLabel="Selesai" onDone={() => setCodes(null)} />
        </div>
      ) : (
        <div className="mt-6 flex flex-wrap gap-3">
          {hasMfa ? (
            <Button size="sm" variant="soft" onClick={regenerate} disabled={pending}>
              Buat kode pemulihan baru
            </Button>
          ) : (
            <Link
              href="/staf/mfa"
              className="inline-flex h-10 items-center rounded-lg bg-primary px-4 text-sm font-medium text-white hover:bg-primary/90"
            >
              Pasang verifikasi dua langkah
            </Link>
          )}
          {hasMfa && !mfaRequired ? (
            confirmDisable ? (
              <>
                <Button size="sm" variant="outline" onClick={disable} disabled={pending}>
                  Ya, matikan
                </Button>
                <Button size="sm" variant="soft" onClick={() => setConfirmDisable(false)}>
                  Batal
                </Button>
              </>
            ) : (
              <Button size="sm" variant="outline" onClick={() => setConfirmDisable(true)}>
                Matikan verifikasi dua langkah
              </Button>
            )
          ) : null}
        </div>
      )}
      {hasMfa && !codes ? (
        <p className="mt-3 text-sm text-muted">
          Kode pemulihan baru membatalkan semua kode lama. Ganti ponsel? Pakai satu kode pemulihan saat masuk, atau
          minta pemilik mereset.
        </p>
      ) : null}
    </StaffCard>
  );
}

export function PasswordCard() {
  const [state, action, pending] = useActionState<PasswordState, FormData>(changePasswordAction, { status: "idle" });
  const errors = state.status === "error" ? state.fieldErrors : undefined;

  return (
    <StaffCard>
      <h2 className="text-xl font-semibold">Ganti kata sandi</h2>
      <p className="mt-2 text-sm text-muted">
        Minimal 12 karakter. Pakai kalimat panjang yang mudah diingat, jangan dipakai di layanan lain, dan jangan
        dibagikan. Satu akun untuk satu orang.
      </p>
      <form key={state.status === "ok" ? state.at : "form"} action={action} noValidate className="mt-4 grid gap-4">
        {state.status === "error" && state.message ? <Alert message={state.message} /> : null}
        {state.status === "ok" ? (
          <p role="status" className="rounded-xl bg-tint px-4 py-3 text-sm">
            Kata sandi sudah diganti. Sesi di perangkat lain sudah dikeluarkan.
          </p>
        ) : null}
        <PasswordInput name="current" label="Kata sandi saat ini" autoComplete="current-password" error={errors?.current} />
        <PasswordInput name="next" label="Kata sandi baru" autoComplete="new-password" error={errors?.next} />
        <PasswordInput name="confirm" label="Ulangi kata sandi baru" autoComplete="new-password" error={errors?.confirm} />
        <div>
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? "Menyimpan…" : "Simpan kata sandi"}
          </Button>
        </div>
      </form>
    </StaffCard>
  );
}

function PasswordInput({
  name,
  label,
  autoComplete,
  error,
}: {
  name: string;
  label: string;
  autoComplete: string;
  error?: string;
}) {
  return (
    <div>
      <label htmlFor={`pw-${name}`} className="block text-sm font-semibold">
        {label}
      </label>
      <StaffInput
        id={`pw-${name}`}
        name={name}
        type="password"
        autoComplete={autoComplete}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `pw-${name}-error` : undefined}
        className="mt-2"
      />
      <FieldError id={`pw-${name}-error`} message={error} />
    </div>
  );
}

export type StaffAccountRow = {
  id: string;
  fullName: string;
  role: StaffRole;
  username: string;
  hasMfa: boolean;
  disabled: boolean;
  lastSignIn: string;
  isSelf: boolean;
};

export function StaffAccountsCard({ accounts }: { accounts: StaffAccountRow[] }) {
  const [error, setError] = useState<string | null>(null);

  return (
    <StaffCard className="min-w-0">
      <h2 className="text-xl font-semibold">Akun staf</h2>
      <p className="mt-2 text-sm text-muted">
        Hanya pemilik. Akun baru dibuat di dashboard Supabase (lihat docs/kebijakan-akun-staf.md). Staf yang berhenti:
        nonaktifkan di sini pada hari terakhirnya. Semua tindakan dicatat di audit log.
      </p>
      <Alert message={error} />
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-staff-line text-muted">
            <tr>
              <th className="py-2 pr-4 font-normal">Nama</th>
              <th className="py-2 pr-4 font-normal">Peran</th>
              <th className="py-2 pr-4 font-normal">Dua langkah</th>
              <th className="py-2 pr-4 font-normal">Masuk terakhir</th>
              <th className="py-2 font-normal">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((account) => (
              <AccountRow key={account.id} account={account} onError={setError} />
            ))}
          </tbody>
        </table>
      </div>
    </StaffCard>
  );
}

function AccountRow({ account, onError }: { account: StaffAccountRow; onError: (m: string | null) => void }) {
  const [confirm, setConfirm] = useState<"reset" | "disable" | null>(null);
  const [pending, startTransition] = useTransition();

  function run(kind: "reset" | "disable" | "enable") {
    startTransition(async () => {
      const result =
        kind === "reset"
          ? await resetStaffMfaAction(account.id)
          : await setStaffActiveAction(account.id, kind === "enable");
      onError(result.ok ? null : result.message);
      setConfirm(null);
    });
  }

  return (
    <tr className={`border-b border-staff-line align-top ${pending ? "opacity-60" : ""}`}>
      <td className="py-3 pr-4">
        <p className={account.disabled ? "text-muted line-through" : undefined}>{account.fullName}</p>
        <p className="break-all text-muted">{account.username}</p>
        {account.disabled ? <p className="text-xs text-noshow-fg uppercase">nonaktif</p> : null}
      </td>
      <td className="py-3 pr-4">{ROLE_LABEL[account.role]}</td>
      <td className="py-3 pr-4">{account.hasMfa ? "Aktif" : "Belum"}</td>
      <td className="py-3 pr-4 whitespace-nowrap">{account.lastSignIn}</td>
      <td className="py-3">
        {account.isSelf ? (
          <span className="text-muted">Akun Anda</span>
        ) : confirm ? (
          <div className="flex flex-wrap items-center gap-2">
            <span>{confirm === "reset" ? "Reset verifikasi dua langkah?" : "Nonaktifkan akun ini?"}</span>
            <Button size="sm" variant="outline" disabled={pending} onClick={() => run(confirm)}>
              Ya
            </Button>
            <Button size="sm" variant="soft" onClick={() => setConfirm(null)}>
              Batal
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {account.hasMfa ? (
              <Button size="sm" variant="soft" disabled={pending} onClick={() => setConfirm("reset")}>
                Reset dua langkah
              </Button>
            ) : null}
            {account.disabled ? (
              <Button size="sm" variant="soft" disabled={pending} onClick={() => run("enable")}>
                Aktifkan lagi
              </Button>
            ) : (
              <Button size="sm" variant="soft" disabled={pending} onClick={() => setConfirm("disable")}>
                Nonaktifkan
              </Button>
            )}
          </div>
        )}
      </td>
    </tr>
  );
}
