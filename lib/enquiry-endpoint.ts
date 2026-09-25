import { NextResponse, type NextRequest } from "next/server";
import { Resend } from "resend";
import type { z } from "zod";

import { generateBookingRequestId } from "@/lib/booking-request";
import { serverEnv } from "@/lib/env";
import { checkRateLimit } from "@/lib/rate-limit";
import type { ApiErrorBody, ApiErrorCode, BookingResponse } from "@/lib/types";
import { toFieldErrors } from "@/lib/validation";

/**
 * The shared request pipeline behind every public enquiry endpoint
 * (`POST /api/bookings`, D-23, and `POST /api/rides`, D-24).
 *
 * Extracted from the original `/api/bookings` handler unchanged in behaviour,
 * so a second endpoint gets the exact guards the Cybersecurity review signed
 * off on rather than a copy that could drift: size guard → rate limit →
 * content type → JSON → schema → honeypot → delivery. Both endpoints share one
 * rate-limit bucket per client (same `checkRateLimit` store, same key), so
 * adding an endpoint does not double what a single caller can send.
 */

/**
 * This form has no file uploads; 50 KB is generous for the richest possible
 * draft (every array field at its `MAX_*` cap, every string field at its max
 * length) and rejects an oversized body before it is even parsed.
 */
const MAX_BODY_BYTES = 50_000;

function errorBody(
  code: ApiErrorCode,
  message: string,
  correlationId: string,
  fields?: Record<string, string>,
): ApiErrorBody {
  return { error: { code, message, ...(fields ? { fields } : {}) }, correlationId };
}

export function errorResponse(
  status: number,
  code: ApiErrorCode,
  message: string,
  correlationId: string,
  fields?: Record<string, string>,
): NextResponse {
  return NextResponse.json(errorBody(code, message, correlationId, fields), { status });
}

/**
 * Best available client identifier for rate limiting.
 *
 * Uses the **last** entry of `x-forwarded-for`, not the first (fixed during
 * Cybersecurity review, D-23 handoff) — the first entry is whatever the
 * connecting client sent and is entirely attacker-controlled (confirmed by
 * sending a fresh, fabricated value on every request against a local
 * instance: the old `.split(",")[0]` implementation let every single request
 * land in its own empty rate-limit bucket, defeating the limiter completely
 * with no distributed infrastructure, not merely reducing it as the
 * documented "per-instance" caveat already accounted for). A reverse proxy
 * that terminates the client connection (Vercel's edge network, in this
 * project's deployment target — see `docs/deployment/deployment.md`) appends
 * the address it actually observed to the *end* of the header rather than
 * replacing it, so the last entry is the one value in this header an
 * external caller cannot forge, for as long as the app sits behind exactly
 * one such trusted hop. **This assumption is unverified against a real
 * Vercel deployment** (no production environment exists yet — see
 * `docs/agents/handoffs.md`); before this ships, DevOps should confirm
 * Vercel's edge network appends rather than forwards the client's own
 * `x-forwarded-for` unchanged, and if it does not, consider `x-real-ip` or
 * an equivalent single-value, platform-set header instead.
 *
 * The absence of any `x-forwarded-for` value (a direct connection in local
 * dev, or a proxy that strips it) falls every such request into one shared
 * bucket rather than skipping the limiter — failing toward *more*
 * restrictive behaviour, not less.
 */
export function clientKey(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const parts = forwarded?.split(",").map((part) => part.trim()).filter(Boolean) ?? [];
  const last = parts[parts.length - 1];
  return last && last.length > 0 ? last : "unknown";
}

export function methodNotAllowed(allow: "POST" | "GET" = "POST"): NextResponse {
  const correlationId = crypto.randomUUID();
  const response = errorResponse(405, "method_not_allowed", `This endpoint only accepts ${allow}.`, correlationId);
  response.headers.set("Allow", allow);
  return response;
}

export interface EnquiryEndpointConfig<Schema extends z.ZodType<{ website: string }>> {
  /** Prefix for server log lines, e.g. `"bookings"`. */
  readonly logTag: string;
  /** The authoritative request schema. Its output must carry the `website` honeypot. */
  readonly schema: Schema;
  /**
   * Builds the staff email from the validated request. The honeypot has
   * already been checked by the time this runs; the builder must still never
   * print `website`.
   */
  readonly buildEmail: (
    enquiry: z.output<Schema>,
    id: string,
  ) => { readonly subject: string; readonly text: string; readonly replyTo: string };
}

export async function handleEnquiryPost<Schema extends z.ZodType<{ website: string }>>(
  request: NextRequest,
  config: EnquiryEndpointConfig<Schema>,
): Promise<NextResponse> {
  const correlationId = crypto.randomUUID();
  const tag = `[${config.logTag}]`;

  // 1. Cheap size guard, before anything else touches the body.
  const contentLength = Number(request.headers.get("content-length") ?? "");
  if (!Number.isFinite(contentLength) || contentLength <= 0) {
    return errorResponse(400, "invalid_json", "That request could not be read.", correlationId);
  }
  if (contentLength > MAX_BODY_BYTES) {
    return errorResponse(413, "payload_too_large", "That request is too large.", correlationId);
  }

  // 2. Rate limit, before any parsing or validation work happens.
  const limit = checkRateLimit(clientKey(request));
  if (!limit.allowed) {
    const response = errorResponse(
      429,
      "rate_limited",
      "Too many requests. Please wait a few minutes and try again.",
      correlationId,
    );
    response.headers.set("Retry-After", String(limit.retryAfterSeconds));
    return response;
  }

  // 3. Content-Type and JSON parse.
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return errorResponse(
      415,
      "invalid_content_type",
      "This endpoint accepts application/json.",
      correlationId,
    );
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return errorResponse(400, "invalid_json", "That request could not be read.", correlationId);
  }

  // 4. Schema validation — the authoritative check.
  const parsed = config.schema.safeParse(json);
  if (!parsed.success) {
    return errorResponse(
      400,
      "validation_failed",
      "Please check the details and try again.",
      correlationId,
      toFieldErrors(parsed.error),
    );
  }

  // 5. Honeypot: a filled `website` field means a bot, not a traveller.
  // Answer with a normal-looking success and stop — never call Resend, never
  // log anything that would tell an attacker which check they tripped.
  if (parsed.data.website !== "") {
    const id = generateBookingRequestId();
    return NextResponse.json<BookingResponse>({ id }, { status: 200 });
  }

  const id = generateBookingRequestId();

  // 6. Delivery configuration. `lib/env.ts` hard-fails production startup if
  // either of these is unset, so reaching this branch at all means a
  // development environment without a real Resend account configured — the
  // rest of the app must still be usable in that state, so this is a
  // graceful 503, not a crash.
  if (!serverEnv.RESEND_API_KEY || !serverEnv.BOOKINGS_NOTIFICATION_EMAIL) {
    console.warn(
      `${tag} Delivery is not configured (RESEND_API_KEY or BOOKINGS_NOTIFICATION_EMAIL unset); ` +
        `refusing request ${id} (correlation ${correlationId}).`,
    );
    return errorResponse(
      503,
      "delivery_unavailable",
      "Booking requests cannot be sent right now. Please contact us directly.",
      correlationId,
    );
  }

  // 7. Compose and send. Never forward the provider's own error text to the
  // client — only a correlation id, which is what support uses to find the
  // matching server log line.
  const { subject, text, replyTo } = config.buildEmail(parsed.data, id);
  try {
    const resend = new Resend(serverEnv.RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from: serverEnv.RESEND_FROM_EMAIL,
      to: serverEnv.BOOKINGS_NOTIFICATION_EMAIL,
      replyTo,
      subject,
      text,
    });
    if (error) {
      console.error(
        `${tag} Resend rejected request ${id} (correlation ${correlationId}): ${error.name} — ${error.message}`,
      );
      return errorResponse(
        502,
        "delivery_failed",
        "We could not send your request right now. Please try again or contact us directly.",
        correlationId,
      );
    }
  } catch (err) {
    console.error(
      `${tag} Resend call threw for request ${id} (correlation ${correlationId}): ` +
        (err instanceof Error ? err.message : "unknown error"),
    );
    return errorResponse(
      502,
      "delivery_failed",
      "We could not send your request right now. Please try again or contact us directly.",
      correlationId,
    );
  }

  return NextResponse.json<BookingResponse>({ id }, { status: 200 });
}
