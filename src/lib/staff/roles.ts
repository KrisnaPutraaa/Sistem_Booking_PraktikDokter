import type { Database } from "@/lib/supabase/database.types";

export type StaffRole = Database["public"]["Enums"]["app_role"];

export const ROLE_LABEL: Record<StaffRole, string> = {
  nurse: "Perawat",
  doctor: "Dokter",
  owner: "Pemilik",
};

/**
 * Verifikasi dua langkah (TOTP) wajib untuk dokter dan pemilik (keputusan
 * Fase 6), opsional untuk perawat. Database menegakkan hal yang sama di
 * current_app_role(): peran ini tanpa sesi aal2 tidak mendapat akses.
 */
export function mfaRequiredFor(role: StaffRole): boolean {
  return role === "doctor" || role === "owner";
}

/** Hapus data pasien atas permintaan dan kelola akun staf: hanya pemilik. */
export function isOwner(role: StaffRole): boolean {
  return role === "owner";
}

export const canErasePatientData = isOwner;
export const canManageStaff = isOwner;

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

/**
 * Hak khusus dokter dan pemilik (keputusan Fase 5): ekspor CSV, total tarif di
 * rekap, koreksi nama pasien, dan mengembalikan status "selesai". Database
 * memeriksa hal yang sama (trigger queue_entries_status_guard, get_daily_recap).
 */
export function isDoctorOrOwner(role: StaffRole): boolean {
  return role === "doctor" || role === "owner";
}

export const canExportCsv = isDoctorOrOwner;
export const canSeeFeeTotals = isDoctorOrOwner;
export const canCorrectName = isDoctorOrOwner;
export const canReopenDone = isDoctorOrOwner;
export const canEditSettings = isDoctorOrOwner;
