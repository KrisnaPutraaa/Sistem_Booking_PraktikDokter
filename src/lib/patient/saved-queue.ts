/**
 * Nomor antrean yang tersimpan di localStorage perangkat pasien, supaya pasien
 * bisa kembali ke nomornya. Hanya token, nomor, tanggal, dan nama depan untuk
 * sapaan; tidak pernah WhatsApp atau keluhan. Semua akses dibungkus try/catch
 * karena localStorage bisa tidak tersedia (mode privat, diblokir).
 */
export type SavedQueue = {
  token: string;
  number: number;
  date: string;
  firstName?: string;
};

const KEY = "praktik-tht:antrean";
const MAX_ENTRIES = 10;

function isSavedQueue(value: unknown): value is SavedQueue {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.token === "string" &&
    /^[0-9a-f]{64}$/.test(v.token) &&
    typeof v.number === "number" &&
    typeof v.date === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(v.date) &&
    (v.firstName === undefined || typeof v.firstName === "string")
  );
}

export function readSavedQueues(): SavedQueue[] {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter(isSavedQueue) : [];
  } catch {
    return [];
  }
}

/** Simpan atau perbarui satu nomor. Nomor yang tanggalnya sudah lewat dibuang. */
export function saveQueue(entry: SavedQueue, today: string): void {
  try {
    const existing = readSavedQueues().find((q) => q.token === entry.token);
    const merged = { ...existing, ...entry, firstName: entry.firstName ?? existing?.firstName };
    const rest = readSavedQueues().filter((q) => q.token !== entry.token && q.date >= today);
    window.localStorage.setItem(KEY, JSON.stringify([merged, ...rest].slice(0, MAX_ENTRIES)));
  } catch {
    // Tidak tersimpan; pasien tetap bisa memakai tangkapan layar.
  }
}

/** Nomor terdekat yang tanggalnya hari ini atau nanti. */
export function upcomingQueue(entries: SavedQueue[], today: string): SavedQueue | null {
  const upcoming = entries.filter((q) => q.date >= today);
  upcoming.sort((a, b) => (a.date === b.date ? a.number - b.number : a.date < b.date ? -1 : 1));
  return upcoming[0] ?? null;
}

export function firstNameOf(name: string): string {
  return name.trim().split(/\s+/)[0]?.slice(0, 30) ?? "";
}
