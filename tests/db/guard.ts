import { parseEnv as parseDotenv } from "node:util";

/**
 * Penjaga npm run test:db. Uji database menulis dan menghapus data, jadi hanya
 * boleh berjalan terhadap project Supabase dev:
 * - SUPABASE_ALLOW_TEST_DB=1 harus diberikan di perintah, bukan di .env.local;
 * - URL dan kunci diambil dari .env.local dan tidak boleh ditimpa variabel shell;
 * - host URL harus <SUPABASE_DEV_PROJECT_REF>.supabase.co;
 * - bila sudah supabase link, ref yang ter-link harus sama.
 * Pesan galat tidak pernah memuat nilai kunci.
 */
export type DevTestTarget = {
  projectRef: string;
  url: string;
  anonKey: string;
  serviceRoleKey: string;
};

type GuardInput = {
  processEnv: Record<string, string | undefined>;
  envFile: string | null; // isi .env.local
  linkedRef: string | null; // isi supabase/.temp/project-ref
};

const PROJECT_REF = /^[a-z0-9]{20}$/;
const FROM_FILE = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"] as const;

export function assertDevTestTarget({ processEnv, envFile, linkedRef }: GuardInput): DevTestTarget {
  const refuse = (reason: string): never => {
    throw new Error(`test:db ditolak: ${reason}`);
  };

  if (processEnv.SUPABASE_ALLOW_TEST_DB !== "1") {
    refuse("set SUPABASE_ALLOW_TEST_DB=1 di perintah untuk mengizinkan uji terhadap project dev.");
  }
  if (envFile === null) {
    return refuse(".env.local tidak ditemukan.");
  }

  const file = parseDotenv(envFile);
  if ("SUPABASE_ALLOW_TEST_DB" in file) {
    refuse("SUPABASE_ALLOW_TEST_DB tidak boleh disimpan di .env.local; berikan di perintah.");
  }

  const ref = file.SUPABASE_DEV_PROJECT_REF ?? "";
  if (!PROJECT_REF.test(ref)) {
    refuse("SUPABASE_DEV_PROJECT_REF di .env.local kosong atau tidak valid.");
  }

  for (const name of FROM_FILE) {
    if (!file[name]) {
      refuse(`${name} tidak ada di .env.local.`);
    }
    const fromShell = processEnv[name];
    if (fromShell !== undefined && fromShell !== file[name]) {
      refuse(`${name} di shell berbeda dari .env.local. Hapus variabel shell itu.`);
    }
  }

  let host = "";
  let protocol = "";
  try {
    ({ host, protocol } = new URL(file.NEXT_PUBLIC_SUPABASE_URL ?? ""));
  } catch {
    refuse("NEXT_PUBLIC_SUPABASE_URL bukan URL yang valid.");
  }
  if (protocol !== "https:" || host !== `${ref}.supabase.co`) {
    refuse("NEXT_PUBLIC_SUPABASE_URL tidak menunjuk ke project dev (SUPABASE_DEV_PROJECT_REF).");
  }

  if (linkedRef !== null && linkedRef.trim() !== ref) {
    refuse("project yang ter-link (supabase link) bukan project dev.");
  }

  return {
    projectRef: ref,
    url: file.NEXT_PUBLIC_SUPABASE_URL ?? "",
    anonKey: file.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    serviceRoleKey: file.SUPABASE_SERVICE_ROLE_KEY ?? "",
  };
}
