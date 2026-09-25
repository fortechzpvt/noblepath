import { NextResponse, type NextRequest } from "next/server";

import { clientKey, errorResponse } from "@/lib/enquiry-endpoint";
import { PlaceLookupError } from "@/lib/places";
import { createRateLimiter } from "@/lib/rate-limit";

/**
 * Shared guards for the read-only place endpoints (D-25):
 * `GET /api/places/search` and `GET /api/places/reverse`.
 *
 * Their per-client limit is looser than the booking limit — a traveller
 * searching types several queries — and is a **separate limiter with its own
 * store** (F-9), so searching can never use up, sweep or evict the requests a
 * traveller needs to submit their booking.
 */
const placesLimiter = createRateLimiter({ max: 60, windowMs: 60_000 });

/**
 * These endpoints exist only for our own pages. A browser sends
 * `Sec-Fetch-Site` (and `Origin` on cross-site requests), so a hostile page
 * cannot make its visitors' browsers spend our shared upstream allowance
 * (security review D-25, F-10). Requests without these headers (curl, old
 * browsers) are allowed — they still face the per-client and upstream limits.
 */
export function crossSiteRejected(request: NextRequest, correlationId: string): NextResponse | null {
  const site = request.headers.get("sec-fetch-site");
  const origin = request.headers.get("origin");
  const sameOrigin =
    (site === null || site === "same-origin" || site === "none") &&
    (origin === null || origin === request.nextUrl.origin);
  if (sameOrigin) return null;
  return errorResponse(403, "forbidden", "This endpoint is only for Noble Path pages.", correlationId);
}

/** Returns a 429 response when the client is over its place-lookup limit, otherwise `null`. */
export function placesRateLimited(request: NextRequest, correlationId: string): NextResponse | null {
  const limit = placesLimiter.check(clientKey(request));
  if (limit.allowed) return null;
  const response = errorResponse(
    429,
    "rate_limited",
    "Too many searches. Please wait a minute and try again.",
    correlationId,
  );
  response.headers.set("Retry-After", String(limit.retryAfterSeconds));
  return response;
}

/**
 * Maps a failed upstream lookup to a 503. The provider's own error is never
 * forwarded; the traveller can still type a place and pin it on the map.
 */
export function lookupFailed(tag: string, error: unknown, correlationId: string): NextResponse {
  const reason = error instanceof PlaceLookupError ? error.reason : "unexpected";
  console.warn(`[${tag}] Place lookup failed (${reason}, correlation ${correlationId}).`);
  return errorResponse(
    503,
    "lookup_unavailable",
    "Place search is not available right now. You can still type the place or tap the map.",
    correlationId,
  );
}
