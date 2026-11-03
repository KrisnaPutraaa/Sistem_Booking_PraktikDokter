import "server-only";
import { createClient } from "@supabase/supabase-js";
import { publicEnv } from "@/lib/env";
import { serviceRoleKey } from "@/lib/env.server";

/**
 * Klien service_role, melewati RLS. Hanya untuk Server Action pasien yang
 * memanggil fungsi database (take_queue dkk.) setelah Turnstile terverifikasi,
 * dan untuk aksi staf setelah peran diperiksa di server.
 */
export function createAdminClient() {
  return createClient(publicEnv().NEXT_PUBLIC_SUPABASE_URL, serviceRoleKey(), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
