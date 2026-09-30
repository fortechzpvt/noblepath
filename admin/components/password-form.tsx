"use client";

import { useActionState } from "react";

import { changePassword, type PasswordState } from "@/app/(panel)/account/actions";
import { Button, Field, Notice, inputClass } from "@/components/ui";

export function PasswordForm() {
  const [state, action, pending] = useActionState<PasswordState, FormData>(changePassword, {});
  return (
    <form action={action} className="max-w-sm space-y-4">
      {state.error ? <Notice tone="error">{state.error}</Notice> : null}
      {state.done ? <Notice tone="success">Password changed. Other sessions were signed out.</Notice> : null}
      <Field label="Current password" htmlFor="current">
        <input id="current" name="current" type="password" autoComplete="current-password" required className={inputClass} />
      </Field>
      <Field label="New password" htmlFor="next" hint="At least 14 characters. A passphrase of four or more words works well.">
        <input id="next" name="next" type="password" autoComplete="new-password" minLength={14} required className={inputClass} />
      </Field>
      <Field label="New password again" htmlFor="confirm">
        <input id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={14} required className={inputClass} />
      </Field>
      <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Change password"}</Button>
    </form>
  );
}
