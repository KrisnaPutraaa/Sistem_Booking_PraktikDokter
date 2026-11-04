"use server";

import { redirect } from "next/navigation";
import { RATE_LIMITED_MESSAGE, RATE_LIMITS } from "@/lib/rate-limit";
import { allowAttempt } from "@/lib/rate-limit.server";
import { enrollVerifySchema, MFA_WRONG_CODE, recoveryCodeSchema, totpCodeSchema } from "@/lib/staff/mfa-schemas";
import { issueRecoveryCodes, logStaffEvent, removeAllFactors } from "@/lib/staff/mfa.server";
import { normalizeRecoveryCode } from "@/lib/staff/recovery-codes";
import { STAFF_GENERIC_ERROR } from "@/lib/staff/schemas";
import { lookupStaff, type StaffSession } from "@/lib/staff/session";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Verifikasi dua langkah (TOTP Supabase). Semua aksi memeriksa sesi di server,
 * memakai sesi staf sendiri untuk enroll/verify (Supabase menaikkan sesi ke
 * aal2 dan cookie diperbarui), dan service_role hanya untuk kode pemulihan,
 * audit, dan melepas faktor. Kode, rahasia TOTP, dan email tidak dicatat di log.
 */

const SESSION_EXPIRED = "Sesi berakhir. Masuk ulang, ya.";

/** Akun yang login (aal1 atau aal2) dan belum dinonaktifkan. */
async function signedInAccount(): Promise<StaffSession | null> {
  const result = await lookupStaff();
  return result.kind === "staff" || result.kind === "mfa" ? result.staff : null;
}

export type EnrollStart =
  | { ok: true; factorId: string; qrCode: string; secret: string }
  | { ok: false; message: string };

/** Mulai memasang perangkat: hanya bila akun belum punya faktor terverifikasi. */
export async function startEnrollAction(): Promise<EnrollStart> {
  const staff = await signedInAccount();
  if (!staff) return { ok: false, message: SESSION_EXPIRED };
  if (staff.verifiedFactorIds.length > 0) {
    return { ok: false, message: "Verifikasi dua langkah sudah terpasang di akun ini." };
  }

  // Bersihkan percobaan lama yang belum selesai supaya tidak menumpuk.
  const listed = await staff.supabase.auth.mfa.listFactors();
  if (listed.error) {
    console.error("listFactors gagal", { code: listed.error.code });
    return { ok: false, message: STAFF_GENERIC_ERROR };
  }
  for (const factor of listed.data.all) {
    if (factor.status === "unverified") await staff.supabase.auth.mfa.unenroll({ factorId: factor.id });
  }

  const suffix = crypto.getRandomValues(new Uint16Array(1))[0]?.toString(16) ?? "0";
  const { data, error } = await staff.supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: `Authenticator ${suffix}`,
    issuer: "Praktik THT",
  });
  if (error) {
    console.error("mfa enroll gagal", { code: error.code });
    return { ok: false, message: STAFF_GENERIC_ERROR };
  }
  return { ok: true, factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret };
}

export type EnrollVerifyState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "codes"; codes: string[] };

/** Selesaikan pemasangan: kode benar menaikkan sesi ke aal2, lalu kode pemulihan ditampilkan sekali. */
export async function verifyEnrollAction(_prev: EnrollVerifyState, formData: FormData): Promise<EnrollVerifyState> {
  const staff = await signedInAccount();
  if (!staff) return { status: "error", message: SESSION_EXPIRED };

  const parsed = enrollVerifySchema.safeParse({ factorId: formData.get("factorId"), code: formData.get("code") });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? MFA_WRONG_CODE };

  if (!(await allowAttempt(RATE_LIMITS.mfaUser, staff.userId))) {
    return { status: "error", message: RATE_LIMITED_MESSAGE };
  }

  const { error } = await staff.supabase.auth.mfa.challengeAndVerify(parsed.data);
  if (error) {
    if (error.code !== "mfa_verification_failed") console.error("mfa verify (pasang) gagal", { code: error.code });
    return { status: "error", message: error.code === "mfa_verification_failed" ? MFA_WRONG_CODE : STAFF_GENERIC_ERROR };
  }

  await logStaffEvent(staff.userId, "mfa.enrolled", { factor_type: "totp" });
  const codes = await issueRecoveryCodes(staff.userId);
  if (!codes) {
    return {
      status: "error",
      message: "Verifikasi dua langkah aktif, tetapi kode pemulihan gagal dibuat. Buat ulang dari halaman Akun.",
    };
  }
  return { status: "codes", codes };
}

export type VerifyState = { status: "idle" } | { status: "error"; message: string };

/** Login langkah kedua: kode 6 digit dari faktor yang sudah terpasang. */
export async function verifyLoginAction(_prev: VerifyState, formData: FormData): Promise<VerifyState> {
  const staff = await signedInAccount();
  if (!staff) return { status: "error", message: SESSION_EXPIRED };
  const factorId = staff.verifiedFactorIds[0];
  if (!factorId) return { status: "error", message: STAFF_GENERIC_ERROR };

  const parsed = totpCodeSchema.safeParse(formData.get("code"));
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? MFA_WRONG_CODE };

  if (!(await allowAttempt(RATE_LIMITS.mfaUser, staff.userId))) {
    return { status: "error", message: RATE_LIMITED_MESSAGE };
  }

  const { error } = await staff.supabase.auth.mfa.challengeAndVerify({ factorId, code: parsed.data });
  if (error) {
    if (error.code !== "mfa_verification_failed") console.error("mfa verify (masuk) gagal", { code: error.code });
    return { status: "error", message: error.code === "mfa_verification_failed" ? MFA_WRONG_CODE : STAFF_GENERIC_ERROR };
  }
  redirect("/staf");
}

/**
 * Ponsel hilang: kode pemulihan yang benar melepas semua faktor akun ini
 * (Supabase mengeluarkan semua sesinya). Staf masuk lagi dengan kata sandi
 * lalu memasang perangkat baru dan mendapat kode pemulihan baru.
 */
export async function redeemRecoveryCodeAction(_prev: VerifyState, formData: FormData): Promise<VerifyState> {
  const staff = await signedInAccount();
  if (!staff) return { status: "error", message: SESSION_EXPIRED };
  if (staff.verifiedFactorIds.length === 0) return { status: "error", message: STAFF_GENERIC_ERROR };

  const parsed = recoveryCodeSchema.safeParse(formData.get("recoveryCode"));
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? STAFF_GENERIC_ERROR };

  if (!(await allowAttempt(RATE_LIMITS.recoveryUser, staff.userId))) {
    return { status: "error", message: RATE_LIMITED_MESSAGE };
  }

  const { data: matched, error } = await createAdminClient().rpc("consume_recovery_code", {
    p_user: staff.userId,
    p_code: normalizeRecoveryCode(parsed.data),
  });
  if (error) {
    console.error("consume_recovery_code gagal", { code: error.code });
    return { status: "error", message: STAFF_GENERIC_ERROR };
  }
  if (!matched) return { status: "error", message: "Kode pemulihan tidak cocok atau sudah pernah dipakai." };

  const removed = await removeAllFactors(staff.userId);
  if (removed === null) return { status: "error", message: STAFF_GENERIC_ERROR };
  await logStaffEvent(staff.userId, "mfa.recovery_used", { factors_removed: removed });

  // Sesi sudah dicabut Supabase; ini hanya membersihkan cookie.
  await staff.supabase.auth.signOut({ scope: "local" });
  redirect("/staf/masuk?info=pemulihan");
}
