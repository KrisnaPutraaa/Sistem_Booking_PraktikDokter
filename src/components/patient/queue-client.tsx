"use client";

import { useRouter } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";
import { readSavedQueues, saveQueue } from "@/lib/patient/saved-queue";
import { todayInAppZone } from "@/lib/time";

const noSubscribe = () => () => {};

/** Catat nomor ini di perangkat pasien supaya bisa dibuka lagi dari Beranda. */
export function RememberQueue({ token, number, date }: { token: string; number: number; date: string }) {
  useEffect(() => {
    saveQueue({ token, number, date }, todayInAppZone());
  }, [token, number, date]);
  return null;
}

/** Sapaan "Terima kasih, Budi." dari nama depan yang tersimpan di perangkat ini saja. */
export function Greeting({ token }: { token: string }) {
  // localStorage tidak ada di server, jadi snapshot server selalu kosong.
  const firstName = useSyncExternalStore(
    noSubscribe,
    () => readSavedQueues().find((q) => q.token === token)?.firstName ?? "",
    () => "",
  );

  return (
    <p className="mt-2 text-center text-base text-muted">
      {firstName ? `Terima kasih, ${firstName}. ` : "Terima kasih. "}
      Nomor antreanmu sudah tercatat.
    </p>
  );
}

/**
 * Muat ulang data server secara berkala (router.refresh), berhenti sementara
 * saat tab tidak terlihat. Data tetap dibaca di server, bukan dari browser.
 */
export function AutoRefresh({ intervalMs }: { intervalMs: number }) {
  const router = useRouter();
  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    const id = window.setInterval(tick, intervalMs);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [router, intervalMs]);
  return null;
}
