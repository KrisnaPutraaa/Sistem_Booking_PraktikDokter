import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { addDays, admin, type DbTestContext, setupDbTest, takeQueue, testWhatsapp, today } from "./helpers";

// take_queue, konkurensi, dan fungsi pasien terhadap project dev.
let ctx: DbTestContext;
let concurrencyDate: string;
let rulesDate: string;
let closedDate: string;

beforeAll(async () => {
  ctx = await setupDbTest(3);
  [concurrencyDate, rulesDate, closedDate] = ctx.dates as [string, string, string];
});

afterAll(async () => {
  await ctx?.teardown();
});

describe("konkurensi take_queue", () => {
  it("20 permintaan bersamaan dengan kuota 5 menghasilkan tepat nomor 1-5 tanpa kembar", async () => {
    await ctx.setSettings({ daily_quota: 5 });
    const results = await Promise.all(
      Array.from({ length: 20 }, (_, i) => takeQueue(concurrencyDate, `Pasien ${i}`, testWhatsapp(i))),
    );

    const numbers = results.flatMap((r) => r.data?.map((row) => row.out_number) ?? []).sort((a, b) => a - b);
    expect(numbers).toEqual([1, 2, 3, 4, 5]);
    const errors = results.flatMap((r) => (r.error ? [r.error.message] : []));
    expect(errors).toHaveLength(15);
    expect(new Set(errors)).toEqual(new Set(["FULL"]));

    const counter = await admin.from("daily_counters").select("last_number").eq("queue_date", concurrencyDate).single();
    expect(counter.data?.last_number).toBe(5);
    const entries = await admin.from("queue_entries").select("number").eq("queue_date", concurrencyDate);
    expect(entries.data?.map((e) => e.number).sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5]);
  });

  it("10 permintaan bersamaan dari satu nomor WhatsApp hanya lolos max_per_whatsapp (3)", async () => {
    await ctx.setSettings({ daily_quota: 15, max_per_whatsapp: 3 });
    const results = await Promise.all(
      Array.from({ length: 10 }, (_, i) => takeQueue(rulesDate, `Keluarga ${i}`, testWhatsapp(100))),
    );

    const numbers = results.flatMap((r) => r.data?.map((row) => row.out_number) ?? []).sort((a, b) => a - b);
    expect(numbers).toEqual([1, 2, 3]);
    const errors = results.flatMap((r) => (r.error ? [r.error.message] : []));
    expect(new Set(errors)).toEqual(new Set(["TOO_MANY_FOR_NUMBER"]));
  });
});

describe("aturan take_queue", () => {
  it("nomor berikut lanjut tanpa celah dan perkiraan jam = buka + (nomor - 1) x durasi", async () => {
    const { data, error } = await takeQueue(rulesDate, "Budi", testWhatsapp(101));
    expect(error).toBeNull();
    const row = data?.[0];
    expect(row?.out_number).toBe(4);
    expect(row?.out_token).toMatch(/^[0-9a-f]{64}$/);

    const settings = await admin.from("practice_settings").select("open_time, avg_minutes").single();
    const [h, m] = (settings.data?.open_time ?? "").split(":").map(Number) as [number, number];
    const minutes = h * 60 + m + 3 * (settings.data?.avg_minutes ?? 0);
    const expected = `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}:00`;
    expect(row?.out_est_time).toBe(expected);
  });

  it("kuota terlampaui ditolak FULL dan counter tidak naik", async () => {
    await ctx.setSettings({ daily_quota: 4 });
    const { error } = await takeQueue(rulesDate, "Sari", testWhatsapp(102));
    expect(error?.message).toBe("FULL");
    const counter = await admin.from("daily_counters").select("last_number").eq("queue_date", rulesDate).single();
    expect(counter.data?.last_number).toBe(4);
    await ctx.setSettings({ daily_quota: 15 });
  });

  it("menolak tanggal di luar jangkauan, hari libur, dan bukan hari praktik", async () => {
    expect((await takeQueue(addDays(today, -1), "Budi", testWhatsapp(103))).error?.message).toBe("DATE_OUT_OF_RANGE");
    expect((await takeQueue(addDays(today, 15), "Budi", testWhatsapp(103))).error?.message).toBe("DATE_OUT_OF_RANGE");

    await admin.from("closed_days").insert({ day: closedDate, reason: "Uji libur" });
    expect((await takeQueue(closedDate, "Budi", testWhatsapp(103))).error?.message).toBe("CLOSED_DAY");
    await admin.from("closed_days").delete().eq("day", closedDate);

    const isodow = ((new Date(`${closedDate}T00:00:00Z`).getUTCDay() + 6) % 7) + 1;
    await ctx.setSettings({ open_days: [1, 2, 3, 4, 5, 6, 7].filter((d) => d !== isodow) });
    expect((await takeQueue(closedDate, "Budi", testWhatsapp(103))).error?.message).toBe("NOT_OPEN_DAY");
    await ctx.setSettings({ open_days: [1, 2, 3, 4, 5, 6, 7] });
  });

  it("pendaftaran online hari ini ditolak setelah cutoff_time", async () => {
    await ctx.setSettings({ cutoff_time: "00:00" });
    expect((await takeQueue(today, "Budi", testWhatsapp(104))).error?.message).toBe("REGISTRATION_CLOSED");
    await ctx.setSettings({ cutoff_time: null });
  });

  it("menolak format WhatsApp yang belum dinormalisasi dan sumber tak dikenal", async () => {
    expect((await takeQueue(rulesDate, "Budi", "081234567890")).error?.message).toMatch(/whatsapp_check/);
    expect((await takeQueue(rulesDate, "Budi", testWhatsapp(105), { p_source: "lain" })).error?.message).toBe(
      "INVALID_SOURCE",
    );
  });

  it("walk-in: butuh staf, hanya hari ini, dan mengikuti sakelar", async () => {
    const nurse = ctx.staff.nurse.id;
    expect((await takeQueue(today, "Walk", testWhatsapp(106), { p_source: "walk_in" })).error?.message).toBe(
      "ACTOR_REQUIRED",
    );
    expect(
      (await takeQueue(rulesDate, "Walk", testWhatsapp(106), { p_source: "walk_in", p_actor: nurse })).error?.message,
    ).toBe("WALK_IN_TODAY_ONLY");

    await ctx.setSettings({ walk_in_enabled: false });
    expect(
      (await takeQueue(today, "Walk", testWhatsapp(106), { p_source: "walk_in", p_actor: nurse })).error?.message,
    ).toBe("WALK_IN_DISABLED");
    await ctx.setSettings({ walk_in_enabled: true });
  });

  it("walk-in tetap boleh setelah cutoff dan tercatat atas nama staf", async (t) => {
    // Walk-in hanya untuk hari ini. Bila hari ini sudah punya data dev, lewati agar tidak tercampur.
    if (!ctx.todayIsClean) t.skip();
    const nurse = ctx.staff.nurse.id;
    await ctx.setSettings({ cutoff_time: "00:00" });
    const { data, error } = await takeQueue(today, "Walk", testWhatsapp(107), { p_source: "walk_in", p_actor: nurse });
    await ctx.setSettings({ cutoff_time: null });
    expect(error).toBeNull();

    const entry = await admin.from("queue_entries").select("id").eq("public_token", data?.[0]?.out_token ?? "").single();
    const audit = await admin
      .from("audit_log")
      .select("actor, new_data")
      .eq("action", "queue_entries.insert")
      .eq("entry_id", entry.data?.id ?? "")
      .single();
    expect(audit.data?.actor).toBe(nurse);
    expect(audit.data?.new_data).not.toHaveProperty("name");
    expect(audit.data?.new_data).not.toHaveProperty("whatsapp");
  });
});

describe("fungsi pasien", () => {
  it("get_my_queue memberi nomor dan posisi tanpa data pribadi; token salah = kosong", async () => {
    const entry = await admin
      .from("queue_entries")
      .select("public_token")
      .eq("queue_date", concurrencyDate)
      .eq("number", 3)
      .single();
    const { data, error } = await admin.rpc("get_my_queue", { p_token: entry.data?.public_token ?? "" });
    expect(error).toBeNull();
    expect(data?.[0]).toMatchObject({ out_number: 3, out_status: "waiting", out_waiting_ahead: 2 });
    expect(Object.keys(data?.[0] ?? {})).not.toContain("name");

    const missing = await admin.rpc("get_my_queue", { p_token: "bukan-token" });
    expect(missing.data).toEqual([]);
  });

  it("get_availability memberi status dan sisa kuota per tanggal", async () => {
    await ctx.setSettings({ daily_quota: 5 });
    await admin.from("closed_days").insert({ day: closedDate, reason: "Uji libur" });
    const { data, error } = await admin.rpc("get_availability");
    await admin.from("closed_days").delete().eq("day", closedDate);
    await ctx.setSettings({ daily_quota: 15 });

    expect(error).toBeNull();
    expect(data).toHaveLength(15); // hari ini + 14 hari
    const byDate = new Map(data?.map((d) => [d.out_date, d]));
    expect(byDate.get(concurrencyDate)).toMatchObject({ out_status: "full", out_remaining: 0 });
    expect(byDate.get(closedDate)).toMatchObject({ out_status: "holiday", out_reason: "Uji libur" });
    expect(byDate.get(rulesDate)).toMatchObject({ out_status: "available", out_remaining: 1 });
  });

  it("get_now_serving hanya mengembalikan nomor yang sedang diperiksa", async () => {
    const nurse = ctx.staff.nurse.client;
    const entry = await admin
      .from("queue_entries")
      .select("id")
      .eq("queue_date", concurrencyDate)
      .eq("number", 2)
      .single();
    await nurse.from("queue_entries").update({ status: "in_progress" }).eq("id", entry.data?.id ?? "");
    const { data } = await admin.rpc("get_now_serving", { p_date: concurrencyDate });
    expect(data).toBe(2);
  });
});

