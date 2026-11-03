import "server-only";
import { z } from "zod";
import { parseEnv } from "./env";

/**
 * Kunci rahasia: secret (sb_secret_...) atau service_role lama. Hanya di server,
 * tidak pernah berawalan NEXT_PUBLIC. Kunci publishable ditolak karena tertukar.
 */
export function serviceRoleKey(): string {
  const schema = z.object({
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).refine((key) => !key.startsWith("sb_publishable_")),
  });
  return parseEnv(schema, {
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  }).SUPABASE_SERVICE_ROLE_KEY;
}
