"use server";

import { redirect } from "next/navigation";
import { RATE_LIMITED_MESSAGE, RATE_LIMITS } from "@/lib/rate-limit";
import { allowAttempt, requestIpKey } from "@/lib/rate-limit.server";
import { createStaffClient } from "@/lib/supabase/server";
import { loginSchema, type LoginField } from "@/lib/staff/schemas";
import { usernameToEmail } from "@/lib/staff/username";

export type LoginState =
  | { status: "idle" }
  | { status: "error"; message?: string; fieldErrors?: Partial<Record<LoginField, string>>; username?: string };

const WRONG_CREDENTIALS = "Username atau kata sandi salah.";

/**
 * Masuk dengan username dan kata sandi lewat sesi Supabase staf (cookie).
 * Username dipetakan ke email internal tetap (lib/staff/username.ts) untuk
 * Supabase Auth. Pesan galat dibuat umum supaya tidak membocorkan username
 * mana yang terdaftar, dan username tidak dicatat di log. Batas percobaan per
 * IP dan per username dihitung sebelum kata sandi diperiksa, dengan pesan yang
 * sama untuk semua akun.
 */
export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const rawUsername = formData.get("username");
  const parsed = loginSchema.safeParse({ username: rawUsername, password: formData.get("password") });
  const echo = typeof rawUsername === "string" ? rawUsername.slice(0, 100) : undefined;

  if (!parsed.success) {
    const fieldErrors: Partial<Record<LoginField, string>> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as LoginField | undefined;
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { status: "error", fieldErrors, username: echo };
  }

  const { username, password } = parsed.data;
  const ipOk = await allowAttempt(RATE_LIMITS.loginIp, await requestIpKey());
  const usernameOk = await allowAttempt(RATE_LIMITS.loginUsername, username);
  if (!ipOk || !usernameOk) {
    return { status: "error", message: RATE_LIMITED_MESSAGE, username };
  }

  const supabase = await createStaffClient();
  const { error } = await supabase.auth.signInWithPassword({ email: usernameToEmail(username), password });

  if (error) {
    if (error.status === 429) {
      return { status: "error", message: RATE_LIMITED_MESSAGE, username };
    }
    if (error.code !== "invalid_credentials" && error.code !== "email_not_confirmed") {
      console.error("login staf gagal", { code: error.code, status: error.status });
    }
    return { status: "error", message: WRONG_CREDENTIALS, username };
  }

  redirect("/staf");
}
