import { describe, expect, it } from "vitest";
import { emailToUsername, isValidUsername, normalizeUsername, usernameToEmail } from "./username";

describe("username staf", () => {
  it.each(["krisowner", "abc", "perawat.ayu", "dr_dhena", "staf-2", "a".repeat(32)])("menerima %j", (u) => {
    expect(isValidUsername(u)).toBe(true);
  });

  it.each(["ab", "a".repeat(33), "Kris", ".awal", "akhir-", "pakai spasi", "x@y", "ñame"])("menolak %j", (u) => {
    expect(isValidUsername(u)).toBe(false);
  });

  it("memetakan ke email internal dan kembali", () => {
    expect(usernameToEmail("krisdokter")).toBe("krisdokter@staf.praktik-tht.test");
    expect(emailToUsername("KrisDokter@staf.praktik-tht.test")).toBe("krisdokter");
    expect(emailToUsername("orang@gmail.com")).toBeNull();
  });

  it("menolak username tidak valid saat dipetakan", () => {
    expect(() => usernameToEmail("a@b.c")).toThrow();
  });

  it("normalisasi membuang spasi di ujung dan huruf besar", () => {
    expect(normalizeUsername("  KrisPerawat ")).toBe("krisperawat");
  });
});
