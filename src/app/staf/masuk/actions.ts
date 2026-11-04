"use server";

import { redirect } from "next/navigation";
import { RATE_LIMITED_MESSAGE, RATE_LIMITS } from "@/lib/rate-limit";
import { allowAttempt, requestIpKey } from "@/lib/rate-limit.server";
import { createStaffClient } from "@/lib/supabase/server";
import { loginSchema, type LoginField } from "@/lib/staff/schemas";

export type LoginState =
  | { status: "idle" }
  | { status: "error"; message?: string; fieldErrors?: Partial<Record<LoginField, string>>; email?: string };

const WRONG_CREDENTIALS = "Email atau kata sandi salah.";

/**
 * Masuk dengan email dan kata sandi lewat sesi Supabase staf (cookie). Pesan
 * galat dibuat umum supaya tidak membocorkan email mana yang terdaftar.
 * Email tidak dicatat di log. Batas percobaan per IP dan per email (Fase 6)
 * dihitung sebelum kata sandi diperiksa, dengan pesan yang sama untuk semua
 * akun sehingga tidak membocorkan apakah email terdaftar.
 */
export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = formData.get("email");
  const parsed = loginSchema.safeParse({ email, password: formData.get("password") });

  if (!parsed.success) {
    const fieldErrors: Partial<Record<LoginField, string>> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as LoginField | undefined;
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { status: "error", fieldErrors, email: typeof email === "string" ? email : undefined };
  }

  const ipOk = await allowAttempt(RATE_LIMITS.loginIp, await requestIpKey());
  const emailOk = await allowAttempt(RATE_LIMITS.loginEmail, parsed.data.email.toLowerCase());
  if (!ipOk || !emailOk) {
    return { status: "error", message: RATE_LIMITED_MESSAGE, email: parsed.data.email };
  }

  const supabase = await createStaffClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    if (error.status === 429) {
      return { status: "error", message: RATE_LIMITED_MESSAGE, email: parsed.data.email };
    }
    if (error.code !== "invalid_credentials" && error.code !== "email_not_confirmed") {
      console.error("login staf gagal", { code: error.code, status: error.status });
    }
    return { status: "error", message: WRONG_CREDENTIALS, email: parsed.data.email };
  }

  redirect("/staf");
}
