"use client";

import { useActionState, useState, useTransition } from "react";
import { type ErasableEntry, eraseEntriesAction, searchPatientAction, type SearchState } from "@/app/staf/hapus-data/actions";
import { Button } from "@/components/ui/button";
import { formatLongDate } from "@/lib/format";
import { QUEUE_STATUS_LABEL } from "@/lib/queue-status";
import { useClearOnHide } from "@/lib/use-clear-on-hide";
import { formatWhatsappDisplay } from "@/lib/whatsapp";
import { StaffCard } from "./card";
import { FieldError, StaffInput } from "./field";

const isActive = (e: ErasableEntry) => e.status === "waiting" || e.status === "in_progress";

export function EraseDataCard() {
  // Hasil pencarian (nama pasien) disimpan di state sendiri dan dibuang saat
  // halaman ditinggalkan, supaya tidak dipulihkan dari cache halaman Next.
  const [results, setResults] = useState<Extract<SearchState, { status: "ok" }> | null>(null);
  useClearOnHide(() => setResults(null));
  const [state, action, pending] = useActionState<SearchState, FormData>(
    async (prev, formData) => {
      const result = await searchPatientAction(prev, formData);
      setResults(result.status === "ok" ? result : null);
      return result.status === "ok" ? { status: "idle" } : result;
    },
    { status: "idle" },
  );

  return (
    <StaffCard className="min-w-0">
      <h1 className="text-2xl font-semibold sm:text-[28px]">Hapus data pasien atas permintaan</h1>
      <p className="mt-2 text-sm text-muted">
        Hanya pemilik. Cari dengan nomor WhatsApp yang dipakai pasien saat mendaftar, periksa daftar antreannya
        bersama pasien, lalu hapus.
      </p>

      <form action={action} noValidate className="mt-6 flex flex-wrap items-start gap-3">
        <div className="min-w-[240px] flex-1">
          <label htmlFor="erase-wa" className="block font-semibold">
            Nomor WhatsApp pasien
          </label>
          <StaffInput
            id="erase-wa"
            name="whatsapp"
            inputMode="tel"
            autoComplete="off"
            placeholder="0812 3456 7890"
            aria-invalid={state.status === "error" ? true : undefined}
            aria-describedby={state.status === "error" ? "erase-wa-error" : undefined}
            className="mt-2"
          />
          <FieldError id="erase-wa-error" message={state.status === "error" ? state.message : undefined} />
        </div>
        <Button type="submit" size="sm" className="mt-8" disabled={pending}>
          {pending ? "Mencari…" : "Cari"}
        </Button>
      </form>

      {results ? <Results key={results.at} whatsapp={results.whatsappDisplay} entries={results.entries} /> : null}
    </StaffCard>
  );
}

function Results({ whatsapp, entries }: { whatsapp: string; entries: ErasableEntry[] }) {
  const erasable = entries.filter((e) => !e.anonymized && !isActive(e));
  const [selected, setSelected] = useState<Set<string>>(() => new Set(erasable.map((e) => e.id)));
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [erased, setErased] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();

  if (entries.length === 0) {
    return <p className="mt-6">Tidak ada antrean dengan nomor {formatWhatsappDisplay(whatsapp)}.</p>;
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function erase() {
    const ids = [...selected];
    startTransition(async () => {
      const result = await eraseEntriesAction(ids);
      setConfirming(false);
      if (result.ok) {
        setErased((prev) => new Set([...prev, ...ids]));
        setSelected(new Set());
        setMessage({ ok: true, text: `${result.count} antrean sudah dianonimkan dan dicatat di audit log.` });
      } else {
        setMessage({ ok: false, text: result.message });
      }
    });
  }

  return (
    <div className="mt-6">
      <p className="font-semibold">
        {entries.length} antrean untuk {formatWhatsappDisplay(whatsapp)}
      </p>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead className="border-b border-staff-line text-muted">
            <tr>
              <th className="w-10 py-2 font-normal">
                <span className="sr-only">Pilih</span>
              </th>
              <th className="py-2 pr-4 font-normal">Tanggal</th>
              <th className="py-2 pr-4 font-normal">No.</th>
              <th className="py-2 pr-4 font-normal">Nama</th>
              <th className="py-2 font-normal">Status</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => {
              const gone = e.anonymized || erased.has(e.id);
              const disabled = gone || isActive(e);
              return (
                <tr key={e.id} className="border-b border-staff-line">
                  <td className="py-2">
                    <input
                      type="checkbox"
                      aria-label={`Pilih antrean ${formatLongDate(e.date)} nomor ${e.number}`}
                      checked={!disabled && selected.has(e.id)}
                      disabled={disabled}
                      onChange={() => toggle(e.id)}
                      className="size-4 accent-primary"
                    />
                  </td>
                  <td className="py-2 pr-4 whitespace-nowrap">{formatLongDate(e.date)}</td>
                  <td className="py-2 pr-4">{e.number}</td>
                  <td className="py-2 pr-4">{gone ? <span className="text-muted">Data dihapus</span> : e.name}</td>
                  <td className="py-2">
                    {QUEUE_STATUS_LABEL[e.status]}
                    {isActive(e) && !gone ? <span className="text-muted"> · selesaikan dulu</span> : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {message ? (
        <p
          role={message.ok ? "status" : "alert"}
          className={`mt-4 rounded-xl px-4 py-3 text-sm ${message.ok ? "bg-tint" : "bg-noshow-bg text-noshow-fg"}`}
        >
          {message.text}
        </p>
      ) : null}

      {selected.size > 0 ? (
        confirming ? (
          <div className="mt-5 rounded-xl border border-noshow-fg p-4">
            <p>
              Hapus nama, nomor WhatsApp, dan keluhan dari {selected.size} antrean terpilih? Tindakan ini tidak bisa
              dibatalkan. Nomor antrean, tanggal, status, dan jam tetap disimpan untuk rekap tanpa identitas.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button size="sm" onClick={erase} disabled={pending}>
                {pending ? "Menghapus…" : "Ya, hapus data"}
              </Button>
              <Button size="sm" variant="soft" onClick={() => setConfirming(false)} disabled={pending}>
                Batal
              </Button>
            </div>
          </div>
        ) : (
          <Button size="sm" variant="outline" className="mt-5" onClick={() => setConfirming(true)}>
            Hapus data {selected.size} antrean terpilih
          </Button>
        )
      ) : null}
    </div>
  );
}
