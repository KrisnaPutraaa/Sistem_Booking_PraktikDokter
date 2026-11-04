"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Memuat ulang data panel secara berkala (polling). Dilewati saat tab tidak
 * terlihat atau staf sedang mengetik, supaya isian tidak terganggu.
 */
export function AutoRefresh({ intervalMs }: { intervalMs: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      const active = document.activeElement;
      if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) return;
      router.refresh();
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [router, intervalMs]);
  return null;
}
