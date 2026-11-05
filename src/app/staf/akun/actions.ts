"use server";

import { createClient } from "@supabase/supabase-js";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { publicEnv } from "@/lib/env";
import { RATE_LIMITED_MESSAGE, RATE_LIMITS } from "@/lib/rate-limit";
import { allowAttempt } from "@/lib/rate-limit.server";
import { type PasswordField, passwordChangeSchema } from "@/lib/staff/mfa-schemas";
import { issueRecoveryCodes, logStaffEvent, removeAllFactors } from "@/lib/staff/mfa.server";
import { canManageStaff } from "@/lib/staff/roles";
import { STAFF_GENERIC_ERROR } from "@/lib/staff/schemas";
import { currentStaff } from "@/lib/staff/session";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Halaman Akun. Semua aksi memeriksa sesi penuh (aal2 bila akun memasang MFA) di server.
 * Aksi pemilik atas akun lain memakai service_role setelah peran diperiksa, dan
 * dicatat di audit log (mfa.*, account.*) hanya dengan id akun.
 */

const SESSION_EXPIRED = "Sesi berakhir. Masuk ulang, ya.";
const OWNER_ONLY = "Hanya pemilik yang bisa mengelola akun staf.";

export type CodesResult = { ok: true; codes: string[] } | { ok: false; message: string };

/** Buat ulang kode pemulihan sendiri; kode lama langsung tidak berlaku. */
export async function regenerateRecoveryCodesAction(): Promise<CodesResult> {
  const staff = await currentStaff();
  if (!staff) return { ok: false, message: SESSION_EXPIRED };
  if (staff.verifiedFactorIds.length === 0) {
    return { ok: false, message: "Pasang verifikasi dua langkah dulu." };
  }
  const codes = await issueRecoveryCodes(staff.userId);
  if (!codes) return { ok: false, message: STAFF_GENERIC_ERROR };
  await logStaffEvent(staff.userId, "mfa.recovery_regenerated");
  return { ok: true, codes };
}

/** Staf boleh mematikan verifikasi dua langkah miliknya, kecuali saklar mfa_wajib menyala untuk perannya. */
export async function disableOwnMfaAction(): Promise<{ ok: false; message: string }> {
  const staff = await currentStaff();
  if (!staff) return { ok: false, message: SESSION_EXPIRED };
  if (staff.mfaRequired) {
    return { ok: false, message: "Verifikasi dua langkah wajib untuk dokter dan pemilik." };
  }
  const removed = await removeAllFactors(staff.userId);
  if (removed === null) return { ok: false, message: STAFF_GENERIC_ERROR };
  await logStaffEvent(staff.userId, "mfa.disabled_by_self", { factors_removed: removed });
  await staff.supabase.auth.signOut({ scope: "local" });
  redirect("/staf/masuk?info=mfa-mati");
}

export type PasswordState =
  | { status: "idle" }
  | { status: "error"; message?: string; fieldErrors?: Partial<Record<PasswordField, string>> }
  | { status: "ok"; at: number };

/**
 * Ganti kata sandi sendiri. Kata sandi lama diperiksa dengan klien sementara
 * (sesinya langsung dicabut, scope local), lalu sesi lain akun ini dikeluarkan.
 */
export async function changePasswordAction(_prev: PasswordState, formData: FormData): Promise<PasswordState> {
  const staff = await currentStaff();
  if (!staff) return { status: "error", message: SESSION_EXPIRED };

  const parsed = passwordChangeSchema.safeParse({
    current: formData.get("current"),
    next: formData.get("next"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) {
    const fieldErrors: Partial<Record<PasswordField, string>> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as PasswordField | undefined;
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { status: "error", fieldErrors };
  }

  if (!(await allowAttempt(RATE_LIMITS.passwordUser, staff.userId))) {
    return { status: "error", message: RATE_LIMITED_MESSAGE };
  }

  const env = publicEnv();
  const probe = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const check = await probe.auth.signInWithPassword({ email: staff.email, password: parsed.data.current });
  if (check.error) {
    return { status: "error", fieldErrors: { current: "Kata sandi saat ini salah." } };
  }
  await probe.auth.signOut({ scope: "local" });

  const { error } = await staff.supabase.auth.updateUser({ password: parsed.data.next });
  if (error) {
    if (error.code === "weak_password") {
      return {
        status: "error",
        fieldErrors: { next: "Kata sandi ini terlalu lemah atau pernah bocor di internet. Pilih yang lain." },
      };
    }
    if (error.code === "same_password") {
      return { status: "error", fieldErrors: { next: "Kata sandi baru harus berbeda dari yang lama." } };
    }
    console.error("ganti kata sandi gagal", { code: error.code });
    return { status: "error", message: STAFF_GENERIC_ERROR };
  }

  await staff.supabase.auth.signOut({ scope: "others" });
  await logStaffEvent(staff.userId, "account.password_changed");
  return { status: "ok", at: Date.now() };
}

export type OwnerActionResult = { ok: true } | { ok: false; message: string };

const targetSchema = z.uuid();

async function ownerFor(targetId: string) {
  const staff = await currentStaff();
  if (!staff) return { error: SESSION_EXPIRED } as const;
  if (!canManageStaff(staff.role)) return { error: OWNER_ONLY } as const;
  const parsed = targetSchema.safeParse(targetId);
  if (!parsed.success) return { error: STAFF_GENERIC_ERROR } as const;
  if (parsed.data === staff.userId) return { error: "Akun sendiri dikelola dari bagian Akun saya." } as const;

  // Target harus akun staf (punya profil); pemilik melihat semua profil lewat RLS.
  const { data, error } = await staff.supabase.from("profiles").select("id").eq("id", parsed.data).maybeSingle();
  if (error || !data) return { error: "Akun staf tidak ditemukan." } as const;
  return { owner: staff, targetId: parsed.data } as const;
}

/** Reset verifikasi dua langkah staf lain (ponsel hilang tanpa kode pemulihan). */
export async function resetStaffMfaAction(targetId: string): Promise<OwnerActionResult> {
  const ctx = await ownerFor(targetId);
  if ("error" in ctx) return { ok: false, message: ctx.error ?? STAFF_GENERIC_ERROR };

  const removed = await removeAllFactors(ctx.targetId);
  if (removed === null) return { ok: false, message: STAFF_GENERIC_ERROR };
  await logStaffEvent(ctx.owner.userId, "mfa.reset_by_owner", { target: ctx.targetId, factors_removed: removed });
  refresh();
  return { ok: true };
}

/**
 * Nonaktifkan atau aktifkan lagi akun staf. Nonaktif: profiles.disabled_at
 * (database langsung menolak lewat current_app_role) dan larangan masuk di
 * Supabase Auth (token tidak bisa diperbarui). Akun tidak dihapus supaya audit
 * log tetap menunjuk ke orang yang sama; hapus permanen lewat dashboard.
 */
export async function setStaffActiveAction(targetId: string, active: boolean): Promise<OwnerActionResult> {
  const ctx = await ownerFor(targetId);
  if ("error" in ctx) return { ok: false, message: ctx.error ?? STAFF_GENERIC_ERROR };

  const admin = createAdminClient();
  const ban = await admin.auth.admin.updateUserById(ctx.targetId, { ban_duration: active ? "none" : "876000h" });
  if (ban.error) {
    console.error("ubah status akun (auth) gagal", { code: ban.error.code });
    return { ok: false, message: STAFF_GENERIC_ERROR };
  }
  const profile = await admin
    .from("profiles")
    .update({ disabled_at: active ? null : new Date().toISOString() })
    .eq("id", ctx.targetId);
  if (profile.error) {
    console.error("ubah status akun (profil) gagal", { code: profile.error.code });
    return { ok: false, message: STAFF_GENERIC_ERROR };
  }
  await logStaffEvent(ctx.owner.userId, active ? "account.enabled" : "account.disabled", { target: ctx.targetId });
  refresh();
  return { ok: true };
}
