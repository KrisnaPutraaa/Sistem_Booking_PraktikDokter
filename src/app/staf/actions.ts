"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { canAddWalkIn, canManageFee } from "@/lib/staff/roles";
import {
  feeSchema,
  STAFF_GENERIC_ERROR,
  STATUS_ACTIONS,
  staffErrorMessage,
  statusActionSchema,
  walkInSchema,
  type WalkInField,
} from "@/lib/staff/schemas";
import { currentStaff } from "@/lib/staff/session";
import { todayInAppZone } from "@/lib/time";

/**
 * Aksi panel staf. Setiap aksi memeriksa sesi dan peran di server; perubahan
 * antrean memakai sesi staf sendiri sehingga RLS dan trigger database tetap
 * berlaku. Hanya walk-in yang memakai service_role (take_queue), setelah peran
 * diperiksa. Log hanya berisi kode galat, tanpa data pasien.
 */

export type ActionResult = { ok: true } | { ok: false; message: string };

const SESSION_EXPIRED_MESSAGE = "Sesi berakhir. Masuk ulang, ya.";
const SESSION_EXPIRED: ActionResult = { ok: false, message: SESSION_EXPIRED_MESSAGE };

export async function signOutAction(): Promise<void> {
  const staff = await currentStaff();
  if (staff) await staff.supabase.auth.signOut();
  redirect("/staf/masuk?info=keluar");
}

export async function updateStatusAction(entryId: string, action: string): Promise<ActionResult> {
  const staff = await currentStaff();
  if (!staff) return SESSION_EXPIRED;

  const parsed = statusActionSchema.safeParse({ entryId, action });
  if (!parsed.success) return { ok: false, message: STAFF_GENERIC_ERROR };

  const { data, error } = await staff.supabase
    .from("queue_entries")
    .update({ status: STATUS_ACTIONS[parsed.data.action] })
    .eq("id", parsed.data.entryId)
    .select("id");

  if (error) return failure("ubah status", error);
  if (!data || data.length === 0) return { ok: false, message: "Antrean tidak ditemukan." };
  refresh();
  return { ok: true };
}

export async function setFeeAction(entryId: string, fee: string): Promise<ActionResult> {
  const staff = await currentStaff();
  if (!staff) return SESSION_EXPIRED;
  if (!canManageFee(staff.role)) return { ok: false, message: "Akun ini tidak boleh mengisi tarif." };

  const parsed = feeSchema.safeParse({ entryId, fee });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Tarif tidak valid." };

  const { data, error } = await staff.supabase
    .from("queue_entries")
    .update({ fee_rupiah: parsed.data.fee })
    .eq("id", parsed.data.entryId)
    .select("id");

  if (error) return failure("simpan tarif", error);
  if (!data || data.length === 0) return { ok: false, message: "Antrean tidak ditemukan." };
  refresh();
  return { ok: true };
}

export type WalkInState =
  | { status: "idle" }
  | { status: "error"; message?: string; fieldErrors?: Partial<Record<WalkInField, string>> }
  | { status: "ok"; number: number; at: number };

export async function addWalkInAction(_prev: WalkInState, formData: FormData): Promise<WalkInState> {
  const staff = await currentStaff();
  if (!staff) return { status: "error", message: SESSION_EXPIRED_MESSAGE };
  if (!canAddWalkIn(staff.role)) return { status: "error", message: "Akun ini tidak boleh menambah walk-in." };

  const text = (name: string) => {
    const v = formData.get(name);
    return typeof v === "string" ? v : undefined;
  };
  const parsed = walkInSchema.safeParse({
    name: text("name"),
    whatsapp: text("whatsapp"),
    complaint: text("complaint"),
    consent: text("consent"),
  });
  if (!parsed.success) {
    const fieldErrors: Partial<Record<WalkInField, string>> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as WalkInField | undefined;
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { status: "error", fieldErrors };
  }

  // take_queue hanya bisa dipanggil service_role. p_actor = id staf yang sudah
  // diperiksa di atas; dicatat sebagai actor di audit_log.
  const { data, error } = await createAdminClient().rpc("take_queue", {
    p_date: todayInAppZone(),
    p_name: parsed.data.name,
    p_whatsapp: parsed.data.whatsapp,
    p_complaint: parsed.data.complaint ?? "",
    p_source: "walk_in",
    p_actor: staff.userId,
  });

  if (error) {
    const friendly = staffErrorMessage(error.message);
    if (!friendly) console.error("walk-in gagal", { code: error.code });
    return { status: "error", message: friendly ?? STAFF_GENERIC_ERROR };
  }
  const row = data[0];
  if (!row) {
    console.error("walk-in: take_queue tanpa baris");
    return { status: "error", message: STAFF_GENERIC_ERROR };
  }
  refresh();
  return { status: "ok", number: row.out_number, at: Date.now() };
}

function failure(what: string, error: { code?: string; message?: string }): ActionResult {
  const friendly = staffErrorMessage(error.message);
  if (!friendly) console.error(`${what} gagal`, { code: error.code });
  return { ok: false, message: friendly ?? STAFF_GENERIC_ERROR };
}
