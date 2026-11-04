import { describe, expect, it } from "vitest";
import { base32Decode, hotp, totp } from "./totp";

// Vektor uji RFC 4226 (lampiran D) dan RFC 6238 (lampiran B, SHA-1, 8 digit dipotong ke 6).
describe("TOTP untuk uji database", () => {
  const key = Buffer.from("12345678901234567890");

  it("HOTP sesuai RFC 4226", () => {
    expect(hotp(key, 0)).toBe("755224");
    expect(hotp(key, 1)).toBe("287082");
    expect(hotp(key, 9)).toBe("520489");
  });

  it("TOTP sesuai RFC 6238 (6 digit terakhir)", () => {
    const secret = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ"; // base32 dari "12345678901234567890"
    expect(base32Decode(secret).equals(key)).toBe(true);
    expect(totp(secret, 59_000)).toBe("287082");
    expect(totp(secret, 1_111_111_109_000)).toBe("081804");
  });
});
