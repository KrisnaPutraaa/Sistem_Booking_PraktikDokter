import type { Database } from "@/lib/supabase/database.types";

export type StaffRole = Database["public"]["Enums"]["app_role"];

export const ROLE_LABEL: Record<StaffRole, string> = {
  nurse: "Perawat",
  doctor: "Dokter",
  owner: "Pemilik",
};

/** Pengaturan praktik hanya untuk dokter dan pemilik; perawat hanya mengelola antrean. */
export function canSeeSettings(role: StaffRole): boolean {
  return role === "doctor" || role === "owner";
}

/** Walk-in dicatat oleh semua peran staf (revisi dokter, 4 November 2026). */
export function canAddWalkIn(role: StaffRole): boolean {
  return role === "nurse" || role === "doctor" || role === "owner";
}

/** Tarif pasien diisi dan dilihat oleh semua peran staf, tidak oleh pasien. */
export function canManageFee(role: StaffRole): boolean {
  return role === "nurse" || role === "doctor" || role === "owner";
}
