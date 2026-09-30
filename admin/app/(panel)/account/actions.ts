"use server";

import { revalidatePath } from "next/cache";

import { audit } from "@/lib/audit";
import { hashPassword, passwordProblem, verifyPassword } from "@/lib/auth/password";
import { destroyOtherSessions, requireAdmin } from "@/lib/auth/session";
import { db } from "@/lib/db";

export interface PasswordState {
  readonly error?: string;
  readonly done?: boolean;
}

export async function changePassword(_previous: PasswordState, form: FormData): Promise<PasswordState> {
  const user = await requireAdmin();
  const current = String(form.get("current") ?? "");
  const next = String(form.get("next") ?? "");
  const confirm = String(form.get("confirm") ?? "");

  const { rows } = await db().query<{ password_hash: string }>("select password_hash from admin_users where id = $1", [user.id]);
  if (!rows[0] || !(await verifyPassword(current, rows[0].password_hash))) {
    await audit(user.id, "password.change-failed");
    return { error: "Your current password is not right." };
  }
  if (next !== confirm) return { error: "The new passwords do not match." };
  const problem = passwordProblem(next, user.email);
  if (problem) return { error: problem };

  await db().query("update admin_users set password_hash = $2, password_changed_at = now() where id = $1", [
    user.id,
    await hashPassword(next),
  ]);
  // Anyone signed in elsewhere with the old password is signed out.
  await destroyOtherSessions(user.id);
  await audit(user.id, "password.changed");
  return { done: true };
}

export async function signOutEverywhereElse(): Promise<void> {
  const user = await requireAdmin();
  await destroyOtherSessions(user.id);
  await audit(user.id, "sessions.revoked");
  revalidatePath("/account");
}
