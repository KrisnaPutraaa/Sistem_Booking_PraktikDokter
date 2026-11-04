import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { StaffRole } from "./roles";
import type { StaffSession } from "./session";

export type StaffAccount = {
  id: string;
  fullName: string;
  role: StaffRole;
  email: string;
  hasMfa: boolean;
  disabled: boolean;
  lastSignInAt: string | null;
};

/**
 * Daftar akun staf untuk pemilik. Profil dibaca dengan sesi pemilik (RLS
 * profiles_select: owner melihat semua); email, faktor MFA, dan waktu masuk
 * terakhir dari Auth admin (service_role) setelah peran diperiksa pemanggil.
 */
export async function listStaffAccounts(owner: StaffSession): Promise<StaffAccount[]> {
  const { data: profiles, error } = await owner.supabase
    .from("profiles")
    .select("id, full_name, role, disabled_at")
    .order("role")
    .order("full_name");
  if (error) throw new Error(`profiles gagal dibaca (${error.code})`);

  const admin = createAdminClient();
  const users = await admin.auth.admin.listUsers({ perPage: 200 });
  if (users.error) throw new Error(`listUsers gagal (${users.error.code ?? "unknown"})`);
  const byId = new Map(users.data.users.map((u) => [u.id, u]));

  // listUsers tidak menyertakan faktor MFA; dibaca per akun (jumlah staf kecil).
  const factors = await Promise.all(
    profiles.map(async (p) => {
      const { data, error: factorError } = await admin.auth.admin.mfa.listFactors({ userId: p.id });
      if (factorError) throw new Error(`listFactors gagal (${factorError.code ?? "unknown"})`);
      return data.factors.some((f) => f.status === "verified");
    }),
  );

  return profiles.map((p, i) => {
    const user = byId.get(p.id);
    return {
      id: p.id,
      fullName: p.full_name,
      role: p.role,
      email: user?.email ?? "",
      hasMfa: factors[i] ?? false,
      disabled: p.disabled_at !== null,
      lastSignInAt: user?.last_sign_in_at ?? null,
    };
  });
}
