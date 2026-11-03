"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyTurnstile } from "@/lib/turnstile.server";
import {
  classifyTakeQueueError,
  GENERIC_ERROR,
  takeQueueSchema,
  type TakeQueueField,
} from "@/lib/patient/take-queue";

export type TakeQueueState =
  | { status: "idle" }
  | { status: "error"; message?: string; fieldErrors?: Partial<Record<TakeQueueField, string>> }
  | { status: "ok"; token: string; number: number; date: string };

function field(formData: FormData, name: string): string | undefined {
  const value = formData.get(name);
  return typeof value === "string" ? value : undefined;
}

/**
 * Ambil nomor antrean (pasien online). Urutan: validasi zod, verifikasi
 * Turnstile, lalu take_queue lewat service_role. Log hanya berisi kode galat,
 * tidak pernah nama, WhatsApp, atau keluhan.
 */
export async function takeQueueAction(_prev: TakeQueueState, formData: FormData): Promise<TakeQueueState> {
  const parsed = takeQueueSchema.safeParse({
    date: field(formData, "date"),
    name: field(formData, "name"),
    whatsapp: field(formData, "whatsapp"),
    complaint: field(formData, "complaint"),
    consent: field(formData, "consent"),
    turnstileToken: field(formData, "cf-turnstile-response"),
  });

  if (!parsed.success) {
    const fieldErrors: Partial<Record<TakeQueueField, string>> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as TakeQueueField | undefined;
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { status: "error", fieldErrors };
  }

  const input = parsed.data;

  if (!(await verifyTurnstile(input.turnstileToken))) {
    return {
      status: "error",
      fieldErrors: { turnstileToken: "Verifikasi keamanan gagal. Coba centang ulang, lalu kirim lagi." },
    };
  }

  const { data, error } = await createAdminClient().rpc("take_queue", {
    p_date: input.date,
    p_name: input.name,
    p_whatsapp: input.whatsapp,
    p_complaint: input.complaint ?? "",
    p_source: "online",
  });

  if (error) {
    const failure = classifyTakeQueueError(error.message);
    if (failure.kind === "full") redirect(`/ambil?penuh=${input.date}`);
    if (failure.kind === "rejected") return { status: "error", message: failure.message };
    console.error("take_queue gagal", { code: error.code });
    return { status: "error", message: GENERIC_ERROR };
  }

  const row = data[0];
  if (!row) {
    console.error("take_queue tidak mengembalikan baris");
    return { status: "error", message: GENERIC_ERROR };
  }
  return { status: "ok", token: row.out_token, number: row.out_number, date: row.out_queue_date };
}
