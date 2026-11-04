import { describe, expect, it } from "vitest";
import { formatWhatsappDisplay, normalizeWhatsapp } from "./whatsapp";

describe("normalizeWhatsapp", () => {
  it.each([
    ["081234567890", "6281234567890"],
    ["0812 3456 7890", "6281234567890"],
    ["0812-3456-7890", "6281234567890"],
    ["(0812) 3456.7890", "6281234567890"],
    ["+62 812 3456 7890", "6281234567890"],
    ["6281234567890", "6281234567890"],
    ["  081234567890  ", "6281234567890"],
  ])("%s -> %s", (input, expected) => {
    expect(normalizeWhatsapp(input)).toBe(expected);
  });

  it.each([
    ["kosong", ""],
    ["huruf", "0812abc4567"],
    ["terlalu pendek", "0812345"],
    ["terlalu panjang", "0812345678901234"],
    ["bukan 62", "+6581234567"],
    ["tanpa awalan 0 atau 62", "81234567890"],
    ["plus di tengah", "0812+34567890"],
  ])("menolak %s", (_label, input) => {
    expect(normalizeWhatsapp(input)).toBeNull();
  });
});

describe("formatWhatsappDisplay", () => {
  it("628xx menjadi 08xx berkelompok empat digit", () => {
    expect(formatWhatsappDisplay("6281234567890")).toBe("0812 3456 7890");
    expect(formatWhatsappDisplay("628123456")).toBe("0812 3456");
  });
});
