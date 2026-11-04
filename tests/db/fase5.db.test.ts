import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { admin, anon, type DbTestContext, setupDbTest, takeQueue, testWhatsapp } from "./helpers";

// Fase 5: koreksi nama, mengembalikan "selesai", rekap per hari, pengaturan.
let ctx: DbTestContext;
let date: string;
let otherDate: string;
let entryId: string;
let secondId: string;

const PERMISSION_DENIED = "42501";
const CHECK_VIOLATION = "23514";

async function take(d: string, name: string, wa: number): Promise<string> {
  const { data, error } = await takeQueue(d, name, testWhatsapp(wa));
  if (error) throw error;
  const row = await admin.from("queue_entries").select("id").eq("public_token", data[0]?.out_token ?? "").single();
  if (row.error) throw row.error;
  return row.data.id;
}

async function entry(id: string) {
  const row = await admin
    .from("queue_entries")
    .select("name, status, called_at, finished_at, call_count")
    .eq("id", id)
    .single();
  if (row.error) throw row.error;
  return row.data;
}

beforeAll(async () => {
  ctx = await setupDbTest(2);
  // setupDbTest mengembalikan tanggal dari yang terjauh; date < otherDate.
  [date, otherDate] = [...ctx.dates].sort() as [string, string];
  entryId = await take(date, "Pasien Salah Ketik", 500);
  secondId = await take(date, "Pasien Kedua", 501);
});

afterAll(async () => {
  await ctx?.teardown();
});

describe("koreksi nama", () => {
  it("perawat ditolak", async () => {
    const { error } = await ctx.staff.nurse.client.from("queue_entries").update({ name: "Nama Baru" }).eq("id", entryId);
    expect(error?.message).toBe("NAME_NOT_ALLOWED");
    expect((await entry(entryId)).name).toBe("Pasien Salah Ketik");
  });

  it("dokter dan owner bisa; spasi di tepi dibuang", async () => {
    for (const [role, name] of [
      ["doctor", "  Pasien Benar  "],
      ["owner", "Pasien Benar Sekali"],
    ] as const) {
      const { error } = await ctx.staff[role].client.from("queue_entries").update({ name }).eq("id", entryId);
      expect(error, role).toBeNull();
      expect((await entry(entryId)).name, role).toBe(name.trim());
    }
  });

  it("tidak boleh bersamaan dengan perubahan status, dan panjang tetap dijaga", async () => {
    const doctor = ctx.staff.doctor.client;
    const both = await doctor.from("queue_entries").update({ name: "Gabung", status: "in_progress" }).eq("id", entryId);
    expect(both.error?.message).toBe("NAME_WITH_OTHER_CHANGE");
    const short = await doctor.from("queue_entries").update({ name: " A " }).eq("id", entryId);
    expect(short.error?.code).toBe(CHECK_VIOLATION);
  });

  it("audit log mencatat name_changed tanpa nama lama atau baru", async () => {
    const { data, error } = await ctx.staff.owner.client
      .from("audit_log")
      .select("actor, old_data, new_data")
      .eq("entry_id", entryId)
      .eq("action", "queue_entries.update")
      .order("id", { ascending: false })
      .limit(2);
    expect(error).toBeNull();
    expect(data?.map((r) => r.actor)).toEqual([ctx.staff.owner.id, ctx.staff.doctor.id]);
    for (const row of data ?? []) {
      expect((row.new_data as Record<string, unknown>).name_changed).toBe(true);
      const text = JSON.stringify(row);
      expect(text).not.toContain("Pasien Benar");
      expect(text).not.toContain("Salah Ketik");
    }
  });
});

describe("mengembalikan status selesai", () => {
  it("perawat ditolak, dokter bisa; finished_at dikosongkan, call_count tetap", async () => {
    const nurse = ctx.staff.nurse.client;
    expect((await nurse.from("queue_entries").update({ status: "in_progress" }).eq("id", secondId)).error).toBeNull();
    expect((await nurse.from("queue_entries").update({ status: "done" }).eq("id", secondId)).error).toBeNull();
    const finished = await entry(secondId);
    expect(finished.status).toBe("done");
    expect(finished.finished_at).not.toBeNull();

    const denied = await nurse.from("queue_entries").update({ status: "in_progress" }).eq("id", secondId);
    expect(denied.error?.message).toBe("REVERT_NOT_ALLOWED");

    const ok = await ctx.staff.doctor.client.from("queue_entries").update({ status: "in_progress" }).eq("id", secondId);
    expect(ok.error).toBeNull();
    const reopened = await entry(secondId);
    expect(reopened).toMatchObject({ status: "in_progress", finished_at: null, call_count: finished.call_count });
    expect(reopened.called_at).toBe(finished.called_at);

    // Diselesaikan lagi untuk uji rekap.
    expect((await nurse.from("queue_entries").update({ status: "done" }).eq("id", secondId)).error).toBeNull();
  });

  it("selesai tidak bisa langsung ke menunggu atau tidak hadir", async () => {
    const doctor = ctx.staff.doctor.client;
    for (const status of ["waiting", "no_show"] as const) {
      const { error } = await doctor.from("queue_entries").update({ status }).eq("id", secondId);
      expect(error?.message, status).toBe("INVALID_STATUS_TRANSITION");
    }
  });
});

describe("rekap per hari", () => {
  beforeAll(async () => {
    const { error } = await ctx.staff.nurse.client.from("queue_entries").update({ fee_rupiah: 150000 }).eq("id", secondId);
    if (error) throw error;
  });

  it("menghitung per tanggal; total tarif hanya untuk dokter dan owner", async () => {
    for (const role of ["nurse", "doctor", "owner"] as const) {
      const { data, error } = await ctx.staff[role].client.rpc("get_daily_recap", { p_from: date, p_to: otherDate });
      expect(error, role).toBeNull();
      expect(data, role).toHaveLength(1);
      const row = data?.[0];
      expect(row, role).toMatchObject({ out_date: date, out_total: 2, out_done: 1, out_no_show: 0, out_open: 1, out_timed: 1 });
      expect(row?.out_total_fee, role).toBe(role === "nurse" ? null : 150000);
    }
  });

  it("menolak rentang terbalik atau lebih dari 92 hari; anon tidak punya akses", async () => {
    const doctor = ctx.staff.doctor.client;
    expect((await doctor.rpc("get_daily_recap", { p_from: otherDate, p_to: date })).error?.message).toBe("RANGE_INVALID");
    expect((await doctor.rpc("get_daily_recap", { p_from: "2026-01-01", p_to: "2026-04-03" })).error?.message).toBe(
      "RANGE_INVALID",
    );
    expect((await doctor.rpc("get_daily_recap", { p_from: "2026-01-01", p_to: "2026-04-02" })).error).toBeNull();
    expect((await anon.rpc("get_daily_recap", { p_from: date, p_to: date })).error?.code).toBe(PERMISSION_DENIED);
  });
});

describe("pengaturan", () => {
  it("perawat tidak bisa mengubah pengaturan atau hari libur", async () => {
    const nurse = ctx.staff.nurse.client;
    const { data, error } = await nurse.from("practice_settings").update({ daily_quota: 5 }).eq("id", 1).select("id");
    expect(error).toBeNull();
    expect(data).toHaveLength(0); // disaring RLS
    const closed = await nurse.from("closed_days").insert({ day: otherDate, reason: "uji" });
    expect(closed.error?.code).toBe(PERMISSION_DENIED);
  });

  it("dokter bisa; perubahan tercatat di audit log dengan actor dokter", async () => {
    const doctor = ctx.staff.doctor.client;
    const { data, error } = await doctor
      .from("practice_settings")
      .update({ max_per_whatsapp: 4, emergency_notice: "Uji pengumuman" })
      .eq("id", 1)
      .select("max_per_whatsapp");
    expect(error).toBeNull();
    expect(data?.[0]?.max_per_whatsapp).toBe(4);

    const audit = await ctx.staff.owner.client
      .from("audit_log")
      .select("actor, new_data")
      .eq("action", "practice_settings.update")
      .order("id", { ascending: false })
      .limit(1)
      .single();
    expect(audit.error).toBeNull();
    expect(audit.data?.actor).toBe(ctx.staff.doctor.id);
    expect((audit.data?.new_data as Record<string, unknown>).max_per_whatsapp).toBe(4);

    const closed = await doctor.from("closed_days").insert({ day: otherDate, reason: "Cuti uji" });
    expect(closed.error).toBeNull();
    const avail = await admin.rpc("get_availability");
    expect(avail.data?.find((d) => d.out_date === otherDate)?.out_status).toBe("holiday");
  });

  it("constraint menolak kuota × durasi yang tidak muat dan urutan jam yang salah", async () => {
    const doctor = ctx.staff.doctor.client;
    const base = { open_time: "18:30", close_time: "23:00", avg_minutes: 15 };
    const cases = [
      { ...base, daily_quota: 19 }, // 285 > 270 menit
      { ...base, daily_quota: 10, registration_open_time: "23:00", cutoff_time: null },
      { ...base, daily_quota: 10, registration_open_time: "21:00", cutoff_time: "20:00" },
      { ...base, daily_quota: 10, cutoff_time: "23:30" },
      { ...base, daily_quota: 10, emergency_notice: "" },
    ];
    for (const patch of cases) {
      const { error } = await doctor.from("practice_settings").update(patch).eq("id", 1);
      expect(error?.code, JSON.stringify(patch)).toBe(CHECK_VIOLATION);
    }
    const ok = await doctor.from("practice_settings").update({ ...base, daily_quota: 18 }).eq("id", 1);
    expect(ok.error).toBeNull();
  });
});
