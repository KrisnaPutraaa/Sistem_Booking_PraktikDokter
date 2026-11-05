import { describe, expect, it } from "vitest";
import { feeSchema, loginSchema, staffErrorMessage, statusActionSchema, walkInSchema } from "./schemas";

const id = "6f9619ff-8b86-4011-b42d-00c04fc964ff";

describe("feeSchema", () => {
  it.each([
    ["150000", 150000],
    ["150.000", 150000],
    ["Rp 150.000", 150000],
    ["rp150000", 150000],
    ["0", 0],
    ["", null],
    ["   ", null],
  ])("%j menjadi %j", (input, expected) => {
    expect(feeSchema.parse({ entryId: id, fee: input }).fee).toBe(expected);
  });

  it.each(["150,5", "-1", "abc", "100000001", "1e6"])("menolak %j", (input) => {
    expect(feeSchema.safeParse({ entryId: id, fee: input }).success).toBe(false);
  });

  it("menolak id yang bukan UUID", () => {
    expect(feeSchema.safeParse({ entryId: "1", fee: "1000" }).success).toBe(false);
  });
});

describe("statusActionSchema", () => {
  it("hanya menerima aksi yang dikenal", () => {
    expect(statusActionSchema.safeParse({ entryId: id, action: "call" }).success).toBe(true);
    expect(statusActionSchema.safeParse({ entryId: id, action: "delete" }).success).toBe(false);
  });
});

describe("walkInSchema", () => {
  it("menormalisasi WhatsApp dan mewajibkan persetujuan", () => {
    const ok = walkInSchema.parse({ name: " Budi ", whatsapp: "0812-3456-7890", complaint: "", consent: "on" });
    expect(ok).toEqual({ name: "Budi", whatsapp: "6281234567890", complaint: null, consent: "on" });
    expect(walkInSchema.safeParse({ name: "Budi", whatsapp: "0812 3456 7890" }).success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("menormalisasi username", () => {
    expect(loginSchema.parse({ username: "  KrisOwner ", password: "x" }).username).toBe("krisowner");
  });

  it.each(["", "ab", "a b", "perawat@praktik.id", "-awal", "akhir.", "x".repeat(33)])("menolak %j", (u) => {
    expect(loginSchema.safeParse({ username: u, password: "x" }).success).toBe(false);
  });
});

describe("staffErrorMessage", () => {
  it("menerjemahkan kode database; selain itu null", () => {
    expect(staffErrorMessage("FULL")).toBe("Kuota hari ini sudah penuh.");
    expect(staffErrorMessage("duplicate key value")).toBeNull();
  });
});
