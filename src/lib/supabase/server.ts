import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { publicEnv } from "@/lib/env";

/**
 * Klien untuk sesi staf (Server Component, Server Action, Route Handler).
 * Memakai kunci anon + cookie sesi, sehingga dibatasi RLS sesuai peran.
 * Buat baru di setiap request; jangan dipakai ulang antar-request.
 */
export async function createStaffClient() {
  const cookieStore = await cookies();
  const env = publicEnv();

  return createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Component tidak boleh menulis cookie. Penyegaran sesi
          // ditangani proxy.ts (Fase 4).
        }
      },
    },
  });
}
