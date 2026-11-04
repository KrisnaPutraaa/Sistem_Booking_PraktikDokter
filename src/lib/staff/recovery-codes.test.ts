import { describe, expect, it } from "vitest";
import { formatRecoveryCode, generateRecoveryCodes, normalizeRecoveryCode } from "./recovery-codes";

describe("kode pemulihan", () => {
  it("10 kode unik, 10 karakter, sesuai format database", () => {
    const codes = generateRecoveryCodes();
    expect(codes).toHaveLength(10);
    expect(new Set(codes).size).toBe(10);
    for (const code of codes) expect(code).toMatch(/^[A-HJ-NP-Z2-9]{10}$/);
  });

  it("format dan normalisasi saling balik", () => {
    expect(formatRecoveryCode("ABCDEFGHJK")).toBe("ABCDE-FGHJK");
    expect(normalizeRecoveryCode(" abcde-fghjk ")).toBe("ABCDEFGHJK");
  });
});
