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
