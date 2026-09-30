import "server-only";

import { createHash } from "node:crypto";

import { headers } from "next/headers";

import { db } from "@/lib/db";
import { env } from "@/lib/env";

/**
 * Brute-force protection for sign-in (D-36), in two layers:
 * - per client: 10 failed attempts (passwords or codes) in 15 minutes blocks
 *   that client for the rest of the window, whatever account it tries;
 * - per account: 5 failures in a row lock the account for 15 minutes
 *   (`admin_users.locked_until`), even across many clients.
 *
 * Clients are identified by a keyed hash of the IP address; the IP itself is
 * never stored.
 */
const WINDOW_MINUTES = 15;
const MAX_CLIENT_FAILURES = 10;
export const MAX_ACCOUNT_FAILURES = 5;
export const LOCK_MINUTES = 15;

export async function clientHash(): Promise<string> {
  const forwarded = (await headers()).get("x-forwarded-for") ?? "";
  const parts = forwarded.split(",").map((part) => part.trim()).filter(Boolean);
  const ip = parts[parts.length - 1] ?? "unknown";
  return createHash("sha256").update(env().ADMIN_ENCRYPTION_KEY).update(ip).digest("base64url");
}

export async function clientBlocked(client: string): Promise<boolean> {
  const { rows } = await db().query<{ count: string }>(
    `select count(*) from login_attempts
      where client_hash = $1 and attempted_at > now() - make_interval(mins => $2)`,
    [client, WINDOW_MINUTES],
  );
  return Number(rows[0]?.count ?? 0) >= MAX_CLIENT_FAILURES;
}

export async function recordClientFailure(client: string): Promise<void> {
  await db().query("insert into login_attempts (client_hash) values ($1)", [client]);
  await db().query("delete from login_attempts where attempted_at < now() - interval '1 day'");
}
