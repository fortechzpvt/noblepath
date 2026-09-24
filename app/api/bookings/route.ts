import { NextResponse, type NextRequest } from "next/server";
import { Resend } from "resend";

import { buildBookingEmail } from "@/lib/booking-email";
import { generateBookingRequestId } from "@/lib/booking-request";
import { serverEnv } from "@/lib/env";
import { checkRateLimit } from "@/lib/rate-limit";
import type { ApiErrorBody, ApiErrorCode, BookingResponse } from "@/lib/types";
import { bookingDraftRequestSchema, toBookingDraftEnquiry, toFieldErrors } from "@/lib/validation";

/**
 * `POST /api/bookings` — the only write endpoint (D-19, D-23).
 *
 * Runs on the Node.js runtime (the default for a route handler, made explicit
 * here): it needs the global Web Crypto `crypto.getRandomValues`
 * (`generateBookingRequestId`) and the Resend SDK, both of which work on
 * Node.js. See `docs/api/endpoints.md` for the full contract and
 * `docs/agents/handoffs.md` for the handoff to the Cybersecurity Agent this
 * endpoint is waiting on before it is considered reviewed.
 */
export const runtime = "nodejs";

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

function errorResponse(
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
function clientKey(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const parts = forwarded?.split(",").map((part) => part.trim()).filter(Boolean) ?? [];
  const last = parts[parts.length - 1];
  return last && last.length > 0 ? last : "unknown";
}

function methodNotAllowed(): NextResponse {
  const correlationId = crypto.randomUUID();
  const response = errorResponse(405, "method_not_allowed", "This endpoint only accepts POST.", correlationId);
  response.headers.set("Allow", "POST");
  return response;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const correlationId = crypto.randomUUID();

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

  // 4. Schema validation — the authoritative check (lib/validation.ts).
  const parsed = bookingDraftRequestSchema.safeParse(json);
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

  const enquiry = toBookingDraftEnquiry(parsed.data);
  const id = generateBookingRequestId();

  // 6. Delivery configuration. `lib/env.ts` hard-fails production startup if
  // either of these is unset, so reaching this branch at all means a
  // development environment without a real Resend account configured — the
  // rest of the app must still be usable in that state, so this is a
  // graceful 503, not a crash.
  if (!serverEnv.RESEND_API_KEY || !serverEnv.BOOKINGS_NOTIFICATION_EMAIL) {
    console.warn(
      `[bookings] Delivery is not configured (RESEND_API_KEY or BOOKINGS_NOTIFICATION_EMAIL unset); ` +
        `refusing booking ${id} (correlation ${correlationId}).`,
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
  const { subject, text } = buildBookingEmail(enquiry, id);
  try {
    const resend = new Resend(serverEnv.RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from: serverEnv.RESEND_FROM_EMAIL,
      to: serverEnv.BOOKINGS_NOTIFICATION_EMAIL,
      replyTo: enquiry.traveller.email,
      subject,
      text,
    });
    if (error) {
      console.error(
        `[bookings] Resend rejected booking ${id} (correlation ${correlationId}): ${error.name} — ${error.message}`,
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
      `[bookings] Resend call threw for booking ${id} (correlation ${correlationId}): ` +
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

// Every other method gets the same structured error envelope every route on
// this API uses, rather than Next's bare default 405.
export async function GET(): Promise<NextResponse> {
  return methodNotAllowed();
}
export async function PUT(): Promise<NextResponse> {
  return methodNotAllowed();
}
export async function PATCH(): Promise<NextResponse> {
  return methodNotAllowed();
}
export async function DELETE(): Promise<NextResponse> {
  return methodNotAllowed();
}
