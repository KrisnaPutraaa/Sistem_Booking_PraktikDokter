/**
 * Pembuat CSV untuk Excel (locale Indonesia):
 * - BOM UTF-8 di awal supaya huruf non-ASCII terbaca benar;
 * - pemisah titik koma, baris CRLF;
 * - setiap sel diapit tanda kutip, tanda kutip di dalamnya digandakan;
 * - pencegahan CSV injection: sel yang diawali = + - @, tab, atau CR diberi
 *   awalan tanda petik (') sehingga Excel membacanya sebagai teks, bukan rumus.
 */

export const CSV_BOM = "﻿";
export const CSV_SEPARATOR = ";";

export type CsvCell = string | number | null | undefined;

const FORMULA_START = /^[=+\-@\t\r]/;

/** Netralkan sel yang bisa dibaca sebagai rumus. Angka asli tidak diubah. */
export function neutralizeCell(value: CsvCell): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "";
  return FORMULA_START.test(value) ? `'${value}` : value;
}

export function escapeCell(value: CsvCell): string {
  // Baris baru di dalam sel diganti spasi supaya satu pasien = satu baris.
  const text = neutralizeCell(value).replace(/\r\n|\r|\n/g, " ");
  return `"${text.replace(/"/g, '""')}"`;
}

export function toCsv(header: readonly string[], rows: readonly (readonly CsvCell[])[]): string {
  const lines = [header, ...rows].map((row) => row.map(escapeCell).join(CSV_SEPARATOR));
  return CSV_BOM + lines.join("\r\n") + "\r\n";
}
