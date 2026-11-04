import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createStaffClient } from "@/lib/supabase/server";
import type { StaffRole } from "./roles";

export type StaffSession = {
  userId: string;
  fullName: string;
  role: StaffRole;
  supabase: Awaited<ReturnType<typeof createStaffClient>>;
};

export type StaffLookup =
  | { kind: "staff"; staff: StaffSession }
  | { kind: "anonymous" }
  | { kind: "no_profile" };

/**
 * Staf yang sedang login, dibaca dengan sesi staf sendiri (RLS profiles_select:
 * hanya profil milik sendiri). Sekali per request.
 */
export const lookupStaff = cache(async (): Promise<StaffLookup> => {
  const supabase = await createStaffClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { kind: "anonymous" };

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .maybeSingle();
  if (error) throw new Error(`profiles gagal dibaca (${error.code})`);
  if (!profile) return { kind: "no_profile" };

  return {
    kind: "staff",
    staff: { userId: user.id, fullName: profile.full_name, role: profile.role, supabase },
  };
});

/**
 * Untuk halaman /staf/*. Tamu ke halaman masuk; akun tanpa profil (belum diberi
 * peran) dikeluarkan lewat /staf/keluar supaya cookie sesinya dihapus.
 */
export async function requireStaff(): Promise<StaffSession> {
  const result = await lookupStaff();
  if (result.kind === "anonymous") redirect("/staf/masuk");
  if (result.kind === "no_profile") redirect("/staf/keluar?alasan=peran");
  return result.staff;
}

/** Untuk Server Action: tidak mengalihkan, cukup null bila bukan staf. */
export async function currentStaff(): Promise<StaffSession | null> {
  const result = await lookupStaff();
  return result.kind === "staff" ? result.staff : null;
}
