import { describe, expect, it } from "vitest";
import { CSV_BOM } from "@/lib/csv";
import { buildExportCsv, EXPORT_HEADER } from "./export-csv";
import {
  entryDurationMinutes,
  formatDuration,
  formatPeriod,
  parsePeriod,
  summarizeRecap,
  type RecapDay,
} from "./history";

const today = "2026-11-03";

describe("parsePeriod", () => {
  it("bawaan 7 hari terakhir sampai hari ini", () => {
    expect(parsePeriod({}, today)).toEqual({ from: "2026-10-28", to: "2026-11-03", isDefault: true });
  });

  it("menerima periode valid", () => {
    expect(parsePeriod({ dari: "2026-10-01", sampai: "2026-10-31" }, today)).toMatchObject({
      from: "2026-10-01",
      to: "2026-10-31",
      isDefault: false,
    });
  });

  it.each([
    [{ dari: "2026-11-03", sampai: "2026-11-01" }], // terbalik
    [{ dari: "2026-02-30", sampai: "2026-03-01" }], // tanggal tidak ada
    [{ dari: "2026-01-01", sampai: "2026-04-03" }], // 93 hari
    [{ dari: "x", sampai: "2026-11-01" }],
    [{ dari: ["2026-11-01"], sampai: "2026-11-02" }],
  ])("kembali ke bawaan untuk %j", (params) => {
    expect(parsePeriod(params, today).isDefault).toBe(true);
  });

  it("92 hari masih diterima", () => {
    expect(parsePeriod({ dari: "2026-01-01", sampai: "2026-04-02" }, today).isDefault).toBe(false);
  });
});

const day = (over: Partial<RecapDay>): RecapDay => ({
  date: today,
  total: 0,
  done: 0,
  noShow: 0,
  open: 0,
  timed: 0,
  avgMinutes: null,
  totalFee: null,
  ...over,
});

describe("summarizeRecap", () => {
  it("menjumlahkan dan menimbang rata-rata durasi", () => {
    const s = summarizeRecap(
      [
        day({ total: 10, done: 8, noShow: 2, timed: 8, avgMinutes: 10, totalFee: 800_000 }),
        day({ total: 3, done: 2, noShow: 1, timed: 2, avgMinutes: 20, totalFee: 300_000 }),
        day({ total: 1, open: 1 }),
      ],
      true,
    );
    expect(s).toEqual({ total: 14, done: 10, noShow: 3, avgMinutes: 12, totalFee: 1_100_000 });
  });

  it("tanpa total tarif untuk perawat", () => {
    expect(summarizeRecap([day({ total: 1, totalFee: 5 })], false).totalFee).toBeNull();
  });

  it("rata-rata null bila belum ada pasien selesai", () => {
    expect(summarizeRecap([], true)).toEqual({ total: 0, done: 0, noShow: 0, avgMinutes: null, totalFee: 0 });
  });
});

describe("format", () => {
  it("periode", () => {
    expect(formatPeriod({ from: "2026-10-28", to: "2026-11-03" })).toBe("28 Okt – 3 Nov 2026");
    expect(formatPeriod({ from: "2026-12-29", to: "2027-01-04" })).toBe("29 Des 2026 – 4 Jan 2027");
    expect(formatPeriod({ from: today, to: today })).toBe("3 Nov 2026");
  });

  it("durasi", () => {
    expect(formatDuration(14.6)).toBe("15 menit");
    expect(formatDuration(15, "mnt")).toBe("15 mnt");
    expect(formatDuration(null)).toBe("–");
  });

  it("durasi satu pasien", () => {
    expect(entryDurationMinutes("2026-11-03T10:30:00Z", "2026-11-03T10:44:40Z")).toBe(15);
    expect(entryDurationMinutes(null, "2026-11-03T10:44:40Z")).toBeNull();
  });
});

describe("buildExportCsv", () => {
  it("satu baris per pasien, jam WITA, tanpa WhatsApp dan keluhan", () => {
    const csv = buildExportCsv([
      {
        queueDate: today,
        number: 1,
        name: "=Made",
        status: "done",
        source: "walk_in",
        callCount: 1,
        calledAt: "2026-11-03T10:30:00Z", // 18.30 WITA
        finishedAt: "2026-11-03T10:45:00Z",
        feeRupiah: 150000,
      },
      {
        queueDate: today,
        number: 2,
        name: "Wayan",
        status: "no_show",
        source: "online",
        callCount: 2,
        calledAt: "2026-11-03T11:00:00Z",
        finishedAt: null,
        feeRupiah: null,
      },
    ]);
    const lines = csv.slice(CSV_BOM.length).split("\r\n");
    expect(lines[0]).toBe(EXPORT_HEADER.map((h) => `"${h}"`).join(";"));
    expect(lines[1]).toBe(`"2026-11-03";"1";"'=Made";"selesai";"walk-in";"1";"18:30";"18:45";"15";"150000"`);
    expect(lines[2]).toBe(`"2026-11-03";"2";"Wayan";"tidak hadir";"online";"2";"19:00";"";"";""`);
    expect(csv.toLowerCase()).not.toContain("whatsapp");
  });
});
