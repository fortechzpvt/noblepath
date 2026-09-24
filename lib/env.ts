import { z } from "zod";

/**
 * Server-side environment configuration.
 *
 * SERVER ONLY. Never import this module from a client component: it reads
 * variables that are not prefixed with `NEXT_PUBLIC_` and are therefore
 * undefined in the browser, and in production it throws when they are missing.
 *
 * Validation runs once at module load so that a misconfigured deployment fails
 * immediately and visibly. The specific failure this prevents is an unset
 * `BOOKINGS_NOTIFICATION_EMAIL`: without it a booking enquiry is accepted,
 * given a reference code, shown as a success to the traveller — and then goes
 * nowhere. That is invisible from both ends, which makes it the worst kind of
 * bug to ship. Raised by the DevOps Engineer's deployment review.
 *
 * `RESEND_API_KEY` (D-23) fails the same way for the same reason: unset in
 * production, the booking form still shows a success screen while `/api/bookings`
 * quietly returns 503 instead of ever calling Resend — a second, independent
 * path to the exact same silent-lead-loss failure `BOOKINGS_NOTIFICATION_EMAIL`
 * already guards against, so it gets the same hard-fail treatment.
 *
 * Values are never logged. Only the *names* of missing or invalid variables
 * appear in the error, because the values are credentials or contact details.
 */

const DEFAULT_RATE_LIMIT_MAX = 5;
const DEFAULT_RATE_LIMIT_WINDOW_MS = 600_000; // 10 minutes

const positiveInt = (fallback: number) =>
  z.preprocess(
    (value) => (typeof value === "string" && value.trim() !== "" ? Number(value) : value),
    z.number().int().positive().default(fallback),
  );

const serverEnvSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    NEXT_PUBLIC_SITE_URL: z.url({
      message: "must be an absolute URL, for example https://noblepath.lk",
    }),
    /** Where booking enquiries are delivered. Required in production — see above. */
    BOOKINGS_NOTIFICATION_EMAIL: z
      .email({ message: "must be a valid email address" })
      .optional(),
    /**
     * Resend's secret API key. Required in production; optional in
     * development so the rest of the app works without a real Resend
     * account — `/api/bookings` answers 503 instead when it is unset
     * outside production (see the route handler).
     */
    RESEND_API_KEY: z
      .string()
      .min(1, { message: "must not be empty" })
      .optional(),
    /**
     * The "from" address for outgoing mail. Resend's shared sandbox sender
     * (`onboarding@resend.dev`) works with no domain verification, but Resend
     * restricts sandbox sending to the account's own verified address — real
     * delivery to `BOOKINGS_NOTIFICATION_EMAIL` needs a verified sending
     * domain in the Resend dashboard first. That is an operational step, not
     * something this file can validate; see docs/deployment/environment.md.
     */
    RESEND_FROM_EMAIL: z
      .email({ message: "must be a valid email address" })
      .default("onboarding@resend.dev"),
    BOOKING_RATE_LIMIT_MAX: positiveInt(DEFAULT_RATE_LIMIT_MAX),
    BOOKING_RATE_LIMIT_WINDOW_MS: positiveInt(DEFAULT_RATE_LIMIT_WINDOW_MS),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === "production" && !env.BOOKINGS_NOTIFICATION_EMAIL) {
      ctx.addIssue({
        code: "custom",
        path: ["BOOKINGS_NOTIFICATION_EMAIL"],
        message: "is required in production, otherwise booking enquiries are accepted and discarded",
      });
    }
    if (env.NODE_ENV === "production" && !env.RESEND_API_KEY) {
      ctx.addIssue({
        code: "custom",
        path: ["RESEND_API_KEY"],
        message: "is required in production, otherwise booking enquiries are accepted and never sent",
      });
    }
  });

export type ServerEnv = z.output<typeof serverEnvSchema>;

const FALLBACK_ENV: ServerEnv = {
  NODE_ENV: "development",
  NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
  RESEND_FROM_EMAIL: "onboarding@resend.dev",
  BOOKING_RATE_LIMIT_MAX: DEFAULT_RATE_LIMIT_MAX,
  BOOKING_RATE_LIMIT_WINDOW_MS: DEFAULT_RATE_LIMIT_WINDOW_MS,
};

function loadServerEnv(): ServerEnv {
  const parsed = serverEnvSchema.safeParse({
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    BOOKINGS_NOTIFICATION_EMAIL: process.env.BOOKINGS_NOTIFICATION_EMAIL || undefined,
    RESEND_API_KEY: process.env.RESEND_API_KEY || undefined,
    RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL || undefined,
    BOOKING_RATE_LIMIT_MAX: process.env.BOOKING_RATE_LIMIT_MAX,
    BOOKING_RATE_LIMIT_WINDOW_MS: process.env.BOOKING_RATE_LIMIT_WINDOW_MS,
  });

  if (parsed.success) return parsed.data;

  const problems = parsed.error.issues
    .map((issue) => `${issue.path.join(".") || "(root)"} ${issue.message}`)
    .join("; ");

  if (process.env.NODE_ENV === "production") {
    throw new Error(`Invalid server environment configuration: ${problems}`);
  }

  console.warn(
    `[noble-path] Environment configuration is incomplete: ${problems}. ` +
      "Falling back to development defaults. This would abort startup in production.",
  );
  return FALLBACK_ENV;
}

export const serverEnv: ServerEnv = loadServerEnv();

/** True when this process is serving the production site. */
export const isProduction = serverEnv.NODE_ENV === "production";

/**
 * Non-production deployments must not be indexed by search engines.
 *
 * Keyed off the configured site URL rather than `NODE_ENV`, because a staging
 * deployment is a production *build*. A blanket `robots.txt` is deliberately
 * not used: it would ship to production too.
 */
export const PRODUCTION_SITE_URL = "https://noblepath.lk";
export const shouldDiscourageIndexing: boolean =
  serverEnv.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "") !== PRODUCTION_SITE_URL;
