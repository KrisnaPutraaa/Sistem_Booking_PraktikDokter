import { randomBytes } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { todayInAppZone } from "@/lib/time";
import { totp } from "./totp";

/**
 * Perlengkapan uji database terhadap project dev. Nilai koneksi datang dari
 * vitest.db.config.mts setelah penjaga lolos. Setiap file uji:
 * - membuat akun staf sementara (kata sandi acak, tidak pernah dicetak);
 * - memakai tanggal yang belum punya data, sehingga pembersihan aman;
 * - mengembalikan practice_settings dan menghapus semua yang dibuatnya.
 * Baris audit_log tetap ada (append-only, tanpa data pribadi).
 */
export type Db = SupabaseClient<Database>;
export type Role = Database["public"]["Enums"]["app_role"];
type Settings = Database["public"]["Tables"]["practice_settings"]["Row"];

const url = requireEnv("TEST_SUPABASE_URL");
const anonKey = requireEnv("TEST_SUPABASE_ANON_KEY");
const serviceRoleKey = requireEnv("TEST_SUPABASE_SERVICE_ROLE_KEY");

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} kosong; jalankan lewat npm run test:db`);
  return value;
}

const noSession = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };

export const admin: Db = createClient<Database>(url, serviceRoleKey, noSession);
export const anon: Db = createClient<Database>(url, anonKey, noSession);

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export const today = todayInAppZone();

export type Staff = { id: string; client: Db };

export type DbTestContext = {
  staff: Record<Role, Staff>;
  /** Tanggal ke depan yang belum punya antrean, counter, atau hari libur. */
  dates: string[];
  /** True bila hari ini belum punya data, sehingga boleh dipakai untuk walk-in. */
  todayIsClean: boolean;
  setSettings: (patch: Database["public"]["Tables"]["practice_settings"]["Update"]) => Promise<void>;
  teardown: () => Promise<void>;
};

async function isClean(date: string): Promise<boolean> {
  const [entries, counters, closed] = await Promise.all([
    admin.from("queue_entries").select("id", { count: "exact", head: true }).eq("queue_date", date),
    admin.from("daily_counters").select("queue_date", { count: "exact", head: true }).eq("queue_date", date),
    admin.from("closed_days").select("day", { count: "exact", head: true }).eq("day", date),
  ]);
  for (const r of [entries, counters, closed]) if (r.error) throw r.error;
  return entries.count === 0 && counters.count === 0 && closed.count === 0;
}

async function createStaff(role: Role): Promise<Staff> {
  const email = `test-db-${role}-${randomBytes(6).toString("hex")}@example.com`;
  const password = randomBytes(24).toString("base64url");
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (created.error) throw created.error;
  const id = created.data.user.id;

  const profile = await admin.from("profiles").insert({ id, full_name: `Uji ${role}`, role });
  if (profile.error) throw profile.error;

  const client = createClient<Database>(url, anonKey, noSession);
  const signedIn = await client.auth.signInWithPassword({ email, password });
  if (signedIn.error) throw signedIn.error;

  // Owner dan dokter uji memasang MFA (sukarela sejak revisi Fase 6), jadi
  // jalur "akun dengan faktor wajib aal2" ikut teruji di semua suite.
  if (role !== "nurse") await upgradeToAal2(client);
  return { id, client };
}

/** Pasang faktor TOTP lalu verifikasi, sehingga sesi klien menjadi aal2. */
export async function upgradeToAal2(client: Db): Promise<{ factorId: string; secret: string }> {
  const enrolled = await client.auth.mfa.enroll({ factorType: "totp", friendlyName: "uji" });
  if (enrolled.error) throw enrolled.error;
  const { id: factorId, totp: t } = enrolled.data;
  const verified = await client.auth.mfa.challengeAndVerify({ factorId, code: totp(t.secret) });
  if (verified.error) throw verified.error;
  return { factorId, secret: t.secret };
}

/** Klien baru yang login dengan email dan kata sandi saja (aal1). */
export async function signInAal1(email: string, password: string): Promise<Db> {
  const client = createClient<Database>(url, anonKey, noSession);
  const signedIn = await client.auth.signInWithPassword({ email, password });
  if (signedIn.error) throw signedIn.error;
  return client;
}

/** Akun uji tambahan (dibersihkan pemanggil dengan admin.auth.admin.deleteUser). */
export async function createTestUser(role: Role) {
  const email = `test-db-${role}-${randomBytes(6).toString("hex")}@example.com`;
  const password = randomBytes(24).toString("base64url");
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (created.error) throw created.error;
  const id = created.data.user.id;
  const profile = await admin.from("profiles").insert({ id, full_name: `Uji ${role}`, role });
  if (profile.error) {
    await admin.auth.admin.deleteUser(id);
    throw profile.error;
  }
  return { id, email, password };
}

export async function setupDbTest(dateCount: number): Promise<DbTestContext> {
  const snapshot = await admin.from("practice_settings").select("*").eq("id", 1).single();
  if (snapshot.error) throw snapshot.error;
  const original: Settings = snapshot.data;

  const dates: string[] = [];
  for (let offset = 14; offset >= 1 && dates.length < dateCount; offset--) {
    const date = addDays(today, offset);
    if (await isClean(date)) dates.push(date);
  }
  if (dates.length < dateCount) throw new Error("Tidak cukup tanggal kosong di project dev untuk uji");
  const todayIsClean = await isClean(today);

  const setSettings: DbTestContext["setSettings"] = async (patch) => {
    const { error } = await admin.from("practice_settings").update(patch).eq("id", 1);
    if (error) throw error;
  };

  // Deterministik: setiap hari buka, tanpa batas jam, jangkauan 14 hari.
  await setSettings({ open_days: [1, 2, 3, 4, 5, 6, 7], cutoff_time: null, days_ahead: 14, walk_in_enabled: true });

  const staffIds: string[] = [];
  const touchedDates = [...dates];
  const staff = {} as Record<Role, Staff>;
  try {
    for (const role of ["owner", "doctor", "nurse"] as const) {
      staff[role] = await createStaff(role);
      staffIds.push(staff[role].id);
    }
  } catch (error) {
    await Promise.all(staffIds.map((id) => admin.auth.admin.deleteUser(id)));
    await restore();
    throw error;
  }

  async function restore() {
    const values: Partial<Settings> = { ...original };
    delete values.id;
    delete values.updated_at;
    await setSettings(values);
  }

  return {
    staff,
    dates,
    todayIsClean,
    setSettings,
    teardown: async () => {
      if (todayIsClean) touchedDates.push(today);
      const errors = (
        await Promise.all([
          admin.from("queue_entries").delete().in("queue_date", touchedDates),
          admin.from("daily_counters").delete().in("queue_date", touchedDates),
          admin.from("closed_days").delete().in("day", touchedDates),
        ])
      ).flatMap((r) => (r.error ? [r.error] : []));
      await Promise.all(Object.values(staff).map((s) => s.client.auth.signOut()));
      await Promise.all(staffIds.map((id) => admin.auth.admin.deleteUser(id)));
      await restore();
      if (errors.length > 0) throw errors[0];
    },
  };
}

/** Nomor WhatsApp uji yang lolos pola ^62[0-9]{8,13}$. */
export function testWhatsapp(i: number): string {
  return `62899${String(i).padStart(8, "0")}`;
}

export function takeQueue(
  date: string,
  name: string,
  whatsapp: string,
  extra: { p_source?: string; p_actor?: string } = {},
) {
  return admin.rpc("take_queue", { p_date: date, p_name: name, p_whatsapp: whatsapp, p_complaint: "", ...extra });
}
