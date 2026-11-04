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

      <label htmlFor="email" className="block font-semibold">
        Email
      </label>
      <StaffInput
        id="email"
        name="email"
        type="email"
        autoComplete="username"
        placeholder="perawat@praktik.id"
        defaultValue={state.status === "error" ? state.email : undefined}
        aria-invalid={fieldErrors?.email ? true : undefined}
        aria-describedby={fieldErrors?.email ? "email-error" : undefined}
        className="mt-2"
        required
      />
      <FieldError id="email-error" message={fieldErrors?.email} />

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
