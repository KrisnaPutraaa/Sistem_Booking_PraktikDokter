import { describe, expect, it } from "vitest";
import { nameCorrectionSchema } from "./schemas";
import { closedDaySchema, settingsConstraintMessage, settingsSchema, type SettingsInput } from "./settings-schema";

const valid: SettingsInput = {
  dailyQuota: "15",
  avgMinutes: "15",
  openTime: "18:30",
  closeTime: "23:00",
  registrationOpenTime: "00:00",
  registrationCloseTime: "21:00",
  openDays: ["1", "2", "3", "4", "5", "6"],
  daysAhead: "3",
  maxPerWhatsapp: "3",
  walkInEnabled: "on",
  emergencyNotice: "",
};

const issues = (input: SettingsInput) => {
  const r = settingsSchema.safeParse(input);
  return r.success ? [] : r.error.issues.map((i) => String(i.path[0]));
};

describe("settingsSchema", () => {
  it("menerima nilai bawaan dan menormalkan", () => {
    const r = settingsSchema.parse({ ...valid, openTime: "18:30:00", openDays: ["3", "1", "1"] });
    expect(r).toMatchObject({
      dailyQuota: 15,
      openTime: "18:30",
      openDays: [1, 3],
      walkInEnabled: true,
      emergencyNotice: null,
      registrationCloseTime: "21:00",
    });
  });

  it("walk-in mati bila kotak tidak dicentang; jam tutup pendaftaran kosong = tanpa batas", () => {
    const r = settingsSchema.parse({ ...valid, walkInEnabled: undefined, registrationCloseTime: "" });
    expect(r.walkInEnabled).toBe(false);
    expect(r.registrationCloseTime).toBeNull();
  });

  it("kuota × durasi harus muat di jam praktik (270 menit)", () => {
    expect(issues({ ...valid, dailyQuota: "18" })).toEqual([]); // 270
    expect(issues({ ...valid, dailyQuota: "19" })).toEqual(["dailyQuota"]); // 285
  });

  it("urutan jam", () => {
    expect(issues({ ...valid, closeTime: "18:00" })).toEqual(["closeTime"]);
    expect(issues({ ...valid, registrationCloseTime: "23:30" })).toEqual(["registrationCloseTime"]);
    expect(issues({ ...valid, registrationOpenTime: "21:00" })).toEqual(["registrationOpenTime"]);
    expect(issues({ ...valid, registrationCloseTime: "", registrationOpenTime: "23:00" })).toEqual([
      "registrationOpenTime",
    ]);
  });

  it.each([
    ["dailyQuota", "0"],
    ["dailyQuota", "201"],
    ["dailyQuota", "1.5"],
    ["avgMinutes", "121"],
    ["daysAhead", "15"],
    ["maxPerWhatsapp", "0"],
    ["openTime", "25:00"],
    ["openDays", []],
    ["openDays", ["8"]],
    ["emergencyNotice", "x".repeat(501)],
  ])("menolak %s = %j", (field, value) => {
    expect(issues({ ...valid, [field]: value })).toContain(field);
  });
});

describe("closedDaySchema", () => {
  const schema = closedDaySchema("2026-11-04");
  it("hari ini atau setelahnya", () => {
    expect(schema.parse({ day: "2026-11-04", reason: " " })).toEqual({ day: "2026-11-04", reason: null });
    expect(schema.safeParse({ day: "2026-11-03" }).success).toBe(false);
    expect(schema.safeParse({ day: "2026-11-31" }).success).toBe(false);
    expect(schema.safeParse({ day: "2026-11-10", reason: "x".repeat(201) }).success).toBe(false);
  });
});

describe("settingsConstraintMessage", () => {
  it("mengenali constraint database", () => {
    expect(
      settingsConstraintMessage('new row for relation "practice_settings" violates check constraint "quota_fits_hours"'),
    ).toMatch(/Kuota/);
    expect(settingsConstraintMessage("lain")).toBeNull();
  });
});

describe("nameCorrectionSchema", () => {
  const entryId = "6f9619ff-8b86-4011-b42d-00c04fc964ff";
  it("memangkas dan membatasi panjang", () => {
    expect(nameCorrectionSchema.parse({ entryId, name: "  Ni Made  " }).name).toBe("Ni Made");
    expect(nameCorrectionSchema.safeParse({ entryId, name: "A" }).success).toBe(false);
    expect(nameCorrectionSchema.safeParse({ entryId, name: "x".repeat(81) }).success).toBe(false);
  });
});
