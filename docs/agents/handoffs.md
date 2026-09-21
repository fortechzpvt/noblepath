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
