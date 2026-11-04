"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

/**
 * Kode pemulihan, ditampilkan sekali. Tidak disimpan di browser; setelah
 * halaman ditutup kode tidak bisa dilihat lagi (hanya dibuat ulang).
 */
export function RecoveryCodesPanel({ codes, onDone, doneLabel }: { codes: string[]; onDone: () => void; doneLabel: string }) {
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(codes.join("\n"));
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div>
      <h2 className="text-xl font-semibold">Simpan kode pemulihan</h2>
      <p className="mt-2 text-sm text-muted">
        Pakai salah satu kode ini bila ponsel hilang atau diganti. Setiap kode hanya bisa dipakai sekali. Simpan di
        tempat aman (pengelola kata sandi, atau dicetak dan disimpan terkunci). Kode tidak akan ditampilkan lagi.
      </p>
      <ol className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-staff-bg p-4 font-mono text-base tracking-wide">
        {codes.map((code) => (
          <li key={code}>{code}</li>
        ))}
      </ol>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Button size="sm" variant="soft" onClick={copy}>
          Salin semua kode
        </Button>
        {copied ? (
          <span role="status" className="text-sm text-accent">
            Tersalin.
          </span>
        ) : null}
      </div>
      <label className="mt-5 flex items-start gap-3 text-sm">
        <input
          type="checkbox"
          checked={saved}
          onChange={(e) => setSaved(e.target.checked)}
          className="mt-0.5 size-4 accent-primary"
        />
        <span>Saya sudah menyimpan kode pemulihan di tempat aman.</span>
      </label>
      <Button className="mt-5 font-semibold" disabled={!saved} onClick={onDone}>
        {doneLabel}
      </Button>
    </div>
  );
}
