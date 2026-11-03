import { describe, expect, it } from "vitest";
import { APP_TIMEZONE, timeInAppZone, todayInAppZone } from "./time";

describe("waktu aplikasi (WITA)", () => {
  it("memakai Asia/Makassar", () => {
    expect(APP_TIMEZONE).toBe("Asia/Makassar");
  });

  it("sudah berganti hari di WITA walau UTC masih hari sebelumnya", () => {
    // 3 Nov 16.30 UTC = 4 Nov 00.30 WITA
    const now = new Date("2026-11-03T16:30:00Z");
    expect(todayInAppZone(now)).toBe("2026-11-04");
    expect(timeInAppZone(now)).toBe("00:30");
  });

  it("masih hari yang sama tepat sebelum tengah malam WITA", () => {
    // 3 Nov 15.59 UTC = 3 Nov 23.59 WITA
    const now = new Date("2026-11-03T15:59:00Z");
    expect(todayInAppZone(now)).toBe("2026-11-03");
    expect(timeInAppZone(now)).toBe("23:59");
  });

  it("jam buka praktik 18.30 WITA = 10.30 UTC", () => {
    expect(timeInAppZone(new Date("2026-11-03T10:30:00Z"))).toBe("18:30");
  });
});
