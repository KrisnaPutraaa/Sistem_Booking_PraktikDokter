import "server-only";
import type { Json } from "@/lib/supabase/database.types";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatRecoveryCode, generateRecoveryCodes } from "./recovery-codes";

/**
 * Operasi verifikasi dua langkah yang memerlukan service_role. Pemanggil wajib
 * sudah memeriksa siapa pengguna dan perannya. Log hanya berisi kode galat.
 */

/** Buat kode pemulihan baru (yang lama tidak berlaku). Null bila gagal. */
export async function issueRecoveryCodes(userId: string): Promise<string[] | null> {
  const codes = generateRecoveryCodes();
  const { error } = await createAdminClient().rpc("replace_recovery_codes", { p_user: userId, p_codes: codes });
  if (error) {
    console.error("replace_recovery_codes gagal", { code: error.code });
    return null;
  }
  return codes.map(formatRecoveryCode);
}

export async function recoveryCodesRemaining(userId: string): Promise<number | null> {
  const { data, error } = await createAdminClient().rpc("recovery_codes_remaining", { p_user: userId });
  if (error) {
    console.error("recovery_codes_remaining gagal", { code: error.code });
    return null;
  }
  return data;
}

/**
 * Lepas semua faktor MFA akun ini dan hapus kode pemulihannya. Supabase
 * mengeluarkan semua sesi akun itu bila faktor terverifikasi dihapus.
 * Mengembalikan jumlah faktor yang dihapus, atau null bila ada yang gagal.
 */
export async function removeAllFactors(userId: string): Promise<number | null> {
  const admin = createAdminClient();
  const listed = await admin.auth.admin.mfa.listFactors({ userId });
  if (listed.error) {
    console.error("listFactors gagal", { code: listed.error.code });
    return null;
  }
  let removed = 0;
  for (const factor of listed.data.factors) {
    const { error } = await admin.auth.admin.mfa.deleteFactor({ id: factor.id, userId });
    if (error) {
      console.error("deleteFactor gagal", { code: error.code });
      return null;
    }
    removed++;
  }
  const codes = await admin.rpc("delete_recovery_codes", { p_user: userId });
  if (codes.error) console.error("delete_recovery_codes gagal", { code: codes.error.code });
  return removed;
}

/** Catat kejadian keamanan (mfa.*, account.*) tanpa data pasien. */
export async function logStaffEvent(actor: string, action: string, data?: Record<string, Json>): Promise<void> {
  const { error } = await createAdminClient().rpc("log_staff_event", {
    p_actor: actor,
    p_action: action,
    p_data: data ?? null,
  });
  if (error) console.error("log_staff_event gagal", { action, code: error.code });
}
