"use client";

import { useActionState } from "react";

import { signIn, verifyCode, type FormState } from "@/app/login/actions";
import { Button, Field, Notice, inputClass } from "@/components/ui";

export function PasswordForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(signIn, {});
  return (
    <form action={action} className="space-y-4">
      {state.error ? <Notice tone="error">{state.error}</Notice> : null}
      <Field label="Email" htmlFor="email">
        <input id="email" name="email" type="email" autoComplete="username" required className={inputClass} />
      </Field>
      <Field label="Password" htmlFor="password">
        <input id="password" name="password" type="password" autoComplete="current-password" required className={inputClass} />
      </Field>
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Checking…" : "Continue"}
      </Button>
    </form>
  );
}

export function CodeForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(verifyCode, {});
  return (
    <form action={action} className="space-y-4">
      {state.error ? <Notice tone="error">{state.error}</Notice> : null}
      <Field label="6-digit code" htmlFor="code" hint="From your authenticator app. Each code works once.">
        <input
          id="code"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9 ]{6,7}"
          maxLength={7}
          required
          autoFocus
          className={`${inputClass} text-center font-mono text-lg tracking-[0.4em]`}
        />
      </Field>
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Verifying…" : "Sign in"}
      </Button>
    </form>
  );
}
