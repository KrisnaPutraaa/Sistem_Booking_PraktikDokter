import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { timeInAppZone } from "@/lib/time";
import { admin, anon, type DbTestContext, setupDbTest, takeQueue, testWhatsapp, today } from "./helpers";

// Fase 4: tarif per pasien dan jendela pendaftaran (revisi dokter).
let ctx: DbTestContext;
let date: string;
let entryId: string;
let token: string;

const PERMISSION_DENIED = "42501";
const CHECK_VIOLATION = "23514";

beforeAll(async () => {
  ctx = await setupDbTest(1);
  date = ctx.dates[0] as string;
  const { data, error } = await takeQueue(date, "Pasien Tarif", testWhatsapp(400));
  if (error) throw error;
  token = data[0]?.out_token ?? "";
  const entry = await admin.from("queue_entries").select("id").eq("public_token", token).single();
  if (entry.error) throw entry.error;
  entryId = entry.data.id;
});

afterAll(async () => {
  await ctx?.teardown();
});

async function feeOf(id: string) {
  const row = await admin.from("queue_entries").select("fee_rupiah, call_count, status").eq("id", id).single();
  if (row.error) throw row.error;
  return row.data;
}

describe("tarif pasien", () => {
  it("perawat, dokter, dan owner bisa mengisi dan melihat tarif", async () => {
    for (const [role, fee] of [
      ["nurse", 150000],
      ["doctor", 175000],
      ["owner", 200000],
    ] as const) {
      const client = ctx.staff[role].client;
      const { data, error } = await client
        .from("queue_entries")
        .update({ fee_rupiah: fee })
        .eq("id", entryId)
        .select("fee_rupiah")
        .single();
      expect(error, role).toBeNull();
      expect(data?.fee_rupiah, role).toBe(fee);
    }
  });

  it("anon tidak bisa membaca tarif, dan fungsi pasien tidak mengembalikannya", async () => {
    const { error } = await anon.from("queue_entries").select("fee_rupiah").limit(1);
    expect(error?.code).toBe(PERMISSION_DENIED);

    const mine = await admin.rpc("get_my_queue", { p_token: token });
    expect(mine.error).toBeNull();
    const next = await admin.rpc("get_next_waiting", { p_token: token, p_limit: 3 });
    expect(next.error).toBeNull();
    const avail = await admin.rpc("get_availability");
    expect(avail.error).toBeNull();
    for (const row of [...(mine.data ?? []), ...(next.data ?? []), ...(avail.data ?? [])]) {
      expect(Object.keys(row).some((k) => k.includes("fee"))).toBe(false);
      expect(Object.values(row)).not.toContain(200000);
    }
  });

  it("menolak tarif negatif atau di atas batas", async () => {
    const nurse = ctx.staff.nurse.client;
    for (const fee of [-1, 100_000_001]) {
      const { error } = await nurse.from("queue_entries").update({ fee_rupiah: fee }).eq("id", entryId);
      expect(error?.code, String(fee)).toBe(CHECK_VIOLATION);
    }
    expect((await feeOf(entryId)).fee_rupiah).toBe(200000);
  });

  it("mengisi tarif pada pasien diperiksa tidak terhitung sebagai Panggil lagi", async () => {
    const nurse = ctx.staff.nurse.client;
    const called = await nurse.from("queue_entries").update({ status: "in_progress" }).eq("id", entryId);
    expect(called.error).toBeNull();
    const before = await feeOf(entryId);

    const { error } = await nurse.from("queue_entries").update({ fee_rupiah: 125000 }).eq("id", entryId);
    expect(error).toBeNull();
    expect(await feeOf(entryId)).toEqual({ ...before, fee_rupiah: 125000 });
  });

  it("tarif tidak boleh diubah bersamaan dengan status, dan tidak diisi untuk pasien tidak hadir", async () => {
    const nurse = ctx.staff.nurse.client;
    const mixed = await nurse.from("queue_entries").update({ status: "done", fee_rupiah: 1 }).eq("id", entryId);
    expect(mixed.error?.message).toBe("FEE_WITH_STATUS_CHANGE");

    expect((await nurse.from("queue_entries").update({ status: "no_show" }).eq("id", entryId)).error).toBeNull();
    const onNoShow = await nurse.from("queue_entries").update({ fee_rupiah: 50000 }).eq("id", entryId);
    expect(onNoShow.error?.message).toBe("FEE_NO_SHOW");
    // Mengosongkan tetap boleh.
    expect((await nurse.from("queue_entries").update({ fee_rupiah: null }).eq("id", entryId)).error).toBeNull();
    expect((await feeOf(entryId)).fee_rupiah).toBeNull();
  });

  it("perawat tetap tidak bisa mengubah nama, WhatsApp, atau keluhan", async () => {
    const nurse = ctx.staff.nurse.client;
    for (const patch of [{ name: "Ganti" }, { whatsapp: testWhatsapp(401) }, { complaint: "x" }]) {
      const { error } = await nurse.from("queue_entries").update(patch).eq("id", entryId);
      expect(error?.code, Object.keys(patch)[0]).toBe(PERMISSION_DENIED);
    }
  });

  it("perubahan tarif tercatat di audit log dengan pelaku dan nilai lama/baru", async () => {
    const { data, error } = await ctx.staff.owner.client
      .from("audit_log")
      .select("actor, old_data, new_data")
      .eq("entry_id", entryId)
      .eq("action", "queue_entries.update")
      .order("id");
    expect(error).toBeNull();
    const feeChanges = (data ?? []).filter(
      (r) => (r.old_data as { fee_rupiah?: unknown })?.fee_rupiah !== (r.new_data as { fee_rupiah?: unknown })?.fee_rupiah,
    );
    expect(feeChanges.map((r) => (r.new_data as { fee_rupiah: number | null }).fee_rupiah)).toEqual([
      150000,
      175000,
      200000,
      125000,
      null,
    ]);
    expect(feeChanges.map((r) => r.actor)).toEqual([
      ctx.staff.nurse.id,
      ctx.staff.doctor.id,
      ctx.staff.owner.id,
      ctx.staff.nurse.id,
      ctx.staff.nurse.id,
    ]);
  });
});

describe("jendela pendaftaran online hari ini", () => {
  async function todayStatus() {
    const { data, error } = await admin.rpc("get_availability");
    if (error) throw error;
    return data.find((d) => d.out_date === today)?.out_status;
  }

  it("setelah jam tutup: hari ini ditutup untuk online, tetapi walk-in tetap boleh", async () => {
    // Jam tutup 00:00:01, jadi sekarang (WITA) pasti sudah lewat.
    await ctx.setSettings({ registration_open_time: "00:00", cutoff_time: "00:00:01" });
    expect(await todayStatus()).toBe("registration_closed");

    const online = await takeQueue(today, "Pasien Telat", testWhatsapp(402));
    expect(online.error?.message).toBe("REGISTRATION_CLOSED");

    // Hari lain tetap tersedia.
    const other = await admin.rpc("get_availability");
    expect(other.data?.find((d) => d.out_date === date)?.out_status).toBe("available");

    if (ctx.todayIsClean) {
      const walkIn = await takeQueue(today, "Pasien Datang", testWhatsapp(403), {
        p_source: "walk_in",
        p_actor: ctx.staff.nurse.id,
      });
      expect(walkIn.error).toBeNull();
      expect(walkIn.data?.[0]?.out_number).toBe(1);
    }
  });

  // Butuh jam buka 22:59:58 (jam tutup paling lambat = close_time 23:00), jadi
  // hanya bisa diuji sebelum 22.59 WITA.
  it.skipIf(timeInAppZone() >= "22:59")("sebelum jam buka: hari ini belum dibuka", async () => {
    await ctx.setSettings({ registration_open_time: "22:59:58", cutoff_time: "23:00" });
    expect(await todayStatus()).toBe("registration_not_open");
    const online = await takeQueue(today, "Pasien Pagi", testWhatsapp(404));
    expect(online.error?.message).toBe("REGISTRATION_NOT_OPEN");
  });

  it("jam buka harus sebelum jam tutup", async () => {
    const { error } = await admin
      .from("practice_settings")
      .update({ registration_open_time: "21:00", cutoff_time: "21:00" })
      .eq("id", 1);
    expect(error?.code).toBe(CHECK_VIOLATION);
  });
});
