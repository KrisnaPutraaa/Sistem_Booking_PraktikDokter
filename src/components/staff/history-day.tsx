"use client";

import { useState, useTransition } from "react";
import { correctNameAction, updateStatusAction } from "@/app/staf/actions";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/cn";
import { formatRupiah } from "@/lib/format";
import { QUEUE_STATUS_LABEL, QUEUE_STATUSES, type QueueStatus } from "@/lib/queue-status";
import { entryDurationMinutes, formatDuration } from "@/lib/staff/history";
import type { HistoryEntry } from "@/lib/staff/history-data";

const clock = new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Makassar", hour: "2-digit", minute: "2-digit" });
const time = (iso: string | null) => (iso ? clock.format(new Date(iso)) : "–");

/**
 * Daftar pasien satu hari di Riwayat. Dokter dan pemilik bisa mengoreksi nama
 * dan mengembalikan status selesai; peran diperiksa lagi di Server Action dan
 * trigger database.
 */
export function HistoryDay({
  entries,
  showFee,
  canCorrectName,
  canReopen,
}: {
  entries: HistoryEntry[];
  showFee: boolean;
  canCorrectName: boolean;
  canReopen: boolean;
}) {
  const [filter, setFilter] = useState<QueueStatus | "all">("all");
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const shown = filter === "all" ? entries : entries.filter((e) => e.status === filter);

  return (
    <>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <label className="sr-only" htmlFor="history-status-filter">
          Saring status
        </label>
        <select
          id="history-status-filter"
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
        <span className="text-sm text-muted">
          {shown.length} dari {entries.length} pasien
        </span>
      </div>

      {message ? (
        <p
          role={message.tone === "error" ? "alert" : "status"}
          className={cn(
            "mt-4 rounded-xl px-4 py-3 text-sm",
            message.tone === "error" ? "bg-noshow-bg text-noshow-fg" : "bg-done-bg text-done-fg",
          )}
        >
          {message.text}
        </p>
      ) : null}

      {entries.length === 0 ? (
        <p className="mt-6 text-muted">Tidak ada antrean pada tanggal ini.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[760px] text-left">
            <thead>
              <tr className="border-b border-staff-line text-sm tracking-wider text-muted uppercase">
                <th className="py-3 pr-4 font-normal">No</th>
                <th className="py-3 pr-4 font-normal">Pasien</th>
                <th className="py-3 pr-4 font-normal">Status</th>
                <th className="py-3 pr-4 font-normal">Dipanggil</th>
                <th className="py-3 pr-4 font-normal">Selesai</th>
                <th className="py-3 pr-4 font-normal">Durasi</th>
                {showFee ? <th className="py-3 pr-4 font-normal">Tarif</th> : null}
                {canReopen ? <th className="py-3 font-normal">Aksi</th> : null}
              </tr>
            </thead>
            <tbody>
              {shown.map((entry) => (
                <HistoryRow
                  key={entry.id}
                  entry={entry}
                  showFee={showFee}
                  canCorrectName={canCorrectName}
                  canReopen={canReopen}
                  onMessage={setMessage}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function HistoryRow({
  entry,
  showFee,
  canCorrectName,
  canReopen,
  onMessage,
}: {
  entry: HistoryEntry;
  showFee: boolean;
  canCorrectName: boolean;
  canReopen: boolean;
  onMessage: (m: { tone: "ok" | "error"; text: string } | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(entry.name);
  const [pending, startTransition] = useTransition();
  const done = entry.status === "done";

  function saveName() {
    const next = draft.trim();
    if (next === entry.name) {
      setEditing(false);
      return;
    }
    startTransition(async () => {
      const result = await correctNameAction(entry.id, next);
      if (result.ok) {
        setEditing(false);
        onMessage({ tone: "ok", text: `Nama pasien nomor ${entry.number} dikoreksi.` });
      } else {
        onMessage({ tone: "error", text: result.message });
      }
    });
  }

  function reopen() {
    if (!window.confirm(`Kembalikan pasien nomor ${entry.number} ke status diperiksa? Perubahan dicatat di audit log.`)) {
      return;
    }
    startTransition(async () => {
      const result = await updateStatusAction(entry.id, "reopen");
      onMessage(
        result.ok
          ? { tone: "ok", text: `Pasien nomor ${entry.number} dikembalikan ke diperiksa.` }
          : { tone: "error", text: result.message },
      );
    });
  }

  return (
    <tr className={cn("border-b border-line align-top", pending && "opacity-60")}>
      <td className="py-4 pr-4 text-xl font-semibold">{entry.number}</td>
      <td className="py-4 pr-4">
        {editing ? (
          <form
            className="flex flex-wrap items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              saveName();
            }}
          >
            <label htmlFor={`name-${entry.id}`} className="sr-only">
              Nama pasien nomor {entry.number}
            </label>
            <input
              id={`name-${entry.id}`}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={80}
              autoComplete="off"
              autoFocus
              onFocus={(e) => e.currentTarget.select()}
              disabled={pending}
              className="h-10 w-56 rounded-lg border border-staff-line bg-white px-3"
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setDraft(entry.name);
                  setEditing(false);
                }
              }}
            />
            <Button type="submit" size="sm" disabled={pending}>
              Simpan
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => {
                setDraft(entry.name);
                setEditing(false);
              }}
            >
              Batal
            </Button>
          </form>
        ) : (
          <div className="flex flex-wrap items-center gap-x-3">
            <span>{entry.name}</span>
            {canCorrectName ? (
              <button
                type="button"
                onClick={() => {
                  onMessage(null);
                  setDraft(entry.name);
                  setEditing(true);
                }}
                className="text-sm text-accent underline"
              >
                Koreksi nama
              </button>
            ) : null}
          </div>
        )}
        {entry.source === "walk_in" ? <p className="mt-1 text-xs text-accent uppercase">walk-in</p> : null}
      </td>
      <td className="py-4 pr-4">
        <StatusBadge status={entry.status} />
        {entry.callCount > 0 ? <p className="mt-1 text-xs text-muted">dipanggil {entry.callCount}×</p> : null}
      </td>
      <td className="py-4 pr-4">{time(entry.calledAt)}</td>
      <td className="py-4 pr-4">{done ? time(entry.finishedAt) : "–"}</td>
      <td className="py-4 pr-4">
        {done ? formatDuration(entryDurationMinutes(entry.calledAt, entry.finishedAt)) : "–"}
      </td>
      {showFee ? (
        <td className="py-4 pr-4">{entry.feeRupiah === null ? "–" : formatRupiah(entry.feeRupiah)}</td>
      ) : null}
      {canReopen ? (
        <td className="py-4">
          {done ? (
            <Button size="sm" variant="outline" disabled={pending} onClick={reopen}>
              Kembalikan ke diperiksa
            </Button>
          ) : (
            <span className="text-muted">–</span>
          )}
        </td>
      ) : null}
    </tr>
  );
}
