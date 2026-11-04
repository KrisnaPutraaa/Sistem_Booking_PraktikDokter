import { describe, expect, it } from "vitest";
import {
  addMinutes,
  closedIsoDays,
  formatClock,
  formatDay,
  formatDayGroups,
  formatDayOption,
  formatLongDate,
  registrationInfo,
  splitDoctorName,
} from "./format";

describe("format tanggal", () => {
  it("menulis hari dan tanggal dalam bahasa Indonesia", () => {
    expect(formatDay("2026-11-04")).toBe("Rabu, 4 Nov");
    expect(formatLongDate("2026-11-04")).toBe("Rabu, 4 Nov 2026");
  });

  it("menandai hari ini", () => {
    expect(formatDayOption("2026-11-03", "2026-11-03")).toBe("Hari ini, Selasa 3 Nov");
    expect(formatDayOption("2026-11-04", "2026-11-03")).toBe("Rabu, 4 Nov");
  });
});

describe("format jam", () => {
  it("memakai titik sebagai pemisah", () => {
    expect(formatClock("18:30:00")).toBe("18.30");
    expect(formatClock("09:05")).toBe("09.05");
  });

  it("menambah dan mengurangi menit", () => {
    expect(addMinutes("18:30:00", 12 * 15)).toBe("21:30:00");
    expect(addMinutes("20:30:00", -15)).toBe("20:15:00");
    expect(addMinutes("00:10:00", -15)).toBe("23:55:00");
  });
});

describe("formatDayGroups", () => {
  it("menulis rentang untuk tiga hari berurutan atau lebih", () => {
    expect(formatDayGroups([1, 2, 3, 4, 5, 6])).toBe("Senin – Sabtu");
    expect(formatDayGroups([6, 1, 2, 3])).toBe("Senin – Rabu, Sabtu");
  });

  it("menulis hari satu per satu bila tidak berurutan", () => {
    expect(formatDayGroups([1, 3, 5])).toBe("Senin, Rabu, Jumat");
    expect(formatDayGroups([6, 7])).toBe("Sabtu, Minggu");
    expect(formatDayGroups([])).toBe("");
  });

  it("mencari hari tutup", () => {
    expect(closedIsoDays([1, 2, 3, 4, 5, 6])).toEqual([7]);
  });
});

describe("splitDoctorName", () => {
  it("memisahkan gelar spesialis", () => {
    expect(splitDoctorName("dr. Luh Putu Dhena Purwaningsih, Sp.THT-KL")).toEqual({
      name: "dr. Luh Putu Dhena Purwaningsih,",
      title: "Sp.THT-KL",
    });
    expect(splitDoctorName("dr. Tanpa Gelar")).toEqual({ name: "dr. Tanpa Gelar", title: null });
  });
});

describe("registrationInfo", () => {
  it("menyebut jam tutup, jam buka, dan jangkauan hari dari pengaturan", () => {
    expect(registrationInfo({ openTime: "00:00:00", closeTime: "21:00:00", daysAhead: 3 })).toEqual({
      hours: "Pendaftaran online ditutup pukul 21.00 dan dibuka lagi pukul 00.00 pada hari praktik.",
      range: "Anda bisa mendaftar untuk hari ini sampai 3 hari ke depan.",
    });
  });

  it("tanpa jam tutup dan tanpa hari ke depan", () => {
    expect(registrationInfo({ openTime: "06:30:00", closeTime: null, daysAhead: 0 })).toEqual({
      hours: "Pendaftaran online dibuka mulai pukul 06.30 pada hari praktik.",
      range: "Pendaftaran hanya untuk hari ini.",
    });
  });
});
