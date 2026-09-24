# Noble Path — API Endpoints

**Status:** Current as of D-23 (2026-09-23).

One endpoint exists. It is public (no authentication — there are no accounts
in v1) and is the only place a request from the browser writes anything.
See `docs/api/api-overview.md` for conventions shared across every route
(error shape, rate limiting, `no-store`), and D-19/D-23 in
`docs/decisions/architecture-decisions.md` for the reasoning behind the
design choices below.

---

## `POST /api/bookings`

Submits a booking request (FR-5). On success, the request is emailed to
Noble Path staff via Resend; nothing is persisted to a database (v1 has
none — the email **is** the record, see D-23's known limitations).

### Request

- `Content-Type: application/json` (anything else → `415`).
- Body ≤ 50 KB (anything larger → `413`, rejected before it is read).
- Body shape: the traveller-facing `BookingDraft` type in
  `lib/booking-request.ts`, sent essentially as-is. Full validation lives in
  `lib/validation.ts`'s `bookingDraftRequestSchema` — that is the source of
  truth for every field's constraints; this page gives the shape and the
  behaviours that are not obvious from reading the schema.

```jsonc
{
  "traveller": {
    "fullName": "Asha Fernando",
    "nationality": "Sri Lankan",
    "email": "asha@example.com",
    "phone": "+94 77 123 4567",
    "adults": "2", "children": "0", "infants": "0",
    "specialRequirements": ""
  },
  "dates": {
    "arrivalDate": "2026-11-01", "arrivalTime": "10:00",
    "departureDate": "2026-11-10", "departureTime": "16:00"
  },
  "pickup": { "required": true, "airport": "CMB", "vehicle": "van", "passengers": "2", "luggage": "3" },
  "drop":   { "required": false, "airport": "", "vehicle": null, "passengers": "", "luggage": "" },
  "planChoice": "custom",
  "packageSlug": "",
  "customMode": "choose",
  "stays": [
    { "id": "stay1", "destination": "kandy", "tier": "mid-range", "kind": "hotel",
      "checkIn": "2026-11-02", "checkOut": "2026-11-04", "roomType": "Double",
      "guests": "2", "accommodationSlug": "" }
  ],
  "activities": [],
  "transport": [],
  "preferences": { "destinations": [], "tier": "", "kind": "", "interests": [], "vehicle": null, "budget": "", "days": "", "requests": "" },
  "plannedItinerary": null,
  "website": ""
}
```

Notes on specific fields:

- **`website`** is a honeypot. It must be sent (the schema defaults it to
  `""` if omitted) but must always be empty for a real traveller — the field
  it binds to in the form is hidden from sighted and assistive-technology
  users alike. A non-empty value does **not** fail validation; see "Honeypot
  behaviour" below.
- **Slugs are re-validated against live content.** `stays[].destination`,
  `stays[].accommodationSlug`, `activities[].activity` /
  `sourceActivitySlug`, `packageSlug`, `preferences.destinations[]` and
  `plannedItinerary.destinationSlugs[]` are all checked against
  `lib/content.ts` — an unrecognised or stale slug fails validation rather
  than silently passing through into the notification email.
- **Every object is strict.** An unknown key anywhere in the body fails the
  whole request (`400`), rather than being ignored.

### Responses

| Status | `error.code` | Meaning |
| --- | --- | --- |
| `200` | — | `{ "id": "NP-YYYYMMDD-XXXXXX" }`. The reference the traveller sees on screen. Also returned, identically, when the honeypot was filled (see below) — a bot cannot distinguish the two. |
| `400` | `invalid_json` | The body was not valid JSON. |
| `400` | `validation_failed` | Schema validation failed. `error.fields` is `{ "<dotted.path>": "<message>" }`, one message per field, written for a traveller to read and never echoing what was submitted. |
| `413` | `payload_too_large` | Body exceeds 50 KB, or `Content-Length` was missing/invalid. |
| `415` | `invalid_content_type` | `Content-Type` was not `application/json`. |
| `429` | `rate_limited` | Rate limit exceeded for this client (see below). Response carries a `Retry-After` header, in seconds. |
| `502` | `delivery_failed` | Resend rejected the send, or the call to it threw. The provider's own error text is never forwarded to the client — only logged server-side against a correlation id. |
| `503` | `delivery_unavailable` | `RESEND_API_KEY` or `BOOKINGS_NOTIFICATION_EMAIL` is not configured. In production this cannot happen — `lib/env.ts` refuses to start without them. Reachable only in a development environment with no Resend account configured, so the rest of the app stays usable without one. |
| `405` | `method_not_allowed` | Any method other than `POST`. Carries an `Allow: POST` header. |

Every non-`200` response is the shared envelope from `lib/types.ts`:

```jsonc
{
  "error": { "code": "validation_failed", "message": "Please check the details and try again.", "fields": { "traveller.email": "Enter a valid email address." } },
  "correlationId": "b2433d1e-dd7d-45e8-893d-e2fd3b8e7a32"
}
```

`correlationId` is also written to the server log alongside any failure
detail — quote it to support rather than any raw message the client might
have seen, since client-facing messages are intentionally generic for
`502`/`503`.

### Honeypot behaviour

A filled `website` field is treated as a bot, not a validation failure: the
request is answered with an ordinary `200` and a freshly generated `id`, but
**no email is sent**. This is deliberate — failing the field would return a
`400` naming exactly which field and rule to leave blank next time, which
defeats the point of a honeypot. From outside, a honeypot-triggered response
is indistinguishable from a genuine success.

### Rate limiting

Sliding window, in-memory (`lib/rate-limit.ts`), keyed on the **last** entry of
`X-Forwarded-For` (falls back to a single shared bucket if absent, e.g. a
direct connection in local development — this fails toward *more*
restrictive behaviour, not less). The last entry, not the first, is used
deliberately (fixed during the Cybersecurity review of D-23): the first
entry is whatever the connecting client sent and is entirely
attacker-controlled — keying on it let a single caller defeat the limiter
completely by sending a fresh, fabricated value on every request, not merely
weaken it the way the documented per-instance caveat below already
describes. The last entry is the value appended by the trusted reverse proxy
that terminates the client connection (Vercel's edge network, in this
project's deployment target), which an external caller cannot forge, for as
long as exactly one such trusted hop sits in front of the app — **this
assumption has not been verified against a real Vercel deployment**, since
none exists yet; confirm it before relying on this in production. Limit and
window are `BOOKING_RATE_LIMIT_MAX` / `BOOKING_RATE_LIMIT_WINDOW_MS` (default
5 requests per 10 minutes — see `docs/deployment/environment.md` §2.3–2.4).
Counters are **per server
instance**: the real-world ceiling in a horizontally-scaled deployment is
`MAX × live instances`, not `MAX`. See `docs/troubleshooting/troubleshooting.md`
§6.

### Security notes

- No CORS headers are set. The endpoint is same-origin-only by default.
- `Cache-Control: no-store` (`next.config.ts`) — a cached write endpoint is a
  correctness bug as well as a security one.
- Runs on the Node.js runtime, not Edge (needs the Resend SDK and the global
  Web Crypto API for the reference id).
- Reviewed by the Cybersecurity Agent as part of D-23 — see
  `docs/agents/handoffs.md` and `docs/security/security-review.md` for the
  review record, not this page.
