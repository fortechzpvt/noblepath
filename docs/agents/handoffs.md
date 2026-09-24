# Noble Path — Agent Handoffs

A running record of which agent did what, in what order, and what each one passed on.
Per Fortechz policy §15 and §19, the handoff is the artefact — not the conversation.

---

## Orchestration plan (2026-09-19)

**Triage by:** Orchestrator

Noble Path is a public, unauthenticated, content-heavy web application with one write
path. Mapping the work to the specialist roster:

| Specialist | Engaged | Rationale |
| --- | --- | --- |
| UI/UX Designer | **Yes** | The approved mockup must become an implementable specification before any UI is written (policy §10, §12). |
| Full-Stack Engineer | **Yes** | Domain model, content layer, itinerary engine, bookings API, and all page/component implementation. |
| DevOps Engineer | **Yes** | CI/CD, containerisation, environment configuration, deployment and rollback (policy §9). |
| Cybersecurity / AppSec | **Yes** | Mandatory reviewer — the booking endpoint accepts untrusted input and handles traveller PII (policy §8). |
| AI/ML Engineer | **No** | v1 contains no model, no prompt and no retrieval. ADR-007 records why itinerary generation is deterministic rather than LLM-driven. Engaging this agent would produce documentation for a system that does not exist, which policy §18 forbids. |
| Mobile App Developer | **No** | Native apps are explicitly out of scope (requirements §6). The responsive web build covers mobile. |
| Embedded / Firmware Engineer | **No** | No hardware in this product. |

Three specialists are deliberately not engaged. That is a decision, recorded here, not an
omission — re-engage them if and when the scope named above changes.

**Sequencing:** design specification and the design-independent engineering tracks run in
parallel; UI implementation waits on the approved design; security and integration review
run last, against the assembled system.

---

## Handoff 1 — Orchestrator → UI/UX Designer

**Task:** Turn the approved hero mockup into a complete, implementable design specification.

**Provided:**
- The approved mockup image
- Five owned photographs and the white map-pin asset
- `docs/requirements/requirements.md`

**Constraints given:** docs-only, no application code; everything must be implementable in
Tailwind v4 + CSS custom properties; concrete numeric tokens, not adjectives; breakpoints
390/768/1024/1440/1920, mobile-first.

**Required output:** `docs/design/{design-system,user-flows,components,page-specs,accessibility}.md`

**Status:** Dispatched.

---

## Handoff 2 — Orchestrator → Full-Stack Engineer (domain track)

**Task:** Domain model, editorial content, itinerary engine, validation, rate limiting,
bookings and health endpoints, plus API and database documentation.

**Provided:** approved requirements; scaffolded Next.js 16 / React 19 / TS strict / Zod
project with dependencies installed; the five owned image paths.

**File ownership granted:** `lib/*`, `content/*`, `app/api/*`, `docs/api/*`, `docs/database/*`.
Explicitly **not** granted: `app/layout.tsx`, `app/globals.css`, any `page.tsx`, `components/*`
— to avoid collision with the UI track.

**Security-sensitive areas flagged to the agent:** untrusted input on `POST /api/bookings`,
traveller PII in transit, reference-code generation (CSPRNG required), rate-limit memory bounds,
and the prohibition on logging submissions or reflecting raw input in errors.

**Status:** Dispatched. Output must be reviewed by the Cybersecurity Agent before the task
is considered complete (policy §8).

---

## Handoff 3 — Orchestrator → DevOps Engineer

**Task:** CI/CD pipelines, Dockerfile, dependency automation, and deployment, environment,
rollback, infrastructure and troubleshooting documentation.

**Constraints given:** produce configuration and documentation only — **deploy nothing**,
create no cloud or GitHub resources, and make the production approval gate structural
(a GitHub Environment with required reviewers), per the Fortechz rule that production is
never modified without explicit human approval.

**File ownership granted:** `.github/*`, `Dockerfile`, `.dockerignore`,
`docs/deployment/*`, `docs/architecture/infrastructure-architecture.md`,
`docs/troubleshooting/troubleshooting.md`.

**Known required code change passed to the agent:** `next.config.ts` does not yet set
`output: "standalone"`, which the Dockerfile needs. The agent was told to flag it rather
than edit a file it does not own.

**Status:** Dispatched.

---

## Handoff 4 — DevOps Engineer → Orchestrator (returned)

**Status:** Complete, **NEEDS REVIEW**.

**Delivered:** `ci.yml`, `deploy.yml`, `dependabot.yml`, `Dockerfile`, `.dockerignore`, and
the deployment, environment, rollback, infrastructure-architecture and troubleshooting
documentation. Nothing was deployed and nothing was provisioned — there is no git repository,
no GitHub remote and no Vercel project, and every document says so at the top.

**Validated:** all three YAML files parse; all 19 inline shell blocks pass `bash -n`.
**Not validated:** the Dockerfile was never built (Docker is not installed here), neither
workflow has ever run, and neither the approval gate nor the rollback procedure has been
rehearsed. Those are design claims until someone verifies them once.

**Actions taken by the Orchestrator in response:**
- `output: "standalone"` added to `next.config.ts` (their blocking item #1) — done.
- ADR-009 (hosting) and ADR-010 (the approval gate) recorded in the decision log, since a
  decision that lives only in a DevOps document is not a project decision (policy §5, §19).
- Their remaining six required actions on `app/api/*` and `lib/*` forwarded to the Full-Stack
  Engineer who owns those files, rather than edited across ownership boundaries.

**Highest-risk finding, carried forward:** a booking enquiry is unrecoverable if delivery
fails. There is no datastore, no queue, no retry and no startup validation, so a missing
`BOOKINGS_NOTIFICATION_EMAIL` would fail silently while the visitor is still shown a success
reference. Startup validation is now assigned; the durability gap itself is a business
decision recorded in the README and in `requirements.md` §7.1.

---

## Handoff 5 — Orchestrator → Full-Stack Engineer (destinations & experiences UI)

**Task:** `/destinations` index and detail, `/experiences` index, filter components.

**Provided:** the approved design specification, the implemented token layer in
`app/globals.css`, and the shared component library already built (`button`, `section`,
`glass-panel`, `snap-rail`, `intensity-meter`, the three card components).

**Key constraint given:** filters are driven by **URL search params**, not client state
wrapping the grid — the page stays a server component, the grid ships no JavaScript, and
filtered views stay linkable. Only the chip row is a client component.

**File ownership granted:** `app/destinations/*`, `app/experiences/page.tsx`,
`components/filters/*`, `components/destinations/*`, `components/ui/page-header.tsx`,
`components/ui/empty-state.tsx`.

---

## Handoff 6 — Orchestrator → Full-Stack Engineer (trips, plan, bookings, about)

**Task:** `/trips` index and detail, `/plan` itinerary builder, `/bookings` enquiry form,
`/about`, and the 404 route.

**Provided:** as above, plus the domain modules (`lib/itinerary.ts`, `lib/validation.ts`).

**Security-sensitive areas flagged:** the booking form handles traveller PII; it must import
`bookingRequestSchema` from `lib/validation.ts` rather than restate the rules, must handle
the `429` and network-failure paths without ever implying success, and must never log a
submission. The planner must persist to `localStorage` defensively — read in an effect, never
during render, and wrapped in `try/catch`, because storage throws in private mode.

**File ownership granted:** `app/trips/*`, `app/plan/*`, `app/bookings/page.tsx`,
`app/about/page.tsx`, `app/not-found.tsx`, `components/plan/*`, `components/booking/*`,
`components/trips/*`, `components/ui/field.tsx`.

**Status:** Partially delivered, never returned. On resuming this project (2026-09-20) the
Orchestrator found: `app/trips/*`, `app/about/page.tsx`, `app/not-found.tsx`,
`components/plan/*` (a complete, localStorage-backed `PlanBuilder`) and `components/trips/*`
present and apparently finished. Never delivered: `app/plan/page.tsx` (the component exists,
nothing renders it), `app/bookings/page.tsx`, `components/booking/*`, and — from Handoff 2 —
`app/api/bookings/route.ts`, `app/api/health/route.ts`, `docs/api/*`, `docs/database/*`. No
return handoff was ever written for this task, which is itself a policy §15 gap. Re-dispatched
below as Handoff 7B rather than assumed-complete.

---

## Handoff 7 — Orchestrator → Full-Stack Engineer × 2 (resuming the build, 2026-09-20)

**Triage:** the same gap exists on the content side. Handoff 5 granted `app/destinations/*`
and `app/experiences/page.tsx`, but only `app/destinations/page.tsx` (the index) was ever
written — no detail route, no experiences route at all, and their supporting components
(`destination-hero.tsx`, `travel-links.tsx`, both filter components) were built but never
wired into a page. As with Handoff 6, no return handoff was recorded.

Two non-overlapping tracks are re-dispatched in parallel; neither's file set intersects the
other's or anything already shipped.

### Handoff 7A — Full-Stack Engineer (destinations detail & experiences)

**Task:** `app/destinations/[slug]/page.tsx`, `app/experiences/page.tsx`,
`app/experiences/[slug]/page.tsx`, per `docs/design/page-specs.md` §3–§4.

**File ownership granted:** `app/destinations/[slug]/*`, `app/experiences/*`,
`components/experiences/*`, `components/ui/gallery.tsx` (or equivalent lightbox, if none
exists — checked, none does).

**Provided:** `components/destinations/destination-hero.tsx` and `travel-links.tsx` (built,
unused), `components/filters/experience-filters.tsx` (built, unused), `lib/content.ts`
(`getRelatedDestinations`, `getExperiencesForDestination`, `getExperiencesByCategory`, etc.),
the existing `/destinations` index as the reference implementation for metadata, filter
wiring (URL search params, server component, client-only chip row) and empty states.

**Status:** Dispatched.

### Handoff 7B — Full-Stack Engineer (plan wiring, bookings, API, docs)

**Task:** `app/plan/page.tsx` (renders the existing `PlanBuilder`), `app/bookings/page.tsx`,
`components/booking/*`, `app/api/bookings/route.ts`, `app/api/health/route.ts`, plus
`docs/api/*` and `docs/database/*` (granted in Handoff 2, never delivered).

**File ownership granted:** as above, plus `docs/api/*`, `docs/database/*`.

**Scope boundary — v1 only:** `docs/design/page-specs.md` §8 describes a full
checkout/payment/account/magic-link flow. That is **not** v1 (`requirements.md` FR-5.5,
README "Known limitations", ADR-003): v1 is one `/bookings` enquiry page over
`bookingRequestSchema`, returning a reference code, with no persistence, no login and no
payment. Do not build `/bookings/checkout`, `/confirmation`, or `/[ref]`.

**Security-sensitive areas flagged (policy §8 — mandatory Cybersecurity review before this
task is complete):** traveller PII on `POST /api/bookings`; CSPRNG reference-code generation;
must call `checkRateLimit` with `bookingRateLimitOptions`; must never log a submission or
reflect raw input in an error response (only field names, via `toFieldErrors`); per ADR-003
the handler logs non-PII metadata only (timestamp, booking type, reference) and has one
clearly-marked seam for a future delivery/persistence adapter — no email-sending integration
exists yet and none should be invented. `app/api/health/route.ts` must return 200, a small
JSON body, `Cache-Control: no-store`, and no version/build/env detail (deployment.md,
infrastructure-architecture.md).

**Provided:** `lib/validation.ts` (`bookingRequestSchema`, `toBookingEnquiry`,
`toFieldErrors`), `lib/rate-limit.ts`, `lib/env.ts` (`serverEnv.BOOKINGS_NOTIFICATION_EMAIL`),
the finished `PlanBuilder` (links to `/bookings?type=custom-plan`).

**Status:** Dispatched. Output must be reviewed by the Cybersecurity Agent before the task
is considered complete (policy §8).


## Handoff - Accommodation page (2026-09-21)

From: Full-Stack Engineer. To: Cybersecurity Agent, UI/UX Designer, DevOps Engineer.

Completed: standalone `/accommodation` page: budget question, animated reveal, per-destination stay list with map, "Stay here" saving to a "Your stays" list. No planner or booking changes.

Files: `content/accommodations.ts`, `lib/content.ts`, `lib/types.ts`, `components/accommodation/*`, `app/accommodation/page.tsx`, `components/home/plan-categories.tsx`, `app/globals.css`, `next.config.ts`, `.env.example`.

Tests: `tsc --noEmit`, `eslint` and `next build` pass. No automated tests; not exercised in a browser, and the map has not been viewed in a browser.

Review needed: Cybersecurity - CSP change (OpenStreetMap tile origin). UI/UX - tier cards and motion. DevOps - confirm OSM tile usage is acceptable at expected traffic.

Known issues: seed data unverified (docs/database/accommodation-content.md); saved stays are not linked to plans or bookings.

## Handoff — Cross-page trip selections into the booking request (2026-09-23)

**From:** Full-Stack Engineer. **To:** Cybersecurity Agent.

**Task:** carry a specific accommodation pick (`/accommodation`), an activity pick
(`/activities`) and a saved itinerary (`/plan`) into `/bookings` automatically, instead of
the traveller having to re-enter what they already chose. See D-21 in
`docs/decisions/architecture-decisions.md` for the full design and alternatives considered.

**Completed:**
- New shared client store `lib/trip-selections.ts` (`localStorage` key `np.selections.v1`)
  for accommodation/activity picks; `/accommodation` and `/activities` write to it and each
  gained a "Your stays" / "Your activities" list with a "Continue to booking" link.
- `/plan`'s existing `np.plan.v1` storage/parsing was extracted, unchanged, out of
  `plan-builder.tsx` into `lib/plan-storage.ts` so it can be read elsewhere.
- `components/booking/booking-form.tsx` reads both stores once, on mount, and seeds
  `BookingDraft.stays` / `.activities` / the new `.plannedItinerary` field, only where those
  are still empty (never overwrites a request already in progress).
- `StayEntry.accommodationSlug` and `ActivityEntry.sourceActivitySlug` (both additive,
  default `""`) let the plan section and the review summary show the traveller's specific
  pick and label the entry "from Accommodation" / "from Activities"; `validateDraft` is
  unchanged. Entry ids now come from one shared counter, `makeEntryId` in
  `lib/booking-request.ts`, replacing a counter that used to be private to
  `plan-section.tsx` (seeded entries and traveller-added entries must not collide on the
  same React key).
- New `getActivityBySlug` accessor in `lib/content.ts`, mirroring the existing
  `getExperienceBySlug`.

**Files:** `lib/trip-selections.ts` (new), `lib/plan-storage.ts` (new), `lib/content.ts`,
`lib/booking-request.ts`, `components/accommodation/stays-explorer.tsx`,
`components/activities/activity-card.tsx`, `components/activities/activities-explorer.tsx`,
`components/plan/plan-builder.tsx`, `components/booking/booking-form.tsx`,
`components/booking/plan-section.tsx`, `components/booking/booking-summary.tsx`,
`docs/decisions/architecture-decisions.md`, `docs/architecture/application-architecture.md`.

**Tests:** `npm run lint`, `npm run typecheck` and `npm run build` all pass. No automated
tests exist for this form (none pre-existed either — see `docs/testing/testing-strategy.md`).
Not exercised in a real browser; only reviewed by reading the rendered logic.

**Security-sensitive areas:** all of it is client-side `localStorage`, holding the
traveller's stay/activity/itinerary picks (destination slugs, accommodation slugs,
activity slugs, day counts, interests — no name, email, phone or other PII; those still
live only in React state, never in `localStorage`, unchanged from D-19). Every read of
`np.selections.v1` and `np.plan.v1` is parsed defensively as untrusted input, same trust
model as the pre-existing `np.stays.v1`/`np.plan.v1` code this builds on: unknown shapes are
dropped, a stale/removed content slug is silently skipped rather than trusted into the
booking draft. `submitBookingRequest` in `lib/booking-request.ts` is still a stub
(`DELIVERY_CONNECTED = false`) — this work does not touch submission, delivery, or any
server boundary, so the outstanding D-19 note ("a Cybersecurity review is required before
delivery is connected") is unchanged in scope, not newly triggered by this handoff.

**Known limitations:** the seed only runs once, on the booking form's first mount in a
session — if the traveller removes a seeded entry and later reloads `/bookings`, it
reappears from `localStorage` unless they also remove it on the originating page. A saved
`/plan` itinerary is carried as a read-only summary (days, destinations, interests), not
exploded into individual stay/activity entries — see D-21 for why. `docs/design/page-specs.md`
§8 already described a different, unimplemented `/bookings` flow before this change (noted
in the existing Handoff 7B above); that drift is pre-existing and was not touched here.

**Status:** Dispatched. Output must be reviewed by the Cybersecurity Agent before this task
is considered complete (policy §8).

## Handoff — UI/UX review of the cross-page trip-selection UI (2026-09-23)

**From:** UI/UX Designer. **To:** Orchestrator, Full-Stack Engineer.

**Task:** Review the UI added by the "Cross-page trip selections into the booking request"
handoff above against `docs/design/design-system.md`, `components.md` and
`accessibility.md`, per policy §10.

**Reviewed:** `components/accommodation/stays-explorer.tsx`,
`components/activities/activity-card.tsx`, `components/activities/activities-explorer.tsx`,
`components/booking/plan-section.tsx`, `components/booking/booking-summary.tsx`,
`components/booking/booking-form.tsx`, `lib/booking-request.ts`, `lib/content.ts`, and —
because `git status`/`git diff` showed it modified in the same working tree —
`components/site-header.tsx`.

**Findings — the booking-integration UI itself:** consistent. The new activity
add/remove toggle is the same control as the pre-existing package "Add to my trip"
toggle in `plan-section.tsx` (`Button size="sm"`, `Plus`/`Check` 16 px, `aria-pressed`) —
not a divergent one-off. `/activities`'s new "Your activities" list, its `aria-live`
region, its 44×44 icon-only remove buttons and its "Continue to booking" CTA are a
faithful mirror of the pre-existing `/accommodation` "Your stays" pattern. The
"picked from Accommodation/Activities" entry-legend suffix and the saved-itinerary
summary (both the editable card in the form and the read-only `Block`/`Row` in the
review step) all reuse existing primitives (`Card`, `Entry`, `Button`/`LinkButton`,
`Block`/`Row`) rather than inventing new ones, and reuse the codebase's existing
"chosen" visual treatment (`border-jungle-700 bg-jungle-50`) for the saved-itinerary
notice, which is the correct precedent to reuse. Copy tone ("Continue to booking",
"These will carry into your booking request.") matches the rest of the form. No new
accessibility gaps were introduced; where a gap exists (e.g. focus is not moved after
an `Entry` or list item is removed, per `accessibility.md` §3.4), it is a pre-existing
gap across every remove control in this codebase, not something newly introduced here.
Documented the four new/reused patterns proportionately in `docs/design/components.md`
§16 (add/remove trip toggle, "Your [X]" saved-picks list, "picked elsewhere" legend,
saved-itinerary summary) per policy §10/§12.

**Finding — out of scope but discovered in the same diff, NEEDS CHANGES:**
`components/site-header.tsx:10-15` — the primary nav's `NAV` array (shared by both the
desktop nav and the mobile drawer) has the `{ href: "/plan", label: "Plan" }` entry
removed, uncommitted in this same working tree. This is **not** mentioned in the
"Cross-page trip selections" handoff's file list or summary, is not recorded as a
deviation anywhere (`design-system.md` §13 or an ADR), and contradicts the approved nav
anatomy in `components.md` §1.1, which lists Destinations / Experiences / Trips / Plan /
About Us. `/plan` is still reachable through several in-page CTAs (home hero,
`plan-teaser`, `closing-cta`, `/trips`, `/trips/[slug]`, and now the booking form's
"View full itinerary" link), so this is not a dead end, but it removes the only
*persistent* entry point to the itinerary builder from every other page's nav — a
traveller on `/destinations` or `/activities` now has no way back to `/plan` without
returning to `/`. Either restore the nav entry, or, if this was an intentional decision
(e.g. de-emphasising `/plan` in favour of the accommodation/activities/booking flow),
record it as an ADR and a proper handoff before it ships — an undocumented, unexplained
removal of a primary nav item is exactly what policy §18 and `accessibility.md`'s
escalation rule (§15) exist to prevent.

**Documentation:** `docs/design/components.md` §16 added.

**Testing:** Read-only review; no build/lint/test run (no code changed other than the
docs addition above).

**Decisions:** None requiring a new ADR from this review; the `site-header.tsx` change
needs one only if it is kept.

**Status:** NEEDS CHANGES — blocking item is `components/site-header.tsx`'s undocumented
nav removal, not the booking-integration UI itself (which is APPROVED as reviewed).

## Handoff — Cybersecurity review result: cross-page trip selections (2026-09-23)

**From:** Cybersecurity / Application Security Agent. **To:** Orchestrator.

**Reviewing:** the handoff immediately above ("Cross-page trip selections into the
booking request", Full-Stack Engineer → Cybersecurity Agent).

**Completed:** read every file the handoff listed as changed (`git diff` against the
working tree); checked the `localStorage` trust boundary, XSS/injection surface, data
exposure (PII in storage, logging), DoS/resource-exhaustion via storage, and the
`makeEntryId` id-collision fix; independently ran `npm run lint` and `npm run typecheck`
rather than relying on the engineer's report of a clean state.

**Verified:** lint and typecheck both pass, confirmed directly. Every stored slug that
reaches a content lookup is existence-guarded before use. No `dangerouslySetInnerHTML` or
raw HTML interpolation anywhere in the changed files; all localStorage-derived values
render through normal (auto-escaping) JSX text. `np.selections.v1` and `np.plan.v1` hold
only catalogue slugs and small counts — no traveller PII, consistent with D-19. No
`console.log` of form/draft/storage content found. The `makeEntryId` fix is applied
consistently at every entry-creation site (`plan-section.tsx`'s `addStay`/`addActivity`/
`addTransport`, `booking-form.tsx`'s seeding effect); no leftover private counter found.

**Findings:** two, both non-blocking — full detail in `docs/security/security-review.md`
(review dated 2026-09-23):
- **F-1 (Low):** the booking-form seeding effect does not cap seeded `stays`/`activities`
  against `MAX_STAYS`/`MAX_ACTIVITIES`, and is reachable through ordinary use (picking
  more than 8 stays or 15 activities across the full catalogues, then opening
  `/bookings`), not only via a hand-edited `localStorage` value. Client-side-only impact.
- **F-2 (Informational):** `lib/trip-selections.ts`'s parser drops a destination/
  accommodation cross-check the code it replaces had. Cosmetic-only impact (a mismatched
  destination/property pair could display); not reachable through the normal UI, only via
  a hand-edited `localStorage` value.

No High or Medium findings. Neither finding blocks this handoff.

**Documentation:** `docs/security/security-review.md` created (first entry in that file;
the directory was previously empty).

**Status:** Reviewed. **READY** — no blocking findings. F-1 and F-2 left open for the
Full-Stack Engineer to pick up at their discretion; both are low-impact, client-side-only,
and do not require a re-review before the rest of this feature is considered complete.

## Handoff — Orchestrator: F-1/F-2 remediated, site-header finding resolved (2026-09-23)

**From:** Orchestrator. **To:** record (no further agent action required).

**F-1 and F-2 fixed.** `components/booking/booking-form.tsx`'s seeding effect now slices
both source lists to `MAX_STAYS`/`MAX_ACTIVITIES` before building entries (imported from
`lib/booking-request.ts`, the same constants `plan-section.tsx`'s "Add" buttons already
gate on). `lib/trip-selections.ts`'s `parse()` now re-checks
`getAccommodationBySlug(accommodation)?.destinationSlug === destination` before keeping a
stored stay, restoring the cross-check `np.stays.v1` had. Re-verified after both fixes:
`npm run lint`, `npm run typecheck`, and `npm run build` all clean. Both findings updated
to **Fixed** in `docs/security/security-review.md`.

**`components/site-header.tsx` nav-removal finding: not a regression, resolved.** The
UI/UX Designer's review flagged the removed `{ href: "/plan", label: "Plan" }` nav entry
as undocumented and out of scope for the trip-selections handoff. That's correct as far
as the reviewer could see — but the removal was in fact a separate, explicit request the
user made directly to the Orchestrator earlier in the same working session, before the
trip-selections feature was started; it only appeared "bundled" in the diff because both
changes share an uncommitted working tree, not because it was silently introduced by the
Full-Stack Engineer's work. No code change was needed. Noting it here, rather than
silently dropping the finding, per policy §18 ("never leave... unresolved issues" hidden)
— a reviewer flagging a real-looking gap it had no visibility into is the review process
working correctly, not a false alarm to wave away without a record.

**Status:** Feature complete. READY.

## Handoff — Full-Stack Engineer → Cybersecurity Agent: booking delivery connected (2026-09-23)

**From:** Full-Stack Engineer. **To:** Cybersecurity Agent.

**Task:** connect real delivery for `/bookings` (D-23) — build `POST /api/bookings`, wire
`submitBookingRequest` to it, send the notification email via Resend. Requested by the
user with the explicit condition "it needs to be secured very well."

**Why this handoff matters more than most of the ones above it:** every prior handoff in
this file touched client-side state (`localStorage`) or read-only content pages. This is
the first change since D-19 that (a) sends real traveller PII over the network to a real
third-party service, and (b) adds a newly-public write surface — `POST /api/bookings`
accepts unauthenticated input from anyone on the internet, not just a browser navigating
this site. D-19 named this exact gap explicitly: *"a Cybersecurity review is required
before delivery is connected."* Please review this as that review, not as a formality —
nothing in this entry should be read as self-certifying its own security.

**Completed:**
- `lib/validation.ts`: `bookingDraftRequestSchema`, a Zod schema mirroring `BookingDraft`
  field-for-field, replacing an older, unused schema for a different (simpler, predating
  `BookingDraft`) enquiry shape. Every slug the client sends is re-checked against
  `lib/content.ts`'s live data. `strictObject` throughout — unknown keys are rejected.
- `app/api/bookings/route.ts`: size guard (50 KB) → rate limit (`lib/rate-limit.ts`,
  pre-existing, previously unused) → `Content-Type` check → JSON parse → schema
  validation → honeypot branch → compose (`lib/booking-email.ts`) → send via Resend.
  `replyTo` set to the traveller's own email. Every error path returns the pre-existing,
  previously-unused `ApiErrorBody`/`ApiErrorCode` envelope from `lib/types.ts`, with a
  `correlationId` also logged server-side — the client never sees a raw provider error.
- `lib/env.ts`: `RESEND_API_KEY` (secret, hard-fails production startup if unset, same
  treatment as `BOOKINGS_NOTIFICATION_EMAIL`) and `RESEND_FROM_EMAIL`.
- `components/booking/booking-form.tsx`: an off-screen, `aria-hidden`, `tabIndex={-1}`
  honeypot input bound to a new `BookingDraft.website` field; `handleSubmit` now catches
  a thrown `BookingSubmissionError` and surfaces it through the existing `ErrorSummary`,
  keeping the traveller's draft intact for a retry.
- `next.config.ts`: `Cache-Control: no-store` on `/api/:path*`.
- Full detail and every alternative considered: D-23 in
  `docs/decisions/architecture-decisions.md`.

**Files changed:**
- New: `app/api/bookings/route.ts`, `lib/booking-email.ts`, `docs/api/endpoints.md`,
  `docs/api/api-overview.md`
- Modified: `lib/validation.ts` (near-total rewrite), `lib/env.ts`, `lib/booking-request.ts`,
  `lib/types.ts`, `components/booking/booking-form.tsx`, `next.config.ts`, `.env.example`,
  `package.json`/`package-lock.json` (added `resend`), `docs/decisions/architecture-decisions.md`
  (new D-23, D-19 updated in place), `docs/architecture/application-architecture.md` (new
  §9.2), `docs/deployment/environment.md` (§2.2.1/§2.2.2, §7 item 1 closed),
  `docs/deployment/deployment.md` (§11 item 5 partially closed — `/api/bookings` only,
  `/api/health` still open per item 2, out of scope for this task)

**Testing:** `npm run lint`, `npm run typecheck`, `npm run build` all clean —
**important:** the build required `BOOKINGS_NOTIFICATION_EMAIL`/`RESEND_API_KEY` supplied
inline for the verification run only (`BOOKINGS_NOTIFICATION_EMAIL=... RESEND_API_KEY=...
npm run build`), never written to any file; see "known issues" below, this is now a real
production requirement, not a test artefact. Manually exercised every response path against
a running dev server with `curl`: `200` genuine success path confirmed valid *up to* the
delivery step (verified it fails at `503` only because no Resend key exists locally, not
because validation rejected it), `200` honeypot-faked success (confirmed distinct from the
genuine path only in that no email is attempted), `400` malformed JSON, `400` validation
failure with per-field messages, `413` oversized body, `415` wrong content type, `429` rate
limited with a `Retry-After` header (confirmed the configured `BOOKING_RATE_LIMIT_MAX=5`
was enforced exactly), `503` delivery not configured, `405` with an `Allow: POST` header on
every other method. **A real bug was caught and fixed during this testing**, not before it:
the honeypot's first implementation failed schema validation on a filled `website` field
and returned `400` naming that exact field and rule — a textbook honeypot leak, since the
entire point is that a bot learns nothing about which check it tripped. Fixed by letting
the field parse successfully and branching on it in the route handler instead. Please treat
this as a signal to look hard at the honeypot and rate-limit logic specifically, not as
"already caught, so it's fine now" — I found this one; there is no guarantee it is the only
one of its kind.

**Security-sensitive areas — please look specifically at:**
- **The honeypot fix above** — confirm the new design (schema accepts, route branches)
  really does leak nothing else (timing differences, response header differences, etc.
  between the honeypot path and a genuine success).
- **Every slug cross-check** in `lib/validation.ts` (destination/accommodation pairing,
  package/experience/activity existence) — confirm there's no path where an unvalidated
  slug still reaches `lib/booking-email.ts` and, from there, the notification email.
- **Rate limiting**, given it now protects a real external API call with real (if small)
  cost implications, not just a `localStorage` write. The per-instance limitation is
  pre-existing and documented (`lib/rate-limit.ts`, `docs/api/api-overview.md`) — confirm
  the 50 KB body cap and the `MAX_STAYS`/`MAX_ACTIVITIES`/`MAX_TRANSPORT` array caps
  (inherited from `lib/booking-request.ts`, applied in the new schema) are enough to bound
  the cost of a single accepted request even under sustained abuse within the rate limit.
- **Error responses never leaking provider detail** — I wrote this deliberately (`502`/`503`
  never forward Resend's own error text), but I have not seen Resend's real error shapes
  under a real API key; confirm nothing in a real failure response would need a second look.
- **The email content itself** (`lib/booking-email.ts`) — plain text only, by design (see
  D-23's alternatives), specifically to avoid needing an HTML-escaping discipline across a
  field set this large. Confirm that reasoning holds and that nothing about a plain-text
  body sent through Resend's API reopens a risk I assumed plain text closed.
- **PII handling generally**: traveller name/email/phone/nationality now leave the system
  for the first time, to Resend, over HTTPS, carrying no other destination. Confirm this
  is what "PII handling" should mean here given there is still no database, no logging of
  request bodies, and no third party besides Resend involved.

**Known issues / limitations (all also recorded in D-23):**
- No database — the email is the only record of a submitted request.
- Resend's sandbox-mode restriction (real delivery needs a verified sending domain first;
  until then Resend only delivers to the account's own address).
- Production `next build` now genuinely requires `RESEND_API_KEY` and
  `BOOKINGS_NOTIFICATION_EMAIL` to be set — previously true in theory, never enforced in
  practice, because nothing under `app/` imported `lib/env.ts` before this change.
- A request missing an entire top-level object (not just an invalid field within one)
  surfaces a generic Zod message rather than a traveller-friendly one. Not reachable
  through the real form, which always sends every key.
- **Not verified**: an actual Resend delivery. No real `RESEND_API_KEY` was available
  during this work. The `resend.emails.send` call, and Resend's real error shapes on
  failure, are unverified beyond what the published SDK types document.

**Required action:** Application security review before this is considered fully
reviewed, per D-19's original condition and the user's explicit request. Please record
findings the same way the previous review did — `docs/security/security-review.md`
(append, do not overwrite the existing D-21 entry) and a reply handoff here.

**Status:** Awaiting Cybersecurity review. NOT YET READY to be considered complete without it.

## Handoff — Cybersecurity review result: booking delivery connected, D-23 (2026-09-23)

**From:** Cybersecurity / Application Security Agent. **To:** Orchestrator.

**Reviewing:** the handoff immediately above ("Full-Stack Engineer → Cybersecurity Agent:
booking delivery connected"). Reviewed adversarially, against a running `npm run dev`
instance seeded with a fake-but-syntactically-valid Resend key, not by reading the diff
and trusting the engineer's own test report — every response path and every claim in that
handoff was independently re-sent and re-checked. Full detail, every request sent and
every response received, is in `docs/security/security-review.md` (review dated
2026-09-23, "Booking delivery connected"); this entry summarises it.

**Completed:** read `docs/decisions/architecture-decisions.md` D-23 and D-19 in full, then
the complete diff of every changed/new file in scope, before any testing. Ran
`npm run lint`, `npm run typecheck`, `npm run build` directly. Started the dev server
myself and adversarially exercised: the 50 KB size guard (including a raw-socket request
with a lied `Content-Length` header and a real ~1 MB body, missing `Content-Length`,
`Transfer-Encoding: chunked` with no length, and pathological deeply-nested/wide JSON
right under the byte cap); the honeypot path (response shape, response status, server-side
email-send code path, and response timing); the rate limiter (repeated requests with a
freshly spoofed `X-Forwarded-For` per request); schema completeness (fabricated
destination/accommodation slugs, an oversized array, an unrecognised key, a client-
supplied `id`); CORS (cross-origin preflight and POST); and every documented response code
(`200` genuine and honeypot, `400` × 3 varieties, `413`, `415`, `429` with `Retry-After`,
`502`, `405` on every non-`POST` method).

**Findings — full detail in `docs/security/security-review.md`:**

- **F-3 (High), CONFIRMED and FIXED in this review.** `clientKey()` in
  `app/api/bookings/route.ts` keyed the rate limiter on the *first* entry of
  `X-Forwarded-For` — entirely attacker-controlled. Demonstrated: 8 consecutive requests
  from one process, one real source, each with a freshly fabricated `X-Forwarded-For`
  value, all bypassed the limiter completely (no `429` at all). This is a materially
  worse hole than the "per-instance" limitation `lib/rate-limit.ts` and
  `docs/api/api-overview.md` already disclose — it is a single-process, zero-
  infrastructure, complete bypass of the one control bounding the cost/abuse surface of a
  real paid external API call, not a proportional weakening under horizontal scaling.
  **Fixed:** now keys on the *last* entry — the value a single trusted reverse-proxy hop
  (Vercel's edge, this project's deployment target) appends based on the connection it
  actually observed. Re-verified directly: the same spoofing attack, repeated post-fix,
  now correctly throttles at request 6. `docs/api/endpoints.md` updated to match.
  **Flagged, not silently assumed:** this fix's safety depends on Vercel's edge network
  actually appending rather than forwarding the client's header unchanged — unverified,
  since no production Vercel deployment exists yet. DevOps should confirm this at or
  before first real deploy; the code comment and `docs/api/endpoints.md` both say so.
- **F-4 (Low/Informational), CONFIRMED, left open.** The honeypot path responds in
  single-digit-to-low-double-digit milliseconds; a genuine submission that reaches the
  Resend call takes roughly 300–900 ms even on failure, because it makes a real outbound
  HTTPS call first. Measured directly (5 runs each side). A scripted bot could use this
  timing gap to identify the honeypot field, similar in effect to the field-naming leak
  already found and fixed by the Full-Stack Engineer, just through a slower channel.
  Bounded impact — does not expose PII, does not bypass rate limiting or validation, and
  the realistic payoff to an attacker is small. **Not fixed** — the available
  countermeasure (artificial delay on the honeypot branch) is a product/performance
  trade-off, not an unambiguous bug fix, so it is flagged for the team to decide rather
  than silently applied.

**Confirmed clean (adversarially tested, not just read):**
- The 50 KB size guard: a lied `Content-Length` header cannot be used to smuggle an
  unbounded body past the app — Node's own HTTP layer rejects the mismatched framing with
  a `400` after a bounded overrun (well under 1 MB observed), before the app's own check
  even runs. Missing/invalid `Content-Length` and chunked transfer without one are both
  rejected immediately, fail closed. Deeply-nested and wide JSON payloads right under the
  byte cap parse and get rejected in well under 100 ms with no crash and no measurable
  server impact.
- Honeypot: a filled `website` field returns byte-for-byte the same `{ "id": ... }`
  `200` shape a genuine success uses, confirmed both by request and by reading the code —
  the honeypot branch returns before `buildBookingEmail` or `resend.emails.send` is ever
  reached, so no email is composed, not merely undelivered.
- Email injection: the Resend call passes structured JSON fields, never a concatenated
  raw header block; `text` only, no `html`; the subject line strips `\r`/`\n`; every
  free-text field that reaches the email body has an explicit, server-enforced `.max()`.
- Schema completeness: `strictObject` at every level; every array capped at
  `MAX_STAYS`/`MAX_ACTIVITIES`/`MAX_TRANSPORT` imported (not restated) from
  `lib/booking-request.ts`; every slug cross-checked against live `lib/content.ts` data,
  including the destination/accommodation pairing carried over from the prior review's
  F-2 fix. Verified with real fabricated-slug and oversized-array requests, all rejected.
- Secret hygiene: `RESEND_API_KEY` never appears in a log line, a response body, or any
  client-reachable path — grepped the full diff. `.env.local` is gitignored, holds no
  real credentials, and was never part of this diff. Every `502`/`503` response carries
  only a generic message and a `correlationId`; server-side logs carry Resend's own
  `error.name`/`error.message`, never the key or a raw stack trace.
- CORS: no `Access-Control-*` header anywhere, confirmed with a real cross-origin
  preflight and POST.
- ID integrity: the returned `id` is always server-generated
  (`generateBookingRequestId()`, CSPRNG); a client-supplied `id` field is rejected by
  `strictObject` before the handler logic runs, and the handler never reads one from the
  body regardless.

**Not verified (disclosed, not silently skipped):** actual Resend delivery — no real
`RESEND_API_KEY` was available to this review either, matching the engineer's own
disclosure. All delivery-path testing reached Resend's own auth check and failed there
(`502`), which confirms the request path and error-hygiene behaviour but not a real
message ever landing in an inbox, nor Resend's error shape for failure modes other than an
invalid key. Vercel's actual `X-Forwarded-For` handling, per F-3 above, is also unverified
— no production deployment exists yet.

**Files changed by this review:** `app/api/bookings/route.ts` (F-3 fix — `clientKey()`
now keys on the last `X-Forwarded-For` entry, with an expanded comment on the trust
assumption), `docs/api/endpoints.md` (rate-limiting section updated to match),
`docs/security/security-review.md` (this review appended), `docs/agents/handoffs.md`
(this entry). F-4 was deliberately **not** code-fixed — see above.

**Testing after the fix:** `npm run lint`, `npm run typecheck`, `npm run build` all
re-run clean. The rate-limit-bypass test was re-run against the fixed code and now
correctly returns `429` at the configured `BOOKING_RATE_LIMIT_MAX`.

**Status:** Reviewed. **NEEDS CHANGES → now READY**, conditional on DevOps confirming the
`X-Forwarded-For` trust assumption in F-3 before or at first real deploy (no production
Vercel environment exists yet to verify it against today, so it cannot be closed out
further from here). F-4 is left open at Low/Informational severity for the team to decide
whether it's worth closing; it does not block shipping. This review found and fixed one
real, concretely exploitable High-severity hole rather than rubber-stamping the engineer's
own (thorough, and mostly accurate) self-testing — see D-23's own text: "nothing in this
entry should be read as self-certifying its own security," which held true here.
