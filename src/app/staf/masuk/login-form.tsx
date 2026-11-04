"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { FieldError, StaffInput } from "@/components/staff/field";
import { loginAction, type LoginState } from "./actions";

export function LoginForm() {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(loginAction, { status: "idle" });
  const fieldErrors = state.status === "error" ? state.fieldErrors : undefined;

  return (
    <form action={formAction} noValidate className="mt-6">
      {state.status === "error" && state.message ? (
        <p role="alert" className="mb-4 rounded-xl bg-noshow-bg px-4 py-3 text-sm text-noshow-fg">
          {state.message}
        </p>
      ) : null}

      <label htmlFor="username" className="block font-semibold">
        Username
      </label>
      <StaffInput
        id="username"
        name="username"
        type="text"
        autoComplete="username"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        maxLength={32}
        placeholder="mis. perawat.ayu"
        defaultValue={state.status === "error" ? state.username : undefined}
        aria-invalid={fieldErrors?.username ? true : undefined}
        aria-describedby={fieldErrors?.username ? "username-error" : undefined}
        className="mt-2"
        required
      />
      <FieldError id="username-error" message={fieldErrors?.username} />

      <label htmlFor="password" className="mt-5 block font-semibold">
        Kata sandi
      </label>
      <StaffInput
        id="password"
        name="password"
        type="password"
        autoComplete="current-password"
        aria-invalid={fieldErrors?.password ? true : undefined}
        aria-describedby={fieldErrors?.password ? "password-error" : undefined}
        className="mt-2"
        required
      />
      <FieldError id="password-error" message={fieldErrors?.password} />

      <Button type="submit" className="mt-6 font-semibold" disabled={pending}>
        {pending ? "Memeriksa…" : "Masuk"}
      </Button>
    </form>
  );
}
