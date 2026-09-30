import "server-only";

import { z } from "zod";

/**
 * Admin environment (D-36). Read on first use rather than at import, so
 * `next build` needs no secrets; a request with a missing or malformed value
 * fails loudly. Values are never logged, only the names of bad variables.
 */
const schema = z.object({
  /** np_admin connection string for Aiven (admin/db/roles.sql). */
  DATABASE_URL: z.string().regex(/^postgres(ql)?:\/\//, { message: "must be a postgres:// URL" }),
  /** 32 random bytes, base64: `openssl rand -base64 32`. Encrypts the TOTP secret. */
  ADMIN_ENCRYPTION_KEY: z
    .string()
    .refine((value) => Buffer.from(value, "base64").length === 32, { message: "must be 32 bytes, base64-encoded" }),
  /** The public site, for previews and "view on site" links. */
  PUBLIC_SITE_URL: z.url().default("https://noblepath.lk"),
  /** Vercel (or other) deploy hook that rebuilds the public site. Optional: without it, Publish is disabled. */
  SITE_DEPLOY_HOOK_URL: z.url().optional(),
});

export type AdminEnv = z.output<typeof schema>;

let cached: AdminEnv | undefined;

export function env(): AdminEnv {
  if (cached) return cached;
  const parsed = schema.safeParse({
    DATABASE_URL: process.env.DATABASE_URL,
    ADMIN_ENCRYPTION_KEY: process.env.ADMIN_ENCRYPTION_KEY,
    PUBLIC_SITE_URL: process.env.PUBLIC_SITE_URL || undefined,
    SITE_DEPLOY_HOOK_URL: process.env.SITE_DEPLOY_HOOK_URL || undefined,
  });
  if (!parsed.success) {
    const names = parsed.error.issues.map((issue) => `${issue.path.join(".")} ${issue.message}`).join("; ");
    throw new Error(`Admin environment is not configured: ${names}`);
  }
  cached = parsed.data;
  return cached;
}
