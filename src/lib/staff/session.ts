import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createStaffClient } from "@/lib/supabase/server";
import { mfaRequiredFor, type StaffRole } from "./roles";

type StaffClient = Awaited<ReturnType<typeof createStaffClient>>;

export type StaffSession = {
  userId: string;
  email: string;
  fullName: string;
  role: StaffRole;
  /** Faktor TOTP terverifikasi (verifikasi dua langkah sudah dipasang). */
  verifiedFactorIds: string[];
  /** Verifikasi dua langkah wajib untuk akun ini (saklar mfa_wajib dan peran). */
  mfaRequired: boolean;
  supabase: StaffClient;
};

/**
 * - staff: boleh memakai panel.
 * - mfa: kata sandi benar, tetapi sesi belum aal2 padahal diperlukan: akun
 *   sudah memasang faktor, atau saklar mfa_wajib menyala untuk owner/dokter
 *   (bawaan mati). step "enroll" = belum punya faktor, "verify" = sudah punya,
 *   tinggal memasukkan kode.
 * - no_profile: belum diberi peran, atau akun dinonaktifkan pemilik.
 */
export type StaffLookup =
  | { kind: "staff"; staff: StaffSession }
  | { kind: "mfa"; step: "enroll" | "verify"; staff: StaffSession }
  | { kind: "anonymous" }
  | { kind: "no_profile" };

/**
 * Staf yang sedang login, dibaca dengan sesi staf sendiri (RLS profiles_select:
 * profil milik sendiri tetap terbaca pada aal1). Sekali per request. Database
 * memeriksa hal yang sama lewat current_app_role(), jadi ini lapisan tampilan
 * dan pengalihan, bukan satu-satunya penjaga.
 */
export const lookupStaff = cache(async (): Promise<StaffLookup> => {
  const supabase = await createStaffClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { kind: "anonymous" };

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("full_name, role, disabled_at")
    .eq("id", user.id)
    .maybeSingle();
  if (error) throw new Error(`profiles gagal dibaca (${error.code})`);
  if (!profile || profile.disabled_at) return { kind: "no_profile" };

  // getUser di atas sudah memvalidasi token ke server Auth; aal dibaca dari token yang sama.
  const [{ data: aal, error: aalError }, { data: mfaWajib, error: wajibError }] = await Promise.all([
    supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
    supabase.rpc("mfa_wajib"),
  ]);
  if (aalError) throw new Error(`aal gagal dibaca (${aalError.code ?? "unknown"})`);
  if (wajibError) throw new Error(`mfa_wajib gagal dibaca (${wajibError.code})`);

  const verifiedFactorIds = (user.factors ?? [])
    .filter((f) => f.status === "verified" && f.factor_type === "totp")
    .map((f) => f.id);

  const staff: StaffSession = {
    userId: user.id,
    email: user.email ?? "",
    fullName: profile.full_name,
    role: profile.role,
    verifiedFactorIds,
    mfaRequired: mfaRequiredFor(profile.role, mfaWajib === true),
    supabase,
  };

  const needsAal2 = staff.mfaRequired || verifiedFactorIds.length > 0;
  if (needsAal2 && aal.currentLevel !== "aal2") {
    return { kind: "mfa", step: verifiedFactorIds.length > 0 ? "verify" : "enroll", staff };
  }
  return { kind: "staff", staff };
});

/**
 * Untuk halaman /staf/*. Tamu ke halaman masuk; sesi yang belum lolos
 * verifikasi dua langkah (hanya bila akun memasangnya, atau saklar mfa_wajib
 * menyala) ke /staf/mfa; akun tanpa profil atau nonaktif
 * dikeluarkan lewat /staf/keluar supaya cookie sesinya dihapus.
 */
export async function requireStaff(): Promise<StaffSession> {
  const result = await lookupStaff();
  if (result.kind === "anonymous") redirect("/staf/masuk");
  if (result.kind === "no_profile") redirect("/staf/keluar?alasan=peran");
  if (result.kind === "mfa") redirect("/staf/mfa");
  return result.staff;
}

/** Untuk Server Action: tidak mengalihkan, cukup null bila bukan staf yang lolos penuh. */
export async function currentStaff(): Promise<StaffSession | null> {
  const result = await lookupStaff();
  return result.kind === "staff" ? result.staff : null;
}
