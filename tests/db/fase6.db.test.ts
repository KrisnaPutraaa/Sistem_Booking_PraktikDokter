import { randomBytes } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  admin,
  anon,
  createTestUser,
  type DbTestContext,
  type Role,
  setupDbTest,
  signInAal1,
  takeQueue,
  testWhatsapp,
  upgradeToAal2,
} from "./helpers";

// Fase 6 (revisi: MFA opsional, saklar mfa_wajib bawaan mati), akun nonaktif, batas percobaan, kode
// pemulihan, anonimkan data pasien (atas permintaan dan otomatis).
let ctx: DbTestContext;
let date: string;
const extraUsers: string[] = [];
const pastDates: string[] = [];

const PERMISSION_DENIED = "42501";
const CHECK_VIOLATION = "23514";

async function extraUser(role: Role) {
  const user = await createTestUser(role);
  extraUsers.push(user.id);
  return user;
}

async function take(d: string, name: string, wa: number) {
  const { data, error } = await takeQueue(d, name, testWhatsapp(wa));
  if (error) throw error;
  const token = data[0]?.out_token ?? "";
  const row = await admin.from("queue_entries").select("id").eq("public_token", token).single();
  if (row.error) throw row.error;
  return { id: row.data.id, token };
}

beforeAll(async () => {
  ctx = await setupDbTest(1);
  [date] = ctx.dates as [string];
});

afterAll(async () => {
  if (pastDates.length > 0) await admin.from("queue_entries").delete().in("queue_date", pastDates);
  await Promise.all(extraUsers.map((id) => admin.auth.admin.deleteUser(id)));
  await ctx?.teardown();
});

describe("verifikasi dua langkah di level database", () => {
  beforeAll(async () => {
    await take(date, "Pasien Aal", 600);
  });

  it("saklar mfa_wajib bawaan mati dan tidak terbuka untuk anon", async () => {
    const asStaff = await ctx.staff.nurse.client.rpc("mfa_wajib");
    expect(asStaff.error).toBeNull();
    expect(asStaff.data).toBe(false);

    const asAnon = await anon.rpc("mfa_wajib");
    expect(asAnon.error?.code).toBe(PERMISSION_DENIED);
  });

  it("owner dan dokter tanpa MFA cukup kata sandi (aal1): melihat antrean dan bisa mengubah pengaturan", async () => {
    const current = await admin.from("practice_settings").select("max_calls").eq("id", 1).single();
    if (current.error) throw current.error;

    for (const role of ["owner", "doctor"] as const) {
      const user = await extraUser(role);
      const client = await signInAal1(user.email, user.password);

      const rows = await client.from("queue_entries").select("id").eq("queue_date", date);
      expect(rows.error, role).toBeNull();
      expect(rows.data?.length, role).toBe(1);

      const upd = await client
        .from("practice_settings")
        .update({ max_calls: current.data.max_calls })
        .eq("id", 1)
        .select("id");
      expect(upd.data?.length, role).toBe(1);
      await client.auth.signOut({ scope: "local" });
    }
  });

  it("owner atau dokter yang memasang MFA wajib aal2", async () => {
    const user = await extraUser("doctor");
    const first = await signInAal1(user.email, user.password);
    await upgradeToAal2(first);
    const second = await signInAal1(user.email, user.password);
    expect((await second.from("queue_entries").select("id").eq("queue_date", date)).data).toEqual([]);
    await Promise.all([first.auth.signOut({ scope: "local" }), second.auth.signOut({ scope: "local" })]);
  });

  it("owner dan dokter aal2 melihat antrean", async () => {
    for (const role of ["owner", "doctor"] as const) {
      const rows = await ctx.staff[role].client.from("queue_entries").select("id").eq("queue_date", date);
      expect(rows.data?.length, role).toBe(1);
    }
  });

  it("perawat tanpa faktor cukup aal1; perawat yang memasang faktor wajib aal2", async () => {
    const rows = await ctx.staff.nurse.client.from("queue_entries").select("id").eq("queue_date", date);
    expect(rows.data?.length).toBe(1);

    const user = await extraUser("nurse");
    const first = await signInAal1(user.email, user.password);
    await upgradeToAal2(first);
    expect((await first.from("queue_entries").select("id").eq("queue_date", date)).data?.length).toBe(1);

    const second = await signInAal1(user.email, user.password);
    expect((await second.from("queue_entries").select("id").eq("queue_date", date)).data).toEqual([]);
    await Promise.all([first.auth.signOut({ scope: "local" }), second.auth.signOut({ scope: "local" })]);
  });

  it("akun yang dinonaktifkan langsung kehilangan akses, walau token masih berlaku", async () => {
    const user = await extraUser("nurse");
    const client = await signInAal1(user.email, user.password);
    expect((await client.from("queue_entries").select("id").eq("queue_date", date)).data?.length).toBe(1);

    const off = await admin.from("profiles").update({ disabled_at: new Date().toISOString() }).eq("id", user.id);
    expect(off.error).toBeNull();
    expect((await client.from("queue_entries").select("id").eq("queue_date", date)).data).toEqual([]);
    await client.auth.signOut({ scope: "local" });
  });
});

describe("batas percobaan", () => {
  it("menghitung per bucket dan kunci, lalu menolak setelah batas", async () => {
    const key = `uji-${randomBytes(8).toString("hex")}`;
    const results: boolean[] = [];
    for (let i = 0; i < 4; i++) {
      const { data, error } = await admin.rpc("hit_rate_limit", {
        p_bucket: "uji_db",
        p_key: key,
        p_max: 3,
        p_window_seconds: 600,
      });
      expect(error).toBeNull();
      results.push(data === true);
    }
    expect(results).toEqual([true, true, true, false]);

    const other = await admin.rpc("hit_rate_limit", { p_bucket: "uji_db", p_key: `${key}-lain`, p_max: 3, p_window_seconds: 600 });
    expect(other.data).toBe(true);
  });

  it("menolak masukan tidak valid", async () => {
    const { error } = await admin.rpc("hit_rate_limit", { p_bucket: "Bukan Valid!", p_key: "x", p_max: 3, p_window_seconds: 600 });
    expect(error?.message).toBe("RATE_LIMIT_INVALID");
  });

  it("anon dan staf tidak bisa memanggilnya", async () => {
    for (const client of [anon, ctx.staff.owner.client]) {
      const { error } = await client.rpc("hit_rate_limit", { p_bucket: "uji_db", p_key: "x", p_max: 3, p_window_seconds: 600 });
      expect(error?.code).toBe(PERMISSION_DENIED);
    }
  });

  it("schema private tidak terbuka lewat API", async () => {
    const { error } = await admin.schema("private" as "public").from("rate_limit_hits" as "profiles").select("*");
    expect(error).not.toBeNull();
  });
});

describe("kode pemulihan", () => {
  it("sekali pakai, tidak peka huruf besar dan tanda hubung", async () => {
    const user = await extraUser("doctor");
    const codes = ["ABCDE12345", "ZZZZZ99999"];
    const set = await admin.rpc("replace_recovery_codes", { p_user: user.id, p_codes: codes });
    expect(set.data).toBe(2);

    const wrong = await admin.rpc("consume_recovery_code", { p_user: user.id, p_code: "AAAAA00000" });
    expect(wrong.data).toBe(false);
    const ok = await admin.rpc("consume_recovery_code", { p_user: user.id, p_code: "abcde-12345" });
    expect(ok.data).toBe(true);
    const again = await admin.rpc("consume_recovery_code", { p_user: user.id, p_code: "ABCDE12345" });
    expect(again.data).toBe(false);

    expect((await admin.rpc("recovery_codes_remaining", { p_user: user.id })).data).toBe(1);

    const replaced = await admin.rpc("replace_recovery_codes", { p_user: user.id, p_codes: ["QQQQQ11111"] });
    expect(replaced.data).toBe(1);
    expect((await admin.rpc("consume_recovery_code", { p_user: user.id, p_code: "ZZZZZ99999" })).data).toBe(false);
  });

  it("format kode dijaga dan hanya service_role yang bisa memanggil", async () => {
    const bad = await admin.rpc("replace_recovery_codes", { p_user: ctx.staff.owner.id, p_codes: ["pendek"] });
    expect(bad.error?.message).toBe("RECOVERY_CODES_INVALID");

    const denied = await ctx.staff.owner.client.rpc("consume_recovery_code", { p_user: ctx.staff.owner.id, p_code: "X" });
    expect(denied.error?.code).toBe(PERMISSION_DENIED);
  });

  it("audit kejadian keamanan hanya menerima aksi mfa.* dan account.*", async () => {
    const ok = await admin.rpc("log_staff_event", { p_actor: ctx.staff.owner.id, p_action: "mfa.uji_db", p_data: { target: ctx.staff.doctor.id } });
    expect(ok.error).toBeNull();
    const bad = await admin.rpc("log_staff_event", { p_actor: ctx.staff.owner.id, p_action: "queue_entries.update" });
    expect(bad.error?.message).toBe("AUDIT_ACTION_INVALID");
  });
});

describe("hapus data pasien atas permintaan", () => {
  let done: { id: string; token: string };
  let waiting: { id: string; token: string };

  beforeAll(async () => {
    done = await take(date, "Pasien Minta Hapus", 610);
    waiting = await take(date, "Pasien Masih Menunggu", 611);
    const owner = ctx.staff.owner.client;
    for (const status of ["in_progress", "done"] as const) {
      const { error } = await owner.from("queue_entries").update({ status }).eq("id", done.id);
      if (error) throw error;
    }
  });

  it("dokter dan perawat ditolak", async () => {
    for (const role of ["doctor", "nurse"] as const) {
      const { error } = await ctx.staff[role].client.rpc("erase_queue_entries", { p_ids: [done.id] });
      expect(error?.message, role).toBe("ERASE_NOT_ALLOWED");
    }
  });

  it("antrean yang masih menunggu ditolak", async () => {
    const { error } = await ctx.staff.owner.client.rpc("erase_queue_entries", { p_ids: [done.id, waiting.id] });
    expect(error?.message).toBe("ERASE_ACTIVE_ENTRY");
  });

  it("owner menganonimkan: nama, WhatsApp, keluhan hilang, token lama mati", async () => {
    const { data, error } = await ctx.staff.owner.client.rpc("erase_queue_entries", { p_ids: [done.id] });
    expect(error).toBeNull();
    expect(data).toBe(1);

    const row = await admin
      .from("queue_entries")
      .select("name, whatsapp, complaint, public_token, anonymized_at, status, number")
      .eq("id", done.id)
      .single();
    expect(row.data).toMatchObject({ name: "Data dihapus", whatsapp: null, complaint: null, status: "done" });
    expect(row.data?.anonymized_at).not.toBeNull();
    expect(row.data?.public_token).not.toBe(done.token);

    const mine = await admin.rpc("get_my_queue", { p_token: done.token });
    expect(mine.data).toEqual([]);

    // Diulang tidak menghitung dua kali.
    const again = await ctx.staff.owner.client.rpc("erase_queue_entries", { p_ids: [done.id] });
    expect(again.data).toBe(0);
  });

  it("audit tidak memuat data pribadi", async () => {
    const audit = await ctx.staff.owner.client
      .from("audit_log")
      .select("action, old_data, new_data")
      .eq("entry_id", done.id);
    expect(audit.error).toBeNull();
    const text = JSON.stringify(audit.data);
    expect(text).not.toContain("Pasien Minta Hapus");
    expect(text).not.toContain(testWhatsapp(610));

    const summary = await ctx.staff.owner.client
      .from("audit_log")
      .select("actor, new_data")
      .eq("action", "privacy.erase_on_request")
      .eq("actor", ctx.staff.owner.id);
    expect(summary.data?.length).toBeGreaterThan(0);
  });

  it("tidak bisa dibatalkan atau disunting lagi", async () => {
    const owner = ctx.staff.owner.client;
    const rename = await owner.from("queue_entries").update({ name: "Nama Lagi" }).eq("id", done.id);
    expect(rename.error?.message).toBe("ANONYMIZED");

    const direct = await owner.from("queue_entries").update({ anonymized_at: null } as never).eq("id", done.id);
    expect(direct.error?.code).toBe(PERMISSION_DENIED);

    const viaAdmin = await admin.from("queue_entries").update({ anonymized_at: null }).eq("id", done.id);
    expect(viaAdmin.error?.message).toBe("ANONYMIZE_IRREVERSIBLE");
  });
});

describe("anonimkan otomatis", () => {
  it("mati secara bawaan, lalu hanya menyentuh antrean yang lebih tua dari N bulan", async () => {
    await ctx.setSettings({ anonymize_after_months: null });
    expect((await admin.rpc("anonymize_expired")).data).toBe(0);

    const old = "2001-02-03";
    pastDates.push(old);
    const inserted = await admin
      .from("queue_entries")
      .insert({
        queue_date: old,
        number: 1,
        name: "Pasien Lama Sekali",
        whatsapp: testWhatsapp(620),
        status: "done",
        consent_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    expect(inserted.error).toBeNull();
    const fresh = await take(date, "Pasien Baru", 621);

    await ctx.setSettings({ anonymize_after_months: 120 });
    const run = await admin.rpc("anonymize_expired");
    expect(run.error).toBeNull();
    expect(run.data).toBeGreaterThanOrEqual(1);

    const oldRow = await admin.from("queue_entries").select("name, whatsapp").eq("id", inserted.data?.id ?? "").single();
    expect(oldRow.data).toEqual({ name: "Data dihapus", whatsapp: null });
    const freshRow = await admin.from("queue_entries").select("anonymized_at").eq("id", fresh.id).single();
    expect(freshRow.data?.anonymized_at).toBeNull();

    await ctx.setSettings({ anonymize_after_months: null });
  });

  it("rentang pengaturan dan format WhatsApp praktik dijaga", async () => {
    const months = await admin.from("practice_settings").update({ anonymize_after_months: 0 }).eq("id", 1);
    expect(months.error?.code).toBe(CHECK_VIOLATION);
    const wa = await admin.from("practice_settings").update({ whatsapp: "0812-abc" }).eq("id", 1);
    expect(wa.error?.code).toBe(CHECK_VIOLATION);
  });

  it("hanya service_role yang bisa menjalankannya", async () => {
    const { error } = await ctx.staff.owner.client.rpc("anonymize_expired");
    expect(error?.code).toBe(PERMISSION_DENIED);
  });
});
