/**
 * Creates the admin account, or resets its password or two-step verification (D-36).
 *
 *   DATABASE_URL=… DATABASE_CA_CERT=… ADMIN_ENCRYPTION_KEY=… npm run admin:create
 *   npm run admin:create -- --reset-password
 *   npm run admin:create -- --reset-2fa
 *
 * Run it on a trusted computer. Everything is typed in at prompts (never as
 * arguments, which end up in shell history). Two-step verification is only
 * ever set up here, never in the web app, so someone who learns the password
 * cannot enrol their own authenticator.
 *
 * Noble Path has one admin account; creating a second is refused.
 */
import { createInterface } from "node:readline";

import { Client } from "pg";
import QRCode from "qrcode";

import { hashPassword, passwordProblem } from "../lib/auth/password";
import { seal } from "../lib/auth/secret-box";
import { checkTotp, newTotpSecret, totpUri } from "../lib/auth/totp";
import { pgConfig } from "../lib/pg-config";

const resetPassword = process.argv.includes("--reset-password");
const reset2fa = process.argv.includes("--reset-2fa");

function ask(question: string, hidden = false): Promise<string> {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (hidden) {
      // Print the prompt, then swallow the echo of what is typed.
      const output = rl as unknown as { _writeToOutput: (text: string) => void };
      let prompted = false;
      output._writeToOutput = (text: string) => {
        if (!prompted) {
          process.stdout.write(text);
          prompted = true;
        }
      };
    }
    rl.question(question, (answer) => {
      rl.close();
      if (hidden) process.stdout.write("\n");
      resolve(answer.trim());
    });
  });
}

async function newPassword(email: string): Promise<string> {
  for (;;) {
    const password = await ask("New password (at least 14 characters, hidden): ", true);
    const problem = passwordProblem(password, email);
    if (problem) {
      console.log(`  ${problem}`);
      continue;
    }
    if ((await ask("Same password again: ", true)) !== password) {
      console.log("  They did not match.");
      continue;
    }
    return password;
  }
}

async function enrolTotp(email: string): Promise<{ sealed: string; step: number }> {
  const key = process.env.ADMIN_ENCRYPTION_KEY;
  if (!key || Buffer.from(key, "base64").length !== 32) {
    throw new Error("Set ADMIN_ENCRYPTION_KEY to the same 32-byte base64 value the admin app uses.");
  }
  const secret = newTotpSecret();
  const uri = totpUri(secret, email);
  console.log("\nScan this with an authenticator app (Google Authenticator, 1Password, Authy, Microsoft Authenticator):\n");
  console.log(await QRCode.toString(uri, { type: "terminal", small: true }));
  console.log(`Or enter this key by hand: ${secret.replace(/(.{4})/g, "$1 ").trim()}\n`);
  for (;;) {
    const code = await ask("Type the 6-digit code the app shows now: ");
    const step = checkTotp(secret, email, code);
    if (step !== null) return { sealed: seal(secret, key), step };
    console.log("  That code did not match. Check the phone's clock is automatic and try the next code.");
  }
}

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Set DATABASE_URL (the np_admin connection string).");
  const client = new Client(pgConfig(url));
  await client.connect();
  try {
    const { rows } = await client.query<{ id: string; email: string }>("select id, email from admin_users");
    const existing = rows[0];

    if (resetPassword || reset2fa) {
      if (!existing) throw new Error("There is no admin account yet. Run without flags to create it.");
      console.log(`Admin account: ${existing.email}`);
      if (resetPassword) {
        const hash = await hashPassword(await newPassword(existing.email));
        await client.query(
          "update admin_users set password_hash = $2, password_changed_at = now(), failed_logins = 0, locked_until = null where id = $1",
          [existing.id, hash],
        );
      }
      if (reset2fa) {
        const { sealed, step } = await enrolTotp(existing.email);
        await client.query("update admin_users set totp_secret_enc = $2, totp_enabled = true, totp_last_step = $3 where id = $1", [
          existing.id,
          sealed,
          step,
        ]);
      }
      // Whatever was reset, every existing session is ended.
      await client.query("delete from admin_sessions where user_id = $1", [existing.id]);
      await client.query("insert into audit_log (user_id, action) values ($1, $2)", [
        existing.id,
        resetPassword ? "password.reset-cli" : "2fa.reset-cli",
      ]);
      console.log("\nDone. All sessions were signed out.");
      return;
    }

    if (existing) throw new Error(`An admin account already exists (${existing.email}). Use --reset-password or --reset-2fa.`);
    const email = (await ask("Admin email: ")).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("That is not an email address.");
    const hash = await hashPassword(await newPassword(email));
    const { sealed, step } = await enrolTotp(email);
    const created = await client.query<{ id: string }>(
      `insert into admin_users (email, password_hash, totp_secret_enc, totp_enabled, totp_last_step)
       values ($1, $2, $3, true, $4) returning id`,
      [email, hash, sealed, step],
    );
    await client.query("insert into audit_log (user_id, action) values ($1, 'admin.created-cli')", [created.rows[0]!.id]);
    console.log(`\nCreated ${email}. Sign in at the admin site with this password and a code from the app.`);
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  console.error(`\n[admin:create] ${(error as Error).message}`);
  process.exit(1);
});
