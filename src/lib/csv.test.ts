import { describe, expect, it } from "vitest";
import { CSV_BOM, escapeCell, neutralizeCell, toCsv } from "./csv";

describe("neutralizeCell", () => {
  it.each(["=1+1", "+62812", "-2", "@SUM(A1)", "\tx", "\rx", '=HYPERLINK("http://x")'])(
    "memberi awalan petik pada %j",
    (value) => {
      expect(neutralizeCell(value)).toBe(`'${value}`);
    },
  );

  it("tidak mengubah teks dan angka biasa", () => {
    expect(neutralizeCell("Ni Made Ayu")).toBe("Ni Made Ayu");
    expect(neutralizeCell("a=b")).toBe("a=b");
    expect(neutralizeCell(150000)).toBe("150000");
    expect(neutralizeCell(-5)).toBe("-5"); // angka asli, bukan teks dari pengguna
    expect(neutralizeCell(null)).toBe("");
    expect(neutralizeCell(undefined)).toBe("");
  });
});

describe("escapeCell", () => {
  it("mengapit dengan kutip dan menggandakan kutip", () => {
    expect(escapeCell('Budi "Bud"')).toBe('"Budi ""Bud"""');
  });

  it("titik koma dan baris baru tidak memecah sel", () => {
    expect(escapeCell("a;b\nc")).toBe('"a;b c"');
  });

  it("menetralkan rumus sebelum diapit", () => {
    expect(escapeCell("=cmd|' /C calc'!A0")).toBe(`"'=cmd|' /C calc'!A0"`);
  });
});

describe("toCsv", () => {
  it("diawali BOM, pemisah titik koma, baris CRLF", () => {
    const csv = toCsv(["Nama", "Tarif"], [["Ketut Ñoman", 150000], ["-1", null]]);
    expect(csv.startsWith(CSV_BOM)).toBe(true);
    expect(csv).toBe(`${CSV_BOM}"Nama";"Tarif"\r\n"Ketut Ñoman";"150000"\r\n"'-1";""\r\n`);
  });
});
