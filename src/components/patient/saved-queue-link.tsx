"use client";

import { useSyncExternalStore } from "react";
import { readSavedQueues, upcomingQueue } from "@/lib/patient/saved-queue";
import { todayInAppZone } from "@/lib/time";
import { LinkButton } from "./page-shell";

const subscribe = (onChange: () => void) => {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
};

// Snapshot berupa string agar perbandingan antar-render stabil.
function snapshot(): string {
  return upcomingQueue(readSavedQueues(), todayInAppZone())?.token ?? "";
}

/** Tombol "Kembali ke nomor saya" bila perangkat ini menyimpan nomor hari ini atau nanti. */
export function SavedQueueLink() {
  const token = useSyncExternalStore(subscribe, snapshot, () => "");
  if (!token) return null;
  return (
    <div className="mt-3">
      <LinkButton href={`/antrean/${token}`} variant="outline">
        Kembali ke nomor saya
      </LinkButton>
    </div>
  );
}
