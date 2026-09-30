import "server-only";

import { createHash, randomBytes } from "node:crypto";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";

/**
 * Server-side sessions (D-36).
 *
 * The cookie holds a random 256-bit token; the database holds only its
 * SHA-256, so a leaked database cannot be replayed as a login. `__Host-` pins
 * the cookie to this exact host over HTTPS with Path=/, and SameSite=Strict
 * keeps it off every cross-site request.
 *
 * Two stages: after the password, a short-lived `mfa` session that can do
 * nothing but submit an authenticator code; after the code, a fresh `active`
 * session (a new token, so a token seen before sign-in is never promoted).
 */
export const SESSION_COOKIE = "__Host-np_admin";

const MFA_TTL_MINUTES = 10;
const ACTIVE_TTL_HOURS = 12;
/** Signed out after this long with no activity, even within the 12 hours. */
const IDLE_MINUTES = 60;

export interface AdminUser {
  readonly id: string;
  readonly email: string;
  readonly totpEnabled: boolean;
}

interface SessionRow {
  stage: "mfa" | "active";
  last_seen_at: Date;
  user_id: string;
  email: string;
  totp_enabled: boolean;
}

const hashToken = (token: string) => createHash("sha256").update(token).digest();

export async function createSession(userId: string, stage: "mfa" | "active"): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const ttlSeconds = stage === "mfa" ? MFA_TTL_MINUTES * 60 : ACTIVE_TTL_HOURS * 3600;
  const userAgent = ((await headers()).get("user-agent") ?? "").slice(0, 300);
  await db().query(
    `insert into admin_sessions (token_hash, user_id, stage, expires_at, user_agent)
     values ($1, $2, $3, now() + make_interval(secs => $4), $5)`,
    [hashToken(token), userId, stage, ttlSeconds, userAgent],
  );
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/",
    maxAge: ttlSeconds,
  });
}

async function readSession(): Promise<(SessionRow & { tokenHash: Buffer }) | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token || token.length > 100) return null;
  const tokenHash = hashToken(token);
  const { rows } = await db().query<SessionRow>(
    `select s.stage, s.last_seen_at, u.id as user_id, u.email, u.totp_enabled
       from admin_sessions s join admin_users u on u.id = s.user_id
      where s.token_hash = $1 and s.expires_at > now()`,
    [tokenHash],
  );
  const row = rows[0];
  if (!row) return null;
  if (row.stage === "active" && Date.now() - row.last_seen_at.getTime() > IDLE_MINUTES * 60_000) {
    await db().query("delete from admin_sessions where token_hash = $1", [tokenHash]);
    return null;
  }
  // Touch at most once a minute, to keep writes down.
  if (Date.now() - row.last_seen_at.getTime() > 60_000) {
    await db().query("update admin_sessions set last_seen_at = now() where token_hash = $1", [tokenHash]);
  }
  return { ...row, tokenHash };
}

const toUser = (row: SessionRow): AdminUser => ({ id: row.user_id, email: row.email, totpEnabled: row.totp_enabled });

/**
 * The signed-in admin, or a redirect to the sign-in page. Every page, action
 * and route that touches data calls this: the proxy's cookie check is only a
 * fast first filter, never the authorisation itself.
 */
export async function requireAdmin(): Promise<AdminUser> {
  const session = await readSession();
  if (!session || session.stage !== "active") redirect("/login");
  return toUser(session);
}

/** The user who has passed the password step and still owes a code. */
export async function requireMfaPending(): Promise<AdminUser> {
  const session = await readSession();
  if (!session) redirect("/login");
  if (session.stage === "active") redirect("/");
  return toUser(session);
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) await db().query("delete from admin_sessions where token_hash = $1", [hashToken(token)]);
  store.delete(SESSION_COOKIE);
}

/** Signs out every other session of this user, e.g. after a password change. */
export async function destroyOtherSessions(userId: string): Promise<void> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  await db().query("delete from admin_sessions where user_id = $1 and token_hash <> $2", [
    userId,
    token ? hashToken(token) : Buffer.alloc(0),
  ]);
}
