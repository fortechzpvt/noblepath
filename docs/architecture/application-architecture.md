# Noble Path — Application Architecture

**Status:** Approved for v1
**Last updated:** 2026-09-23

Companion to `system-architecture.md`. That document explains the runtime shape;
this one explains how the code inside the application is organised and why.

---

## 1. Directory layout

```
app/                      Routes. Server components unless marked otherwise.
  layout.tsx              Root layout: fonts, metadata, header, footer, skip link
  globals.css             The design tokens (@theme) + base + utilities
  page.tsx                Home
  destinations/           Index + [slug] detail
  experiences/            Index
  accommodation/          Standalone accommodation picker
  activities/             Standalone activity catalogue
  trips/                  Index + [slug] detail
  plan/                   The itinerary builder
  bookings/               Booking request: full trip or single ride (D-24)
  about/                  About Us
  api/bookings/route.ts   Write endpoint: full-trip requests
  api/rides/route.ts      Write endpoint: single-ride requests (D-24)
  api/health/route.ts     Liveness probe

components/               Presentational and interactive UI
  site-header.tsx         Transparent-over-hero → solid-on-scroll nav (client)
  site-footer.tsx
  ui/                     Primitives: button, chip, field, glass panel
  home/                   Home-page sections, including the hero
  cards/                  Destination, experience and trip cards
  accommodation/          Accommodation picker (client)
  activities/             Activity catalogue, with "Add to my trip" (client)
  plan/                   Itinerary builder (client)
  booking/                Booking forms: trip + single ride, and the switch (client)

content/                  The editorial source of truth (typed data)
lib/                      Domain logic: types, content queries, itinerary, validation
  trip-selections.ts      Shared `/accommodation` + `/activities` picks (client store)
  plan-storage.ts         `/plan`'s saved-itinerary storage, read/written from elsewhere too
  booking-request.ts      Booking draft model, validation, shared entry-id counter
public/images/            Owned photography and the route-pin vector
docs/                     Documentation — the project's memory
```

## 2. The server/client boundary

This is the single most important rule in the codebase, because it is what keeps
the performance budget (ADR-001).

**Server by default.** A component is only a client component when it needs state,
an effect, or a browser API. Currently that is these places:

| Client component | Why it must be |
| --- | --- |
| `site-header` | Reacts to scroll position; owns the mobile menu |
| `home/hero` | Scroll-linked parallax and the route-line draw-on |
| `plan/*` | The itinerary builder is stateful and persists to `localStorage` |
| `accommodation/stays-explorer` | Stateful; picks persist to `localStorage` (shared with `booking-form`) |
| `activities/activities-explorer` | Stateful; picks persist to `localStorage` (shared with `booking-form`) |
| `booking/booking-form` | Form state, client-side validation, submission; reads the two stores above on mount |
| Filter controls on index pages | Selection state |

Everything else — every page, every card, every section — renders on the server and
ships no JavaScript. A `"use client"` added near the root of a tree silently pulls
everything below it into the bundle, so the directive belongs as far down the tree as
possible, on the smallest component that genuinely needs it.

## 3. Data access

Pages never reach into `content/*` directly. They call the typed accessors in
`lib/content.ts`.

This matters for one concrete reason: ADR-002 commits to replacing the file-based
content layer with a CMS when non-technical editors arrive. That migration is a
rewrite of `lib/content.ts` and nothing else — provided no page ever imported a
content module directly. The indirection looks redundant today; it is what makes the
documented exit cheap.

## 4. Where input is trusted

Untrusted input enters at exactly one point: `POST /api/bookings`.

`lib/validation.ts` holds the Zod schema, and it is imported by **both** the client
form and the server route. The client copy exists to give immediate, identical error
copy; it is never a control. The server re-validates unconditionally (NFR-7). If the
two ever disagree, the server wins — that is the whole point of a single shared schema.

`.strict()` on the schema means an unexpected key is a validation failure rather than
a silently ignored field, which is what stops a future refactor from quietly accepting
something nobody designed for.

## 5. Purity in the domain layer

`lib/itinerary.ts` is a pure function: same input, same output, no I/O, no clock, no
randomness (ADR-007). That constraint is deliberate and load-bearing:

- It runs identically on the server and in the browser, so the planner works without a
  round trip and the result can be pre-rendered if we ever want to.
- It is trivially testable — no mocking, no fixtures, no time control.
- A visitor who reports "the plan it gave me was wrong" can be reproduced exactly.

The moment something in that module reads `Date.now()` or `Math.random()`, all three
properties are lost. Seasonal logic therefore takes `arrivalMonth` as an explicit
input rather than reading the current date.

## 6. Styling

One mechanism: Tailwind v4 utilities over the tokens in the `@theme` block
(ADR-005). Recurring multi-property recipes from the design system — glass surfaces,
the scrim layers, the dual focus ring, the measure constraints — are expressed once as
`np-*` utilities in `globals.css` rather than repeated as long class strings.

There are no CSS modules, no styled-components, and no inline style objects except
where a value is genuinely dynamic (a computed parallax transform, an SVG path length).

## 7. Accessibility is structural, not a pass at the end

- The dual focus ring is applied globally in the base layer. Removing focus without a
  replacement is a build-blocking defect (design system §11).
- `prefers-reduced-motion` is handled once, globally, and the cinematic effects are
  removed rather than shortened — including the route line, which is explicitly reset
  to its fully-drawn state so it does not disappear.
- Every image type in `lib/types.ts` requires `alt`. The type system enforces it; a
  missing alt is a compile error rather than an audit finding.
- Decorative elements — the route line, the pin — are `aria-hidden` and never the sole
  carrier of meaning.

## 8. Error handling

- Server components render from compiled content, so the failure mode is a missing
  slug → `notFound()` → the 404 route. There is no network error path to handle.
- The booking endpoint returns structured, field-level errors and never leaks internals:
  no stack traces, no reflected input, no raw exception messages.
- Content integrity failures surface at **build** time via `lib/content.ts`, not at
  runtime. A broken cross-reference fails CI instead of reaching a visitor.

## 9. Cross-page trip selections (D-21)

`/accommodation`, `/activities` and `/plan` each let a traveller pick specific
things while just browsing, with no traveller details and no booking in
progress yet. Those picks need to reach `/bookings` without a server, so they
travel through `localStorage`, read once when the booking form mounts:

```
/accommodation (stays-explorer.tsx) ─┐
                                      ├─▶ lib/trip-selections.ts  (np.selections.v1)
/activities (activities-explorer.tsx)┘         │
                                                 │  read once, on mount
/plan (plan-builder.tsx) ─▶ lib/plan-storage.ts │
        (np.plan.v1)                            ▼
                                    components/booking/booking-form.tsx
                                    seeds BookingDraft.stays / .activities /
                                    .plannedItinerary, only where still empty
```

- `lib/trip-selections.ts` owns `np.selections.v1` (specific accommodation and
  activity picks). `lib/plan-storage.ts` owns `np.plan.v1` (the saved
  itinerary) — extracted out of `plan-builder.tsx` so `booking-form.tsx` can
  read it too, without `/plan`'s own behaviour changing.
- Both are parsed defensively wherever they are read: `localStorage` is
  editable by the visitor, so a malformed or stale payload is dropped rather
  than trusted, the same trust model as every other `localStorage` read in
  this codebase.
- The booking form's seed runs once, on mount, and only fills fields that are
  still empty — it must never overwrite a request the traveller is already
  editing.
- See D-21 in `docs/decisions/architecture-decisions.md` for the alternatives
  considered and the full reasoning.

## 9.1 Destination detail page (D-22)

`app/destinations/[slug]/page.tsx` is a server component, statically generated
for all 21 destinations via `generateStaticParams` (same pattern as
`/trips/[slug]`). It composes existing pieces rather than introducing new
data: `DestinationHero` and `TravelLinks` (both written for this page ahead of
the route existing), `getRelatedDestinations`/`getExperiencesForDestination`
from `lib/content.ts`, and a new single-pin `components/destinations/
destination-map.tsx` (Leaflet/OpenStreetMap, the same approach D-17 already
established for `/accommodation` — no new map provider decision). Every
`DestinationCard` across the site already linked to this route before it
existed; this fills that in rather than adding new links. See D-22.

## 9.2 Booking delivery (D-23)

`/bookings` is the client; `POST /api/bookings` (full trip) and
`POST /api/rides` (single ride, D-24) are the only places a request actually
leaves the browser. Every check runs again server-side — the client
validating first is a convenience, never a substitute. Both routes are thin
wrappers over one shared pipeline, `lib/enquiry-endpoint.ts`
(`handleEnquiryPost`), so they cannot drift apart. The trip path is shown;
the ride path swaps in `ride-form.tsx` → `rideRequestSchema`
(`lib/ride-validation.ts`) → `lib/ride-email.ts`, and needs no content
lookups because pickup and drop-off are free text:

```
components/booking/booking-form.tsx (client)
  │  fetch POST, BookingDraft as JSON
  ▼
app/api/bookings/route.ts → lib/enquiry-endpoint.ts
  │  1. Content-Length guard (≤ 50 KB)
  │  2. checkRateLimit() — lib/rate-limit.ts
  │  3. Content-Type check, JSON.parse
  │  4. bookingDraftRequestSchema.safeParse() — lib/validation.ts
  │  5. honeypot check (website !== "") → fake 200, no email sent
  ▼
lib/booking-email.ts          lib/content.ts
  builds the plain-text        resolves every slug in the
  notification (mirrors        request to a name — the
  booking-summary.tsx's        same content module the rest
  on-screen grouping)          of the site reads from
  │
  ▼
Resend (resend.com) — new Resend(RESEND_API_KEY).emails.send({...})
  │  to: BOOKINGS_NOTIFICATION_EMAIL · replyTo: the traveller's own address
  ▼
Staff inbox
```

Every error path — validation failure, rate limit, oversized body, wrong
content type, delivery failure, delivery not configured, wrong HTTP method —
returns the same `ApiErrorBody`/`ApiErrorCode` envelope (`lib/types.ts`), with
a `correlationId` also written to the server log, so a traveller can quote one
short id to support instead of a raw error message. See D-23 in
`docs/decisions/architecture-decisions.md` for the alternatives considered and
the full reasoning, and `docs/agents/handoffs.md` for this feature's
Cybersecurity review.

## 10. Conventions

- Files are kebab-case; React components are PascalCase; types are PascalCase.
- String-literal unions over TypeScript `enum` — better inference, no runtime artefact.
- `noUncheckedIndexedAccess` is on, so array indexing yields `T | undefined` and must be
  narrowed. This is deliberate: itinerary day arrays are indexed constantly, and an
  off-by-one there produces a broken travel plan rather than a crash.
- Comments explain *why*. The code already says what.
