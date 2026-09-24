# Noble Path — API Overview

**Status:** Current as of D-23 (2026-09-23). One route exists; see
`docs/api/endpoints.md` for its full contract. This page holds the
conventions that apply across every route on this API, referenced by name
from a couple of source comments (`lib/rate-limit.ts`, `lib/validation.ts`)
so those constraints have a documented home rather than living only in code.

## Conventions

- **Error shape.** Every non-2xx response is the same envelope:
  `{ error: { code, message, fields? }, correlationId }` (`ApiErrorBody` /
  `ApiErrorCode` in `lib/types.ts`). `message` is always written for the
  person who submitted the request, never a developer; `fields` (a flat
  `{ "path.to.field": "message" }` map) is only present for a validation
  failure. `correlationId` is also written to the server log next to any
  failure detail, so support can be handed one short id instead of a raw
  error message.
- **No secrets or PII in error responses.** A `502`/`503` never forwards a
  provider's own error text to the client — only a generic, traveller-facing
  message and a correlation id for the matching server log line.
- **Rate limiting is in-memory and per server instance**
  (`lib/rate-limit.ts`). The real-world ceiling in a horizontally-scaled
  deployment is `MAX × live instances`, not the configured `MAX`. This is an
  accepted v1 trade-off (see D-23) for an endpoint that creates an enquiry,
  not an account or a payment; before scaling horizontally, move this to a
  shared store (Redis or equivalent) keyed the same way.
- **Every write endpoint sets `Cache-Control: no-store`**
  (`next.config.ts`, matched on `/api/:path*`) — a cached write is a
  correctness bug as well as a security one.
- **No CORS.** Every route is same-origin-only by default; none currently
  need to be called from another origin.
- **Server-side validation is authoritative.** Any client-side check
  (`lib/booking-request.ts`'s `validateDraft`, for the one form that exists)
  is a convenience for the person filling it in, never a security control.
  The server repeats every check independently against untrusted input.

## Routes

| Method | Path | Purpose | Docs |
| --- | --- | --- | --- |
| `POST` | `/api/bookings` | Submit a booking request (FR-5) | `docs/api/endpoints.md` |
