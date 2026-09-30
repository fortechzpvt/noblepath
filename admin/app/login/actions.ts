"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { audit } from "@/lib/audit";
import { DUMMY_HASH, verifyPassword } from "@/lib/auth/password";
import { open } from "@/lib/auth/secret-box";
import { createSession, destroySession, requireMfaPending } from "@/lib/auth/session";
import { LOCK_MINUTES, MAX_ACCOUNT_FAILURES, clientBlocked, clientHash, recordClientFailure } from "@/lib/auth/throttle";
import { checkTotp } from "@/lib/auth/totp";
import { db } from "@/lib/db";
import { env } from "@/lib/env";

export interface FormState {
  readonly error?: string;
}

/**
 * One message for every failure, so the form never reveals whether the email
 * exists, the password was close, or the account is locked (D-36).
 */
const FAILED = "That did not work. Check your details and try again. After several failed attempts, sign-in is paused for 15 minutes.";

const credentials = z.object({
  email: z.string().trim().toLowerCase().max(254),
  password: z.string().min(1).max(256),
});

interface UserRow {
  id: string;
  password_hash: string;
  locked_until: Date | null;
  totp_enabled: boolean;
  totp_secret_enc: string | null;
  totp_last_step: string;
  email: string;
}

async function registerFailure(userId: string | null, client: string, reason: string): Promise<void> {
  await recordClientFailure(client);
  if (userId) {
    await db().query(
      `update admin_users
          set failed_logins = failed_logins + 1,
              locked_until = case when failed_logins + 1 >= $2 then now() + make_interval(mins => $3) else locked_until end
        where id = $1`,
      [userId, MAX_ACCOUNT_FAILURES, LOCK_MINUTES],
    );
  }
  await audit(userId, "login.failed", undefined, { reason });
}

/** Step 1: email and password. */
export async function signIn(_previous: FormState, formData: FormData): Promise<FormState> {
  const client = await clientHash();
  if (await clientBlocked(client)) return { error: FAILED };

  const parsed = credentials.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { error: FAILED };

  const { rows } = await db().query<UserRow>("select * from admin_users where email = $1", [parsed.data.email]);
  const user = rows[0];
  // Always run scrypt, so an unknown email takes as long as a wrong password.
  const passwordOk = await verifyPassword(parsed.data.password, user?.password_hash ?? DUMMY_HASH);

  if (!user || !passwordOk) {
    await registerFailure(user?.id ?? null, client, user ? "password" : "unknown-email");
    return { error: FAILED };
  }
  if (user.locked_until && user.locked_until.getTime() > Date.now()) {
    await registerFailure(user.id, client, "locked");
    return { error: FAILED };
  }
  if (!user.totp_enabled || !user.totp_secret_enc) {
    // Two-factor is set up only by `npm run admin:create`, never on the web.
    await audit(user.id, "login.refused", undefined, { reason: "no-2fa" });
    return { error: "Two-factor sign-in is not set up for this account. Run `npm run admin:create -- --reset-2fa` on a trusted machine." };
  }

  await createSession(user.id, "mfa");
  redirect("/login/verify");
}

/** Step 2: the 6-digit code from the authenticator app. */
export async function verifyCode(_previous: FormState, formData: FormData): Promise<FormState> {
  const pending = await requireMfaPending();
  const client = await clientHash();
  if (await clientBlocked(client)) return { error: FAILED };

  const { rows } = await db().query<UserRow>("select * from admin_users where id = $1", [pending.id]);
  const user = rows[0];
  if (!user?.totp_secret_enc || (user.locked_until && user.locked_until.getTime() > Date.now())) {
    return { error: FAILED };
  }

  const secret = open(user.totp_secret_enc, env().ADMIN_ENCRYPTION_KEY);
  const step = checkTotp(secret, user.email, String(formData.get("code") ?? ""));
  // A code is good for one sign-in only: refuse a step at or before the last one used.
  if (step === null || step <= Number(user.totp_last_step)) {
    await registerFailure(user.id, client, step === null ? "code" : "code-reused");
    return { error: FAILED };
  }

  await db().query(
    `update admin_users
        set totp_last_step = $2, failed_logins = 0, locked_until = null, last_login_at = now()
      where id = $1`,
    [user.id, step],
  );
  // A fresh token for the signed-in session; the password-stage one is discarded.
  await destroySession();
  await createSession(user.id, "active");
  await audit(user.id, "login.succeeded");
  redirect("/");
}

export async function signOut(): Promise<void> {
  await destroySession();
  redirect("/login");
}
