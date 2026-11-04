"use server";

import { z } from "zod";
import type { QueueStatus } from "@/lib/queue-status";
import { canErasePatientData } from "@/lib/staff/roles";
import { STAFF_GENERIC_ERROR } from "@/lib/staff/schemas";
import { currentStaff } from "@/lib/staff/session";
import { normalizeWhatsapp } from "@/lib/whatsapp";

/**
 * Hapus data pasien atas permintaan (hanya pemilik). Pencarian lewat Server
 * Action (POST), bukan parameter URL, supaya nomor WhatsApp tidak tercatat di
 * log akses. Penghapusan memanggil erase_queue_entries dengan sesi pemilik:
 * database memeriksa lagi peran owner dan aal2, lalu mencatat audit tanpa data
 * pribadi. Log aplikasi hanya berisi kode galat.
 */

const OWNER_ONLY = "Hanya pemilik yang bisa menghapus data pasien.";
const SESSION_EXPIRED = "Sesi berakhir. Masuk ulang, ya.";

export type ErasableEntry = {
  id: string;
  date: string;
  number: number;
  name: string;
  status: QueueStatus;
  anonymized: boolean;
};

export type SearchState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "ok"; whatsappDisplay: string; entries: ErasableEntry[]; at: number };

const searchSchema = z
  .string({ error: "Isi nomor WhatsApp pasien." })
  .trim()
  .min(1, { error: "Isi nomor WhatsApp pasien." })
  .max(32, { error: "Nomor WhatsApp tidak valid." })
  .transform((value, ctx) => {
    const normalized = normalizeWhatsapp(value);
    if (!normalized) {
      ctx.addIssue({ code: "custom", message: "Nomor WhatsApp tidak valid. Contoh: 0812 3456 7890." });
      return z.NEVER;
    }
    return normalized;
  });

export async function searchPatientAction(_prev: SearchState, formData: FormData): Promise<SearchState> {
  const staff = await currentStaff();
  if (!staff) return { status: "error", message: SESSION_EXPIRED };
  if (!canErasePatientData(staff.role)) return { status: "error", message: OWNER_ONLY };

  const parsed = searchSchema.safeParse(formData.get("whatsapp"));
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? STAFF_GENERIC_ERROR };

  const { data, error } = await staff.supabase
    .from("queue_entries")
    .select("id, queue_date, number, name, status, anonymized_at")
    .eq("whatsapp", parsed.data)
    .order("queue_date", { ascending: false })
    .order("number")
    .limit(200);
  if (error) {
    console.error("cari data pasien gagal", { code: error.code });
    return { status: "error", message: STAFF_GENERIC_ERROR };
  }

  return {
    status: "ok",
    whatsappDisplay: parsed.data,
    at: Date.now(),
    entries: data.map((row) => ({
      id: row.id,
      date: row.queue_date,
      number: row.number,
      name: row.name,
      status: row.status,
      anonymized: row.anonymized_at !== null,
    })),
  };
}

const eraseSchema = z.array(z.uuid()).min(1, { error: "Pilih paling sedikit satu antrean." }).max(200);

const ERASE_MESSAGES: Record<string, string> = {
  ERASE_ACTIVE_ENTRY:
    "Ada antrean yang masih menunggu atau diperiksa. Selesaikan atau tandai tidak hadir dulu di panel antrean.",
  ERASE_NOT_ALLOWED: OWNER_ONLY,
  ERASE_INVALID: "Pilihan antrean tidak valid.",
};

export type EraseResult = { ok: true; count: number } | { ok: false; message: string };

export async function eraseEntriesAction(ids: string[]): Promise<EraseResult> {
  const staff = await currentStaff();
  if (!staff) return { ok: false, message: SESSION_EXPIRED };
  if (!canErasePatientData(staff.role)) return { ok: false, message: OWNER_ONLY };

  const parsed = eraseSchema.safeParse(ids);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? STAFF_GENERIC_ERROR };

  const { data, error } = await staff.supabase.rpc("erase_queue_entries", { p_ids: parsed.data });
  if (error) {
    const friendly = ERASE_MESSAGES[error.message.trim()];
    if (!friendly) console.error("hapus data pasien gagal", { code: error.code });
    return { ok: false, message: friendly ?? STAFF_GENERIC_ERROR };
  }
  return { ok: true, count: data };
}
