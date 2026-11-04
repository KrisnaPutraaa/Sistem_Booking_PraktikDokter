"use client";

import { type ReactNode, useState, useTransition } from "react";
import { setFeeAction, updateStatusAction } from "@/app/staf/actions";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/cn";
import { formatRupiah } from "@/lib/format";
import { QUEUE_STATUS_LABEL, QUEUE_STATUSES, type QueueStatus } from "@/lib/queue-status";
import type { PanelEntry } from "@/lib/staff/data";
import type { StatusAction } from "@/lib/staff/schemas";
import { buildWhatsappLink } from "@/lib/staff/whatsapp-message";
import { formatWhatsappDisplay } from "@/lib/whatsapp";
import { StaffCard } from "./card";

type Practice = { clinicName: string | null; doctorName: string };

export function QueueBoard({
  title,
  entries,
  maxCalls,
  practice,
  showFee,
  tabs,
}: {
  title: string;
  tabs: ReactNode;
  entries: PanelEntry[];
  maxCalls: number;
  practice: Practice;
  showFee: boolean;
}) {
  const [filter, setFilter] = useState<QueueStatus | "all">("all");
  const [message, setMessage] = useState<string | null>(null);
  const shown = filter === "all" ? entries : entries.filter((e) => e.status === filter);

  return (
    <StaffCard className="min-w-0">
      <h1 className="text-2xl font-semibold sm:text-[28px]">{title}</h1>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        {tabs}
        <label className="sr-only" htmlFor="status-filter">
          Saring status
        </label>
        <select
          id="status-filter"
          value={filter}
          onChange={(e) => setFilter(e.target.value as QueueStatus | "all")}
          className="h-10 rounded-lg border border-staff-line bg-white px-3"
        >
          <option value="all">Semua status</option>
          {QUEUE_STATUSES.map((s) => (
            <option key={s} value={s}>
              {QUEUE_STATUS_LABEL[s]}
            </option>
          ))}
        </select>
      </div>

      {message ? (
        <p role="alert" className="mt-4 rounded-xl bg-noshow-bg px-4 py-3 text-sm text-noshow-fg">
          {message}
        </p>
      ) : null}

      {entries.length === 0 ? (
        <p className="mt-8 text-muted">Belum ada antrean hari ini.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left">
            <thead>
              <tr className="border-b border-staff-line text-sm tracking-wider text-muted uppercase">
                <th className="py-3 pr-4 font-normal">No</th>
                <th className="py-3 pr-4 font-normal">Pasien</th>
                <th className="py-3 pr-4 font-normal">Keluhan</th>
                {showFee ? <th className="py-3 pr-4 font-normal">Tarif</th> : null}
                <th className="py-3 pr-4 font-normal">Status</th>
                <th className="py-3 font-normal">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((entry) => (
                <QueueRow
                  key={entry.id}
                  entry={entry}
                  maxCalls={maxCalls}
                  practice={practice}
                  showFee={showFee}
                  onError={setMessage}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </StaffCard>
  );
}

function QueueRow({
  entry,
  maxCalls,
  practice,
  showFee,
  onError,
}: {
  entry: PanelEntry;
  maxCalls: number;
  practice: Practice;
  showFee: boolean;
  onError: (message: string | null) => void;
}) {
  const [pending, startTransition] = useTransition();

  function run(action: StatusAction) {
    startTransition(async () => {
      const result = await updateStatusAction(entry.id, action);
      onError(result.ok ? null : result.message);
    });
  }

  const canMarkNoShow = entry.callCount >= maxCalls;
  const waLink = entry.whatsapp
    ? buildWhatsappLink({
        whatsapp: entry.whatsapp,
        number: entry.number,
        status: entry.status,
        estTime: entry.estTime,
        clinicName: practice.clinicName,
        doctorName: practice.doctorName,
      })
    : null;

  return (
    <tr className={cn("border-b border-line align-top", pending && "opacity-60")}>
      <td className="py-4 pr-4 text-2xl font-semibold">{entry.number}</td>
      <td className="py-4 pr-4">
        <p>{entry.name}</p>
        <p className="whitespace-nowrap text-muted">
          {entry.whatsapp ? formatWhatsappDisplay(entry.whatsapp) : "(data dihapus)"}
        </p>
        {entry.source === "walk_in" ? <p className="mt-1 text-xs text-accent uppercase">walk-in</p> : null}
      </td>
      <td className="max-w-[200px] py-4 pr-4 break-words">
        {entry.complaint ?? <span className="text-muted">(tidak mengisi keluhan)</span>}
      </td>
      {showFee ? (
        <td className="py-4 pr-4">
          {entry.status === "no_show" ? (
            <span className="text-muted">–</span>
          ) : (
            <FeeInput entryId={entry.id} number={entry.number} value={entry.feeRupiah} onError={onError} />
          )}
        </td>
      ) : null}
      <td className="py-4 pr-4">
        <StatusBadge status={entry.status} />
        {entry.callCount > 0 && entry.status !== "done" ? (
          <p className="mt-1 text-xs text-muted">dipanggil {entry.callCount}×</p>
        ) : null}
      </td>
      <td className="w-[200px] py-4">
        <div className="flex flex-wrap gap-2">
          {entry.status === "waiting" ? (
            <Button size="sm" disabled={pending} onClick={() => run("call")}>
              Panggil
            </Button>
          ) : null}
          {entry.status === "in_progress" ? (
            <>
              <Button size="sm" variant="soft" disabled={pending} onClick={() => run("finish")}>
                Selesai
              </Button>
              <Button size="sm" variant="outline" disabled={pending} onClick={() => run("call")}>
                Panggil lagi
              </Button>
              <Button size="sm" variant="outline" disabled={pending} onClick={() => run("skip")}>
                Belum datang
              </Button>
            </>
          ) : null}
          {(entry.status === "waiting" || entry.status === "in_progress") && canMarkNoShow ? (
            <Button size="sm" variant="outline" disabled={pending} onClick={() => run("no_show")}>
              Tidak hadir
            </Button>
          ) : null}
          {entry.status === "no_show" ? (
            <Button size="sm" variant="soft" disabled={pending} onClick={() => run("restore")}>
              Kembalikan ke antrean
            </Button>
          ) : null}
          {waLink && entry.status !== "done" && entry.status !== "no_show" ? (
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 items-center rounded-lg border border-box-line bg-white px-4 text-sm hover:bg-tint"
            >
              WhatsApp
            </a>
          ) : null}
          {entry.status === "done" ? <span className="text-muted">-</span> : null}
        </div>
      </td>
    </tr>
  );
}

function FeeInput({
  entryId,
  number,
  value,
  onError,
}: {
  entryId: string;
  number: number;
  value: number | null;
  onError: (message: string | null) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();
  const shown = draft ?? (value === null ? "" : new Intl.NumberFormat("id-ID").format(value));

  function save() {
    if (draft === null) return;
    const next = draft;
    startTransition(async () => {
      const result = await setFeeAction(entryId, next);
      if (result.ok) {
        setDraft(null);
        setSaved(true);
        onError(null);
      } else {
        onError(result.message);
      }
    });
  }

  return (
    <div className="w-44">
      <label htmlFor={`fee-${entryId}`} className="sr-only">
        Masukkan tarif pasien nomor {number}
      </label>
      <div className="flex h-10 items-center rounded-lg border border-staff-line bg-white px-2 focus-within:border-primary">
        <span className="text-sm text-muted">Rp</span>
        <input
          id={`fee-${entryId}`}
          inputMode="numeric"
          autoComplete="off"
          placeholder="Masukkan tarif pasien"
          value={shown}
          disabled={pending}
          onChange={(e) => {
            setSaved(false);
            setDraft(e.target.value);
          }}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
            if (e.key === "Escape") setDraft(null);
          }}
          className="w-full min-w-0 bg-transparent px-1 text-sm outline-none placeholder:text-[11px]"
        />
      </div>
      <p className="mt-1 h-4 text-xs text-muted" aria-live="polite">
        {pending ? "Menyimpan…" : saved && value !== null ? formatRupiah(value) + " tersimpan" : ""}
      </p>
    </div>
  );
}
