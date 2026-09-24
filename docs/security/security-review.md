# Noble Path — Security Review

Reviews are appended chronologically, most recent first. Each review is scoped to a
specific handoff; it does not re-review code outside that handoff unless a finding
requires it.

---

## Review 2026-09-23 — Booking delivery connected: `POST /api/bookings` + Resend (D-23)

**Reviewer:** Cybersecurity / Application Security Agent
**Handoff reviewed:** "Full-Stack Engineer → Cybersecurity Agent: booking delivery
connected (2026-09-23)" in `docs/agents/handoffs.md`. This is the review D-19 named as a
precondition ("a Cybersecurity review is required before delivery is connected") and the
one the requester explicitly asked be done well ("it needs to be secured very well").
Reviewed adversarially against a running `npm run dev` instance, not read-only — see
"Verification results" for the concrete requests sent and what came back.

### Scope

`app/api/bookings/route.ts` (new), `lib/booking-email.ts` (new), `lib/validation.ts`
(rewritten — `bookingDraftRequestSchema`), `lib/env.ts` (+`RESEND_API_KEY`/
`RESEND_FROM_EMAIL`), `lib/booking-request.ts` (`DELIVERY_CONNECTED = true`,
`BookingSubmissionError`, honeypot field), `lib/types.ts` (error envelope),
`components/booking/booking-form.tsx` (honeypot input, submit error handling),
`next.config.ts` (`Cache-Control: no-store` on `/api/:path*`), `.env.example`,
`package.json`. Read via `git diff`/`git status` against the working tree (all changes
uncommitted at review time; `docs/decisions/architecture-decisions.md` D-23 read first for
the full design and alternatives).

### Checks performed (adversarial, against a running instance)

1. **Request size / DoS.** Lied `Content-Length` (small header, large actual body, raw
   socket); missing `Content-Length`; `Transfer-Encoding: chunked` with no
   `Content-Length`; deeply-nested JSON (8,000 levels, `{"a":{"a":...`, 48 KB) and a wide
   array (24,999-deep `[[[...]]]`, 49,999 bytes) right under the 50 KB cap; exact-boundary
   bodies at 50,000 and 50,001 bytes.
2. **Honeypot correctness.** Independent `curl` request with the honeypot field filled;
   compared response shape/status to a genuine submission; read the route handler to
   confirm no email is composed or sent on that path; measured response latency on both
   paths.
3. **Rate limit bypass.** Read `clientKey()` in `app/api/bookings/route.ts` and
   `lib/rate-limit.ts` in full; sent repeated requests from one process with a fresh,
   fabricated `X-Forwarded-For` value on every request.
4. **Email injection.** Confirmed the Resend call uses structured JSON fields
   (`from`/`to`/`replyTo`/`subject`/`text`), not string concatenation; confirmed `text`
   only (no `html`); read `sanitiseSubjectFragment`; confirmed every free-text field in
   `bookingDraftRequestSchema` has an explicit `.max()`.
5. **Schema completeness.** Confirmed `strictObject` at every level; sent a fabricated
   destination slug, a fabricated accommodation slug (real destination, fake property), an
   array one longer than `MAX_STAYS`, an unrecognised top-level key, and a client-supplied
   `id` field.
6. **Secret hygiene.** Grepped the full diff for `RESEND_API_KEY` handling; checked every
   `console.*` call in the changed files; confirmed `.env.local` is gitignored and holds no
   real credentials; inspected every non-2xx response body for provider/stack detail.
7. **CORS.** Sent a cross-origin `OPTIONS` preflight and a POST with a foreign `Origin`
   header; checked `next.config.ts` and the route for any `Access-Control-*` header.
8. **ID integrity.** Sent a request with a client-supplied `id` field; confirmed
   `generateBookingRequestId()` is the only source of the returned id and runs
   unconditionally server-side.
9. **Independent verification.** Ran `npm run lint`, `npm run typecheck`, and
   `npm run build` (with placeholder `RESEND_API_KEY`/`BOOKINGS_NOTIFICATION_EMAIL`,
   matching the engineer's own verification method) directly, rather than trusting the
   handoff's reported numbers; re-ran every response-path check myself against a live
   instance seeded with a syntactically-valid-but-fake Resend key so the real
   validation → honeypot → delivery-attempt path is genuinely exercised end to end
   (delivery itself fails at Resend's own auth check, which is expected and disclosed —
   no real Resend account was available, consistent with the handoff's own "not verified"
   note).

### Verification results

- `npm run lint` — clean.
- `npm run typecheck` (`tsc --noEmit`) — clean.
- `npm run build` — clean (required `BOOKINGS_NOTIFICATION_EMAIL`/`RESEND_API_KEY` supplied
  inline for the run only, never written to a file, matching the engineer's own method).
- Live-instance response paths, all confirmed directly by this reviewer:
  - Valid request → reaches the Resend call and gets `502 delivery_failed` (expected — the
    key used is syntactically valid but not a real account; confirms validation accepted a
    genuine request and only the unreachable external dependency failed).
  - Missing `traveller.email` → `400 validation_failed`,
    `fields: { "traveller.email": "Enter a valid email address." }`.
  - Fabricated `stays[0].destination` → `400`, `"Choose a destination."`.
  - Fabricated `stays[0].accommodationSlug` under a real destination → `400`,
    `"We do not recognise that property."` (the destination/accommodation cross-check
    holds).
  - 9 stays (`MAX_STAYS = 8`) → `400`, `"Too big: expected array to have <=8 items"`.
  - Unknown top-level key (`extraField`) → `400`, `"Unrecognized key: \"extraField\""`.
  - Client-supplied `id` field → `400`, `"Unrecognized key: \"id\""` (and even had it been
    accepted, `generateBookingRequestId()` runs unconditionally and ignores request body
    content — confirmed by reading the handler, not only by the strict-object rejection).
  - Malformed JSON → `400 invalid_json`.
  - Wrong `Content-Type` → `415 invalid_content_type`.
  - Body of exactly 50,000 bytes → passes the size guard, fails later as invalid JSON
    (`400`, not `413`); 50,001 bytes → `413 payload_too_large`. Boundary is exact.
  - Lied `Content-Length: 10` header followed by ~1 MB of streamed body (raw socket) →
    Node's own HTTP parser rejects the connection with `400 Bad Request` after a bounded
    overrun (under 1 MB observed), before the route handler's own guard even runs; the
    server stayed responsive throughout. The app-level 50 KB check trusts the header, but
    the underlying HTTP layer does not let a lied header buy an attacker an unbounded read
    — verified empirically, not assumed.
  - `Transfer-Encoding: chunked` with no `Content-Length`, and a request with neither
    header at all → both `400` immediately, body never read. The guard fails closed on
    both, exactly as `docs/api/endpoints.md` claims.
  - 48 KB of 8,000-deep nested JSON objects, and 49,999 bytes of 24,999-deep nested
    arrays, both under the 50 KB cap → both parsed and rejected in well under 100 ms
    (`400`, unrecognised/missing-field errors from the strict schema), no crash, no stack
    overflow, server remained responsive for a follow-up request immediately after.
  - Honeypot filled → `200`, `{ "id": "NP-..." }` — byte-for-byte the same shape and
    construction (`NextResponse.json<BookingResponse>({ id }, { status: 200 })`) the
    genuine-success branch uses; confirmed via the code that the honeypot branch returns
    before `buildBookingEmail` or `resend.emails.send` is ever reached, so no email is
    composed or attempted, not merely "not delivered."
  - Rate limit: 5 requests (matching `BOOKING_RATE_LIMIT_MAX=5`) from one client key
    succeed/fail through to the Resend call; the 6th gets `429 rate_limited` with a
    `Retry-After` header carrying a positive integer.
  - No `Access-Control-Allow-Origin` or other `Access-Control-*` header on any response,
    including a cross-origin `OPTIONS` preflight and a POST carrying a foreign `Origin`
    header.
- Server log (`console.*` output) inspected directly for every failure path exercised: the
  Resend SDK's own `[Resend API Error]` log and this route's own `[bookings] Resend
  rejected ...` line both include `error.name`/`error.message` from Resend's response
  object, never the API key itself, and never appear in the client-facing response body.

### Findings

**F-3 (High) — CONFIRMED and FIXED — rate limiter trivially bypassable by spoofing
`X-Forwarded-For`, beyond what the documented per-instance caveat discloses.**

`clientKey()` in `app/api/bookings/route.ts` took `forwarded?.split(",")[0]` — the
*first* entry of `X-Forwarded-For`. That entry is whatever the connecting client itself
sent; nothing upstream of the app in this code path removes or overwrites it. Demonstrated
directly: from one `curl` process, on one real source IP, sending a fresh, fabricated
`X-Forwarded-For` value on every request let every single request land in its own empty
rate-limit bucket — 8 consecutive requests all reached the Resend call (`502`, not `429`),
with no throttling at all. A single comma-injected fake entry ahead of a fixed value
(`X-Forwarded-For: attacker-fake-N, 198.18.0.50`) had the same effect before the fix.

This is materially different from, and worse than, the limitation
`lib/rate-limit.ts`'s docstring and `docs/api/api-overview.md` already disclose ("rate
limiting is in-memory and per server instance... the real-world ceiling in a
horizontally-scaled deployment is `MAX × live instances`"). That caveat describes a
*proportional* weakening under horizontal scaling with distinct real clients. What was
actually reachable here is a *complete* bypass, from a single process, a single real IP,
with no distributed infrastructure and no dependency on how many server instances exist —
directly undermining the reason this endpoint is rate-limited at all: bounding the cost
and abuse surface of a real, paid external API call (Resend) that this endpoint now makes
for the first time (D-23's own stated concern in the handoff). Rated **High**: the
attack requires nothing beyond a `curl` one-liner, is fully within scope of "this needs to
be secured very well," and defeats the one control standing between this endpoint and
unlimited outbound email sends / Resend cost / notification-inbox flooding.

*Remediation status:* **Fixed, 2026-09-23 (this review).** `clientKey()` now keys on the
**last** entry of `X-Forwarded-For`, not the first — the value a single trusted
reverse-proxy hop that terminates the client connection (this project's deployment target
is Vercel; see `docs/deployment/deployment.md`) appends based on the connection it
actually observed, which an external caller cannot forge, for as long as exactly one such
trusted hop sits in front of the app. Re-verified directly after the fix: the same spoofed-
leading-entry attack, repeated against the fixed code with a constant trailing "trusted"
value, now correctly throttles at the 6th request (`429`). `npm run lint`,
`npm run typecheck`, and `npm run build` all re-run clean after the fix.
`docs/api/endpoints.md` updated to match. **Residual, unverified assumption, flagged for
DevOps rather than silently assumed:** this fix's safety depends on Vercel's edge network
actually *appending* the true connecting IP as the last entry rather than forwarding the
client's header unchanged — there is no production Vercel deployment yet to confirm this
against (`docs/agents/handoffs.md`, DevOps handoffs). Confirm this before or at first real
deploy; if it does not hold, `x-real-ip` or an equivalent platform-set single-value header
should be used instead. This is a platform trust question that application code alone
cannot fully close, which is why it is flagged rather than marked resolved outright.

**F-4 (Low / Informational) — CONFIRMED, not fixed — the honeypot path is not
timing-safe.**

A filled-honeypot response returns in single-digit-to-low-double-digit milliseconds (5
measured runs: 1–40 ms); a genuine submission that reaches the Resend call takes roughly
300–900 ms even when that call fails (5 measured runs: 290–810 ms), because it actually
makes the outbound HTTPS call to Resend before responding. Both facts were measured
directly against the running instance, not inferred. A sufficiently motivated, scripted
bot could use this latency gap as a side channel to identify which field is the honeypot
by observing which submissions return near-instantly, achieving a version of exactly what
the field-naming leak (found and fixed by the Full-Stack Engineer before this review) also
gave away, just through a slower, noisier channel instead of a named field in a `400`
body.

Impact is bounded and does not rise to blocking: the honeypot is one detection layer among
several implicit ones (schema validation, rate limiting, and simply that most bots do not
bother with response-timing analysis against a low-value enquiry form); defeating it costs
an attacker nothing more than what defeating any honeypot already costs — a slightly better
spam submission gets through, still bounded by every other control in this review. It does
not expose PII, does not bypass rate limiting or schema validation, and does not affect a
real traveller's request in any way.

*Remediation status:* **Not fixed — flagged as a judgment call, not silently decided.**
The available fixes are trade-offs rather than unambiguous bug fixes: adding artificial
latency to the honeypot branch (to match typical delivery latency) is the natural
countermeasure, but it means an attacker's own request holds a connection open for
hundreds of extra milliseconds for no product benefit, and the "right" delay to pick is
itself a moving target (Resend's own latency varies). Given the low payoff a real attacker
gets from winning this side channel, this reviewer's recommendation is to accept it as a
residual, low-value information leak rather than add artificial latency — but this is a
product/performance trade-off for the team to decide, not one this review will make
unilaterally.

### Checks that came back clean

- **Injection into the outgoing email:** the Resend call passes structured JSON fields
  (`from`, `to`, `replyTo`, `subject`, `text`) to the SDK — no string concatenation of a
  raw SMTP/header block anywhere. `text` only; no `html` field is ever passed, confirmed by
  reading `resend.emails.send(...)`'s full argument object. `sanitiseSubjectFragment`
  strips `\r`/`\n` from the subject line, the one place free-text-derived content
  (`t.fullName`) becomes something that could be read as a mail header if this ever moved
  to a raw-SMTP transport later. `replyTo` is `enquiry.traveller.email`, which by that
  point has already passed `z.email()` — a valid email address cannot carry `\r`/`\n` or
  arbitrary header syntax. Every free-text field that lands in the email body
  (`specialRequirements`, `preferences.requests`, `activity.otherName`, transport
  `pickup`/`dropoff`, etc.) has an explicit `.max()` in the schema — checked every
  `z.string(` call site in `lib/validation.ts` directly, none found unbounded.
- **Schema completeness:** `bookingDraftRequestSchema` and every nested object
  (`travellerSchema`, `datesSchema`, `airportLegSchema`, `stayEntrySchema`,
  `activityEntrySchema`, `transportEntrySchema`, `preferencesSchema`,
  `plannedItinerarySchema`) is `z.strictObject`. `stays`/`activities`/`transport` are
  capped at `MAX_STAYS`/`MAX_ACTIVITIES`/`MAX_TRANSPORT`, imported from
  `lib/booking-request.ts` (not re-declared, so they cannot drift from the client's own
  limits). Every slug field is cross-checked against `lib/content.ts` live data
  (`isKnownDestinationSlug`, `isKnownTripSlug`, `isKnownExperienceSlug`,
  `getAccommodationBySlug`, `getActivityBySlug`), including the destination/accommodation
  pairing check carried over from the F-2 fix in the prior review. Confirmed by direct
  requests (see "Verification results") for a fabricated destination, a fabricated
  accommodation under a real destination, and an oversized array — all rejected.
- **Secret hygiene:** `RESEND_API_KEY` is read once (`serverEnv.RESEND_API_KEY`), passed
  only to `new Resend(...)`, and never appears in any `console.*` call, any response body,
  or any client-reachable code path (grepped the full diff for the identifier). Every
  `console.warn`/`console.error` in the changed files logs only variable *names*
  (`lib/env.ts`) or the Resend SDK's own `error.name`/`error.message` (never a raw stack
  trace, never the key) alongside a `correlationId`. `.env.local` is present locally but
  gitignored (`git check-ignore -v` confirms), holds no real Resend/notification values,
  and is not part of this diff (`git status` at review start showed it untracked and
  unmodified). No `500`, `502`, or `503` response body observed during testing contained
  anything beyond the generic, pre-written message and a `correlationId`.
- **CORS:** no `Access-Control-Allow-Origin` or any other `Access-Control-*` header
  anywhere in `next.config.ts` or the route handler; confirmed empirically with a
  cross-origin preflight and a cross-origin POST — neither response carries one. The
  endpoint remains same-origin-only by default, matching `docs/api/api-overview.md`'s
  claim.
- **ID integrity:** `generateBookingRequestId()` (CSPRNG via `crypto.getRandomValues`,
  unchanged from the pre-existing client-side implementation, now also used server-side)
  is called unconditionally in both the honeypot and genuine-success branches of the route
  handler and is the only source of the `id` in every `BookingResponse`. A client-supplied
  `id` field in the request body is rejected outright by `strictObject` before the handler
  logic is ever reached; even if it were not, nothing in the handler reads a client-
  supplied `id` from the parsed body at any point.
- **`Cache-Control: no-store`** confirmed present on the `/api/bookings` response headers
  in every test performed.
- **`poweredByHeader: false`** unchanged; no `X-Powered-By` header observed on any
  response.

### Not verified (disclosed, not silently skipped)

- **Actual Resend delivery.** No real `RESEND_API_KEY` was available to this reviewer
  either (consistent with the handoff's own disclosure). All delivery-path testing used a
  syntactically-valid-but-fake key, which reaches Resend's own auth check and fails there
  (`502`) — this confirms the request reaches the network call correctly and that failure
  handling does not leak provider detail, but does not confirm a real message is ever
  successfully delivered, its formatting once received, or Resend's error shape for
  failure modes other than an invalid key (e.g. a bounced `to` address, a rate-limited
  Resend account, a suspended sending domain).
- **Vercel's real `X-Forwarded-For` behaviour**, as discussed in F-3's remediation notes —
  no production deployment exists to test this against.

### Overall severity

One High finding (F-3), found, fixed, and re-verified during this review. One Low/
Informational finding (F-4), left open with a recommendation, not a unilateral fix, per
the task's own instruction to flag judgment calls rather than decide them. No other
findings reached the bar for inclusion — every other area probed (size/DoS handling,
honeypot response shape, schema completeness, secret hygiene, CORS, id integrity, error-
response hygiene) held up under direct, adversarial testing, not just code reading.

---

## Review 2026-09-23 — Cross-page trip selections into the booking request (D-21)

**Reviewer:** Cybersecurity / Application Security Agent
**Handoff reviewed:** "Cross-page trip selections into the booking request (2026-09-23)"
in `docs/agents/handoffs.md`, from the Full-Stack Engineer.

### Scope

Front-end only, no server involved. Reviewed every file the handoff listed as
changed:

- New: `lib/trip-selections.ts`, `lib/plan-storage.ts`
- Modified: `lib/booking-request.ts`, `lib/content.ts`,
  `components/accommodation/stays-explorer.tsx`, `components/activities/activity-card.tsx`,
  `components/activities/activities-explorer.tsx`, `components/plan/plan-builder.tsx`,
  `components/booking/booking-form.tsx`, `components/booking/plan-section.tsx`,
  `components/booking/booking-summary.tsx`

Read via `git diff` against the working tree (all changes uncommitted at review time).
Out of scope, per the handoff and D-19 (unchanged by this work): the traveller-PII fields
elsewhere in the booking form, and `submitBookingRequest`'s stub delivery path
(`DELIVERY_CONNECTED = false` — nothing is transmitted anywhere yet).

### Checks performed

1. Trust boundary on `localStorage` reads (`readTripSelections`, `readStoredPlan`,
   the legacy `np.plan.v1`/`np.stays.v1` parsing this builds on).
2. XSS / injection — any `dangerouslySetInnerHTML`, raw HTML interpolation, or
   localStorage-derived value rendered outside normal JSX text position.
3. Data exposure — whether anything beyond catalogue slugs/small counts is written
   to `localStorage`, and whether any submission content is logged.
4. DoS / resource exhaustion via storage — whether the new hydration path in
   `booking-form.tsx` can exceed the existing `MAX_STAYS` / `MAX_ACTIVITIES` caps.
5. The `makeEntryId` id-generation fix — confirmed applied everywhere ids are minted.
6. Independent verification: `npm run lint` and `npm run typecheck`, run directly by
   the reviewer rather than taken on the engineer's word.

### Verification results

- `npm run lint` — clean, no errors or warnings.
- `npm run typecheck` (`tsc --noEmit`) — clean.

### Findings

**F-1 (Low) — Booking-form seeding does not respect `MAX_STAYS` / `MAX_ACTIVITIES`.**

`components/booking/booking-form.tsx`'s mount effect seeds `BookingDraft.stays` from
`Object.entries(selections.stays)` and `BookingDraft.activities` from
`selections.activitySlugs` with no length cap. Both source lists are bounded only by the
size of the underlying catalogues (21 destinations in `content/destinations.ts`, ~92
activities in `content/activities.ts`), not by `MAX_STAYS = 8` / `MAX_ACTIVITIES = 15`
(`lib/booking-request.ts`). Elsewhere in the app those caps are enforced only by hiding
the "Add" button in `plan-section.tsx` once a list reaches its max
(`draft.stays.length < MAX_STAYS ? …`) — `validateDraft` never checks array length. Before
this change that soft enforcement was sufficient because the click-driven "Add" handlers
were the only way to grow those arrays. This change adds a second way to grow them —
seeding from `localStorage` — that does not go through the same gate.

This is reachable through entirely ordinary use, not just a hand-edited `localStorage`
value: a traveller who picks a stay in more than 8 destinations on `/accommodation`, or
adds more than 15 items on `/activities`, and then opens `/bookings` for the first time in
that session, gets a booking draft with more stay/activity entries than the form is
designed to hold — an oversized "Build my own trip" form is then rendered.

Impact is bounded: this is client-side-only state in the visitor's own browser
(no other user or system is affected), submission is currently a no-op stub, and nothing
crashes — worst case is a long, slow-to-scroll form. Rated **Low**, not higher, for that
reason, but it is a genuine, concretely-reachable regression of an existing invariant, not
a theoretical one.

*Remediation status:* **Fixed, 2026-09-23.** `booking-form.tsx`'s seeding effect now
slices both source lists before building entries —
`Object.entries(selections.stays).slice(0, MAX_STAYS)` and
`selections.activitySlugs.slice(0, MAX_ACTIVITIES)` — with `MAX_STAYS`/`MAX_ACTIVITIES`
imported from `lib/booking-request.ts`, the same constants `plan-section.tsx`'s "Add"
buttons already gate on. Re-verified: `npm run lint`, `npm run typecheck`, and
`npm run build` all clean after the fix.

**F-2 (Informational) — `np.selections.v1` parsing drops a cross-check the code it
replaces had.**

The removed `np.stays.v1` parser in `stays-explorer.tsx` validated
`getAccommodationBySlug(stay)?.destinationSlug === destination` — i.e. that a stored stay
slug actually belongs to the destination key it is filed under — before trusting the
entry. The new `parse()` in `lib/trip-selections.ts` only checks that the value is a
non-empty string; it does not re-check the destination/accommodation pairing.

This is not independently exploitable: every read of a stored slug is still guarded by an
existence check before use (`getAccommodationBySlug(...)` returns `undefined` → skipped,
or rendered through `?? fallback` in JSX text position — no crash, no injection). The
realistic effect of a hand-edited mismatch is cosmetic: a "Kandy" stay entry could show a
Galle property's name. Not reachable through the normal UI at all (`StayPicker` only ever
calls `onStay` with a destination/accommodation pair it picked together), only through a
hand-edited `localStorage` value.

*Remediation status:* **Fixed, 2026-09-23.** `lib/trip-selections.ts`'s `parse()` now
requires `getAccommodationBySlug(accommodation)?.destinationSlug === destination` before
keeping a stored stay, restoring parity with the code it replaced. Re-verified:
`npm run lint`, `npm run typecheck`, and `npm run build` all clean after the fix.

### Checks that came back clean

- **`localStorage` trust boundary:** every stored slug that reaches a content lookup
  (`getAccommodationBySlug`, `getActivityBySlug`, `getDestinationBySlug`) is guarded —
  either an explicit existence check before use (`if (!accommodation) continue`,
  `if (!stay) return null`) or a `?.`/`?? fallback` at the render site. No unguarded
  lookup found. `parseStoredPlan` / `readStoredPlan` (extracted unchanged from the
  pre-existing `plan-builder.tsx` code) and `readTripSelections` both reject malformed
  JSON, wrong types, and unknown shapes field-by-field, consistent with the rest of the
  codebase's `localStorage` handling.
- **XSS / injection:** no `dangerouslySetInnerHTML`, no raw HTML string interpolation,
  anywhere in the reviewed files (confirmed by direct search, not just reading). Every
  localStorage-sourced value that reaches the DOM — the "picked elsewhere" legends in
  `plan-section.tsx`, the saved-itinerary card in `plan-section.tsx` and
  `booking-summary.tsx`, the "Your stays"/"Your activities" lists — is rendered through
  ordinary JSX text interpolation, which React escapes.
- **Data exposure:** `np.selections.v1` holds only `{ stays: Record<destinationSlug,
  accommodationSlug>, activitySlugs: string[] }`; `np.plan.v1` (unchanged, just
  relocated) holds only `PlanInput` fields (day count, arrival month, interests, pace,
  starting point) plus a day-reorder array. No name, email, phone or other traveller PII
  is written by this change — that data continues to live only in booking-form React
  state, never `localStorage`, per D-19. No `console.log` (or any other logging call) of
  form, draft, or storage content was found anywhere in the reviewed files.
- **Id generation:** `let entryCounter = 0` / `makeEntryId` in `lib/booking-request.ts`
  is the only id counter left in the codebase (searched for stray `let counter` /
  `nextId` definitions — none found). It is used at every entry-creation site:
  `plan-section.tsx`'s `addStay` / `addActivity` / `addTransport`, and
  `booking-form.tsx`'s seeding effect for stays and activities. No collision risk.

### Overall severity

No High or Medium findings. Two Low/Informational findings, both non-blocking, both with
a bounded, self-only, client-side impact given there is no server yet.

---

## Prior reviews

None recorded before this one — `docs/security/` was empty prior to 2026-09-23. Earlier
handoffs (accommodation page, activities page, bookings/API work) reference "review
needed" but no prior review record exists in this file; that predates this document's
creation and is out of scope for this entry.
