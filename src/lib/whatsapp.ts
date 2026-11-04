/** Sama dengan constraint queue_entries.whatsapp di database. */
const NORMALIZED = /^62[0-9]{8,13}$/;

/**
 * Normalisasi nomor WhatsApp (docs/Panduan, bagian 7): hapus spasi dan tanda baca,
 * 08xx menjadi 628xx, +62 menjadi 62. Mengembalikan null bila hasilnya bukan
 * 62 diikuti 8 sampai 13 digit.
 */
export function normalizeWhatsapp(input: string): string | null {
  const trimmed = input.trim();
  // "+" hanya sah di depan; selain itu yang tersisa harus angka.
  const body = trimmed.startsWith("+") ? trimmed.slice(1) : trimmed;
  const digits = body.replace(/[\s\-.()/]/g, "");
  if (!/^[0-9]+$/.test(digits)) return null;

  const normalized = digits.startsWith("0") ? `62${digits.slice(1)}` : digits;
  return NORMALIZED.test(normalized) ? normalized : null;
}

/** Nomor ternormalisasi (628xx) untuk dibaca staf: "0812 3456 7890". */
export function formatWhatsappDisplay(normalized: string): string {
  const local = normalized.startsWith("62") ? `0${normalized.slice(2)}` : normalized;
  return local.replace(/(\d{4})(?=\d)/g, "$1 ");
}
