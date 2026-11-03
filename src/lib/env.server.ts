import "server-only";
import { z } from "zod";
import { parseEnv } from "./env";

/** Kunci rahasia. Hanya di server, tidak pernah berawalan NEXT_PUBLIC. */
export function serviceRoleKey(): string {
  return parseEnv(z.object({ SUPABASE_SERVICE_ROLE_KEY: z.string().min(1) }), {
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  }).SUPABASE_SERVICE_ROLE_KEY;
}
