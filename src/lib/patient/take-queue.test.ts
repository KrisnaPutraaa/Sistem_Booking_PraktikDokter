import { describe, expect, it } from "vitest";
import { classifyTakeQueueError, takeQueueSchema } from "./take-queue";

const valid = {
  date: "2026-11-04",
  name: "  Budi Santoso ",
  whatsapp: "0812 3456 7890",
  complaint: "  ",
  consent: "on",
  turnstileToken: "token",
};

describe("takeQueueSchema", () => {
  it("merapikan nama, menormalkan WhatsApp, dan mengosongkan keluhan kosong", () => {
    expect(takeQueueSchema.parse(valid)).toEqual({
      date: "2026-11-04",
      name: "Budi Santoso",
      whatsapp: "6281234567890",
      complaint: null,
      consent: "on",
      turnstileToken: "token",
    });
  });

  it("menyebut isian wajib yang kosong", () => {
    const result = takeQueueSchema.safeParse({ ...valid, name: " ", whatsapp: "" });
    const messages = Object.fromEntries(result.error?.issues.map((i) => [i.path[0], i.message]).reverse() ?? []);
    expect(messages.name).toBe("Nama pasien wajib diisi.");
    expect(messages.whatsapp).toBe("Nomor WhatsApp wajib diisi.");
  });

  it.each([
    ["date", { date: "4/11/2026" }],
    ["name", { name: "B" }],
    ["name", { name: "x".repeat(81) }],
    ["whatsapp", { whatsapp: "12345" }],
    ["complaint", { complaint: "x".repeat(501) }],
    ["consent", { consent: undefined }],
    ["turnstileToken", { turnstileToken: "" }],
  ])("menolak %s yang tidak valid", (field, patch) => {
    const result = takeQueueSchema.safeParse({ ...valid, ...patch });
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((i) => i.path[0])).toContain(field);
  });
});

describe("classifyTakeQueueError", () => {
  it("memisahkan kuota penuh", () => {
    expect(classifyTakeQueueError("FULL")).toEqual({ kind: "full" });
  });

  it("memberi pesan ramah untuk kode yang dikenal", () => {
    for (const code of ["DATE_OUT_OF_RANGE", "NOT_OPEN_DAY", "CLOSED_DAY", "REGISTRATION_CLOSED", "REGISTRATION_NOT_OPEN", "TOO_MANY_FOR_NUMBER"]) {
      const result = classifyTakeQueueError(code);
      expect(result.kind).toBe("rejected");
    }
  });

  it("tidak meneruskan pesan galat lain ke pasien", () => {
    expect(classifyTakeQueueError('new row violates check constraint "x"')).toEqual({ kind: "unknown" });
    expect(classifyTakeQueueError(undefined)).toEqual({ kind: "unknown" });
  });
});
