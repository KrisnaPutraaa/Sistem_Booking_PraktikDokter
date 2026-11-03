import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { admin, anon, type DbTestContext, setupDbTest, takeQueue, testWhatsapp } from "./helpers";

// RLS dan hak akses per peran terhadap project dev.
let ctx: DbTestContext;
let date: string;
let entryId: string;

const PERMISSION_DENIED = "42501";

beforeAll(async () => {
  ctx = await setupDbTest(1);
  date = ctx.dates[0] as string;
  const { data, error } = await takeQueue(date, "Pasien Akses", testWhatsapp(200));
  if (error) throw error;
  const entry = await admin.from("queue_entries").select("id").eq("public_token", data[0]?.out_token ?? "").single();
  if (entry.error) throw entry.error;
  entryId = entry.data.id;
});

afterAll(async () => {
  await ctx?.teardown();
});

describe("anon (publik)", () => {
  it("tidak bisa membaca queue_entries, daily_counters, audit_log, atau profiles", async () => {
    for (const table of ["queue_entries", "daily_counters", "audit_log", "profiles"] as const) {
      const { error } = await anon.from(table).select("*").limit(1);
      expect(error?.code, table).toBe(PERMISSION_DENIED);
    }
  });

  it("tidak bisa memanggil fungsi pasien secara langsung", async () => {
    const take = await anon.rpc("take_queue", {
      p_date: date,
      p_name: "Anon",
      p_whatsapp: testWhatsapp(201),
      p_complaint: "",
    });
    expect(take.error?.code).toBe(PERMISSION_DENIED);
    expect((await anon.rpc("get_availability")).error?.code).toBe(PERMISSION_DENIED);
    expect((await anon.rpc("get_my_queue", { p_token: "x" })).error?.code).toBe(PERMISSION_DENIED);
    expect((await anon.rpc("get_now_serving", {})).error?.code).toBe(PERMISSION_DENIED);
    expect((await anon.rpc("get_next_waiting", { p_token: "x" })).error?.code).toBe(PERMISSION_DENIED);
  });

  it("boleh membaca pengaturan dan hari libur, tetapi tidak mengubahnya", async () => {
    expect((await anon.from("practice_settings").select("daily_quota").single()).error).toBeNull();
    expect((await anon.from("closed_days").select("day")).error).toBeNull();
    const update = await anon.from("practice_settings").update({ daily_quota: 1 }).eq("id", 1);
    expect(update.error?.code).toBe(PERMISSION_DENIED);
  });
});

describe("perawat", () => {
  it("melihat antrean dan bisa mengubah status; waktu dan jumlah panggilan diisi database", async () => {
    const nurse = ctx.staff.nurse.client;
    const list = await nurse.from("queue_entries").select("id").eq("queue_date", date);
    expect(list.data?.map((e) => e.id)).toContain(entryId);

    const called = await nurse
      .from("queue_entries")
      .update({ status: "in_progress" })
      .eq("id", entryId)
      .select("status, call_count, called_at")
      .single();
    expect(called.error).toBeNull();
    expect(called.data).toMatchObject({ status: "in_progress", call_count: 1 });
    expect(called.data?.called_at).not.toBeNull();
  });

  it("tidak bisa mengubah kolom name, called_at, atau call_count", async () => {
    const nurse = ctx.staff.nurse.client;
    for (const patch of [{ name: "Ganti Nama" }, { called_at: new Date().toISOString() }, { call_count: 9 }]) {
      const { error } = await nurse.from("queue_entries").update(patch).eq("id", entryId);
      expect(error?.code, Object.keys(patch)[0]).toBe(PERMISSION_DENIED);
    }
    const row = await admin.from("queue_entries").select("name, call_count").eq("id", entryId).single();
    expect(row.data).toEqual({ name: "Pasien Akses", call_count: 1 });
  });

  it("tidak bisa menambah atau menghapus antrean", async () => {
    const nurse = ctx.staff.nurse.client;
    const insert = await nurse.from("queue_entries").insert({
      queue_date: date,
      number: 99,
      name: "Sisipan",
      whatsapp: testWhatsapp(202),
      consent_at: new Date().toISOString(),
    });
    expect(insert.error?.code).toBe(PERMISSION_DENIED);
    expect((await nurse.from("queue_entries").delete().eq("id", entryId)).error?.code).toBe(PERMISSION_DENIED);
  });

  it("tidak bisa mengubah practice_settings", async () => {
    const before = await admin.from("practice_settings").select("daily_quota").single();
    const { data, error } = await ctx.staff.nurse.client
      .from("practice_settings")
      .update({ daily_quota: 1 })
      .eq("id", 1)
      .select();
    expect(error).toBeNull();
    expect(data).toEqual([]); // RLS: tidak ada baris yang boleh diubah
    const after = await admin.from("practice_settings").select("daily_quota").single();
    expect(after.data?.daily_quota).toBe(before.data?.daily_quota);
  });

  it("tidak bisa menambah hari libur, membaca audit log, atau melihat profil staf lain", async () => {
    const nurse = ctx.staff.nurse.client;
    const closed = await nurse.from("closed_days").insert({ day: date, reason: "x" });
    expect(closed.error?.code).toBe(PERMISSION_DENIED);
    expect((await nurse.from("audit_log").select("id")).data).toEqual([]);
    expect((await nurse.from("profiles").select("id")).data?.map((p) => p.id)).toEqual([ctx.staff.nurse.id]);
  });

  it("tidak bisa memanggil take_queue langsung (walk-in lewat Server Action)", async () => {
    const { error } = await ctx.staff.nurse.client.rpc("take_queue", {
      p_date: date,
      p_name: "Walk",
      p_whatsapp: testWhatsapp(203),
      p_complaint: "",
    });
    expect(error?.code).toBe(PERMISSION_DENIED);
  });
});

describe("alur status", () => {
  it("panggil lagi, tidak hadir, sisipkan kembali, lalu selesai", async () => {
    const nurse = ctx.staff.nurse.client;
    const set = (status: "waiting" | "in_progress" | "done" | "no_show") =>
      nurse.from("queue_entries").update({ status }).eq("id", entryId).select("status, call_count, finished_at").single();

    expect((await set("in_progress")).data?.call_count).toBe(2);
    expect((await set("no_show")).data?.status).toBe("no_show");
    expect((await set("waiting")).data?.call_count).toBe(0);
    expect((await set("done")).error?.message).toBe("INVALID_STATUS_TRANSITION");
    await set("in_progress");
    const done = await set("done");
    expect(done.data?.finished_at).not.toBeNull();
    expect((await set("waiting")).error?.message).toBe("INVALID_STATUS_TRANSITION");
  });
});

describe("dokter dan owner", () => {
  it("dokter bisa mengubah pengaturan, tetapi CHECK kuota x durasi tetap berlaku", async () => {
    const doctor = ctx.staff.doctor.client;
    const ok = await doctor.from("practice_settings").update({ daily_quota: 14 }).eq("id", 1).select("daily_quota");
    expect(ok.data).toEqual([{ daily_quota: 14 }]);
    const tooMany = await doctor.from("practice_settings").update({ daily_quota: 200 }).eq("id", 1);
    expect(tooMany.error?.message).toMatch(/quota_fits_hours/);
  });

  it("dokter bisa mengelola hari libur", async () => {
    const doctor = ctx.staff.doctor.client;
    expect((await doctor.from("closed_days").insert({ day: date, reason: "Uji" })).error).toBeNull();
    expect((await doctor.from("closed_days").delete().eq("day", date)).error).toBeNull();
  });

  it("hanya owner yang membaca audit log; isinya mencatat pelaku tanpa data pribadi", async () => {
    expect((await ctx.staff.doctor.client.from("audit_log").select("id")).data).toEqual([]);

    const owner = ctx.staff.owner.client;
    const { data, error } = await owner
      .from("audit_log")
      .select("actor, action, new_data")
      .eq("entry_id", entryId)
      .order("id");
    expect(error).toBeNull();
    expect(data?.[0]).toMatchObject({ action: "queue_entries.insert", actor: null });
    const update = data?.find((row) => row.action === "queue_entries.update");
    expect(update?.actor).toBe(ctx.staff.nurse.id);
    for (const row of data ?? []) {
      for (const field of ["name", "whatsapp", "complaint", "public_token"]) {
        expect(row.new_data).not.toHaveProperty(field);
      }
    }
  });

  it("audit log tidak bisa diubah, bahkan oleh owner atau service_role", async () => {
    const owner = ctx.staff.owner.client;
    expect((await owner.from("audit_log").update({ action: "x" }).eq("entry_id", entryId)).error?.code).toBe(
      PERMISSION_DENIED,
    );
    expect((await admin.from("audit_log").delete().eq("entry_id", entryId)).error?.code).toBe(PERMISSION_DENIED);
  });

  it("owner melihat semua profil staf uji", async () => {
    const { data } = await ctx.staff.owner.client.from("profiles").select("id");
    const ids = data?.map((p) => p.id) ?? [];
    for (const staff of Object.values(ctx.staff)) expect(ids).toContain(staff.id);
  });
});
