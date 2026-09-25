# Noble Path — Architecture & Design Decision Records

Every significant technical and design decision on this project is recorded here. A decision
that exists only in an agent conversation is not a decision — it is undocumented project
knowledge (Fortechz policy §19).

This file holds two numbered sets, in separate namespaces so they cannot be confused:

| Prefix | Meaning | Author |
| --- | --- | --- |
| `ADR-xxx` | Architecture decisions | Orchestrator, DevOps, Full-Stack |
| `IMPL-xx` | Approved implementation deviations from the design specification (inside ADR-011) | Orchestrator |
| `DD-xx` (recorded below as `D-xx`) | UI/UX design decisions, cited throughout `docs/design/` | UI/UX Designer |

> **File-integrity note (2026-09-19).** ADR-001–008 were destroyed when an agent wrote this
> file whole rather than appending to it. They have been **restored verbatim by their author**
> (the Orchestrator) from its own record — not reconstructed by inference, which policy §18
> would forbid. The `D-xx` / implementation-deviation collision noted at the time has been
> resolved by renaming the *implementation* deviations to `IMPL-xx`; the designer's `D-xx` IDs
> are cited from all five documents in `docs/design/` and were deliberately left unchanged, as
> renaming them would have broken those references for no benefit.

**Format:** Decision / Context / Alternatives considered / Chosen solution / Consequences.

---

## ADR-001 — Next.js 16 (App Router) with React Server Components

**Date:** 2026-09-19 · **Status:** Accepted · **Decided by:** Orchestrator

**Decision**
Build Noble Path as a Next.js 16 application using the App Router and React Server
Components, in TypeScript with `strict` and `noUncheckedIndexedAccess` enabled.

**Context**
The site is content-heavy, image-heavy and read-mostly, with one small write path. The
binding requirements are LCP ≤ 2.5s on 4G mobile (NFR-1), CLS ≤ 0.1 (NFR-2), strong SEO
for inbound tourist search, and a hero payload under 300KB (NFR-9).

**Alternatives considered**
- *Astro* — excellent for static content, but the itinerary builder (FR-4) is a genuinely
  stateful interactive application, and Astro's islands model would have made that the
  awkward exception rather than a first-class part of the app.
- *Vite + React SPA* — fails the SEO and LCP requirements outright. A travel site that does
  not rank in search has no acquisition channel.
- *WordPress* — fastest to content, but the cinematic design direction and the itinerary
  builder would both fight the platform, and performance would need constant defending.
- *Next.js Pages Router* — mature, but on a greenfield build there is no reason to adopt
  the superseded routing model.

**Chosen solution**
Next.js 16 App Router. Content pages are server components with zero client JavaScript;
interactivity (filters, planner, booking form) is isolated into explicitly-marked client
components. `next/image` handles AVIF/WebP conversion and responsive sizing, which is what
actually satisfies NFR-9.

**Consequences**
- The client bundle stays small because interactivity is opt-in per component.
- The team must be disciplined about the server/client boundary; a stray `"use client"`
  high in the tree silently forfeits the benefit.
- Deployment needs a Node runtime or a platform with first-class Next.js support.

---

## ADR-002 — Editorial content as version-controlled TypeScript, not a CMS or database

**Date:** 2026-09-19 · **Status:** Accepted · **Decided by:** Orchestrator

**Decision**
Destinations, experiences and trip packages live in `content/*.ts` as typed data compiled
into the build. There is no CMS and no content database in v1.

**Context**
v1 has roughly 21 destinations, 33 experiences and 7 packages. This content changes rarely
— a destination's description is stable for months. The people writing it are, for now,
the engineering team.

**Alternatives considered**
- *Headless CMS (Sanity/Contentful/Strapi)* — the right answer once non-technical editors
  exist, but in v1 it adds a vendor, a runtime dependency, an API key to protect, a network
  hop on every render, and a whole class of "the CMS is down" failures, in exchange for
  editing convenience nobody currently needs.
- *PostgreSQL* — same overhead, plus schema migrations and a backup regime, for data that
  is read-only at runtime.
- *Markdown/MDX files* — closer, but loses compile-time type safety. Dangling cross-references
  between destinations, experiences and trip days are the single most likely content bug on
  this project, and the type system catches them for free.

**Chosen solution**
Typed TypeScript modules with build-time integrity checks in `lib/content.ts` that throw on
a dangling slug. Content is reviewed like code.

**Consequences**
- Zero runtime content-fetch latency and zero content-availability risk.
- Broken cross-references fail the build instead of producing a 404 in production.
- Every content change requires a deploy — acceptable at this cadence, and the documented
  trigger for revisiting this decision.
- `lib/content.ts` is a deliberate seam: a CMS can be introduced behind those accessors
  without touching a single page component.

---

## ADR-003 — No database in v1

**Date:** 2026-09-19 · **Status:** Accepted · **Decided by:** Orchestrator

**Decision**
v1 ships without a database. Content is compiled (ADR-002) and booking enquiries are not
persisted by the application.

**Context**
The only candidate for persistence is the booking enquiry. At launch, enquiry volume will
be low enough for staff to handle from a notification.

**Alternatives considered**
- *PostgreSQL from day one* — the eventual destination, but adding it now means provisioning,
  connection management, migrations, backups, restore testing, and holding traveller PII at
  rest with all the retention and deletion obligations that follow, before we know the
  enquiry volume justifies any of it.
- *SQLite on the app instance* — fails as soon as there is more than one instance, and
  silently loses data on an ephemeral filesystem. A worse failure mode than not persisting at all.

**Chosen solution**
No database. `POST /api/bookings` validates, rate-limits, returns a reference code, and logs
non-PII metadata. The handler has one clearly-marked seam where a persistence or delivery
adapter is dropped in.

**Consequences**
- No PII at rest, and no injection or connection-exhaustion surface.
- Enquiry durability depends on the notification path. **This is the main risk of v1** and is
  recorded as a known limitation, not hidden.
- The forward schema is already specified in `docs/database/database-schema.md`, so adding
  PostgreSQL later is an implementation task, not a design task.

---

## ADR-004 — Bookings are enquiries in v1; no card payments

**Date:** 2026-09-19 · **Status:** Accepted · **Decided by:** Orchestrator, endorsed by Cybersecurity

**Decision**
The Bookings section collects a structured enquiry. It does not capture card details or
process payments.

**Context**
FR-5 requires visitors to be able to book packages and services. Taking card payments would
put Noble Path in PCI-DSS scope and would require a payment provider integration, a refund
and dispute process, and a fraud posture — none of which exist yet.

**Alternatives considered**
- *Stripe Checkout / Payment Links* — keeps card data off our infrastructure (SAQ A) and is
  the likely v2 answer, but still needs a real pricing model, a cancellation policy, refund
  handling and supplier settlement before it can responsibly go live.
- *Full card capture on-site* — rejected outright. Maximum PCI scope and maximum liability
  for a business that has not launched.

**Chosen solution**
Enquiry-first. Prices are shown as indicative bands and labelled as such (requirements §7.4).

**Consequences**
- v1 is entirely out of PCI-DSS scope.
- Conversion is slower — a human must follow up on every enquiry. Accepted for launch.
- Payments become a separate project with its own threat model and security review.
- This narrows the designer's D-11 (guest checkout) considerably for v1: there is no
  checkout, no magic link and no account upgrade to secure yet.

---

## ADR-005 — Tailwind CSS v4 with CSS custom properties as design tokens

**Date:** 2026-09-19 · **Status:** Accepted · **Decided by:** Orchestrator with UI/UX Designer

**Decision**
Style with Tailwind CSS v4. The approved design tokens are declared once as CSS custom
properties in a `@theme` block in `app/globals.css` and consumed as Tailwind utilities.
Recurring multi-property recipes — glass surfaces, the scrim layers, the dual focus ring,
the measure constraints — are expressed once as `np-*` utilities rather than repeated as
long class strings.

**Context**
The design direction is specific: an exact type scale, named glass-surface recipes, and
motion curves that must be identical everywhere. The implementation has to be traceable
back to the approved design specification (Fortechz policy §12).

**Alternatives considered**
- *CSS Modules* — full control, but no shared constraint system; the type scale drifts
  component by component, which is exactly the failure this design cannot absorb.
- *styled-components / Emotion* — runtime CSS-in-JS forces client components and fights
  RSC. Wrong tool for a server-rendered content site.
- *Tailwind v3* — works, but v4's native `@theme` makes the design tokens the literal
  source of truth rather than a config file that mirrors them.

**Chosen solution**
Tailwind v4 with `@theme`, copied verbatim from `docs/design/design-system.md` §12.

**Consequences**
- Design and code share one vocabulary; a reviewer can diff the spec against `globals.css`.
- Tailwind v4 requires the `@tailwindcss/postcss` plugin — noted in the troubleshooting runbook.
- The designer's D-14 applies: `--breakpoint-*: initial` clears Tailwind's defaults, so
  `sm:` must never appear in the codebase.

---

## ADR-006 — Owned photography where it exists, freely-licensed photography elsewhere

**Date:** 2026-09-19 · **Status:** Accepted, superseded in part — see Consequences · **Decided by:** Orchestrator

**Decision**
Use Noble Path's own photographs where they exist. Fill the remainder with freely-licensed
photography from Wikimedia Commons, downloaded and self-hosted under `public/images/`, with
author and licence recorded for every file.

**Context**
Five owned photographs are available (the Sigiriya hero, Ella, south-coast surfing, a jungle
villa, a tuk-tuk road trip). The site needs roughly sixty images.

**Alternatives considered**
- *Ship with only five images* — the design is built on full-bleed photography; it does not
  survive twenty-one destinations sharing five photographs.
- *Generated imagery* — dishonest for a travel product. A visitor deciding where to spend two
  weeks is entitled to see the actual place.
- *Unsplash hotlinked* — the original plan. Rejected in execution: it puts a third-party CDN
  on the critical render path, requires widening the CSP `img-src` and `next/image`
  `remotePatterns`, and its licence is weaker for commercial use than an explicit CC licence
  with recorded attribution.

**Chosen solution**
Self-hosted, CC0 / CC BY / CC BY-SA / public-domain images sourced from Wikimedia Commons,
selected programmatically with a landscape and resolution filter, and recorded with author,
licence and source URL in `docs/design/photography-credits.md`.

**Consequences**
- No third-party image origin at all: `img-src 'self'` and no `remotePatterns` entry.
- Attribution is a real obligation — CC BY-SA images require credit, and the credits file
  must ship with the site, not just live in `docs/`.
- **Known limitation:** this is licensed stock, not Noble Path's own art direction. Replacing
  it with commissioned photography remains the goal before a full commercial launch.

---

## ADR-007 — Itinerary generation runs on the client, deterministically

**Date:** 2026-09-19 · **Status:** Accepted · **Decided by:** Orchestrator with Full-Stack Engineer

**Decision**
`generateItinerary` is a pure, deterministic function executed in the browser. The visitor's
plan persists in `localStorage`. No account, no server round trip.

**Context**
FR-4.4 requires a plan to survive between visits without an account. FR-4.3 requires
add/remove/reorder to feel immediate.

**Alternatives considered**
- *Server-side generation* — a network round trip on every edit, for a computation that takes
  microseconds over data the client already has. It would also mean storing plans server-side,
  which means identifying users, which means accounts (explicitly out of scope).
- *An LLM-generated itinerary* — attractive, but non-deterministic, slow, costly per request,
  and capable of confidently inventing a road that does not exist. A travel plan a visitor
  will physically follow must be reproducible and grounded in curated data. Revisit only with
  the AI/ML Engineer, retrieval strictly constrained to `content/*`, and human review.

**Chosen solution**
A deterministic scoring and greedy nearest-neighbour routing pass over the compiled content,
seasonally weighted for the two monsoons.

**Consequences**
- Instant, offline-capable, free to run, and reproducible — the same input always yields the
  same plan, which makes it testable and makes support conversations possible.
- Itinerary quality is bounded by the curated content and the scoring heuristic rather than
  by a model. This is the correct trade for v1.
- The plan lives only in that browser. Clearing site data loses it — documented in the UI.
- This is why no AI/ML Engineer was engaged on v1: there is no model, prompt or retrieval
  pipeline to document.

---

## ADR-008 — Security headers and CSP defined in `next.config.ts`

**Date:** 2026-09-19 · **Status:** Accepted, reviewed by Cybersecurity · **Decided by:** Orchestrator

**Decision**
A strict Content-Security-Policy plus HSTS, `X-Content-Type-Options`, `X-Frame-Options`,
`Referrer-Policy`, `Permissions-Policy` and COOP are applied to every route from
`next.config.ts`.

**Context**
The site is public, unauthenticated and accepts user input on one endpoint. Defence in depth
is cheap here and the attack surface is small enough to keep the policy genuinely tight.

**Alternatives considered**
- *Headers at the CDN/platform layer* — works, but the policy then lives outside the repository,
  is invisible in review, and drifts per environment.
- *A nonce-based CSP* — stricter, and the correct end state. It requires middleware to generate
  a per-request nonce and forfeits full static optimisation on affected routes. Deferred.

**Chosen solution**
Headers in `next.config.ts`, version-controlled and reviewable. `style-src` permits
`'unsafe-inline'` because Next.js injects critical CSS inline during streaming;
`script-src` additionally permits `'unsafe-eval'` **in development only** for HMR.
Fonts are self-hosted by `next/font`, so no third-party font origin is allowed; images are
self-hosted (ADR-006), so no third-party image origin is allowed either.

**Consequences**
- The policy is diffable and reviewed like code.
- `'unsafe-inline'` on `style-src` is a real, accepted residual risk — recorded for the
  Cybersecurity Agent rather than quietly ignored. The exit is a nonce-based policy.

---


## ADR-009 — Host on Vercel; keep a maintained container image as the exit

**Date:** 2026-09-19 · **Status:** Accepted · **Decided by:** DevOps Engineer, ratified by Orchestrator

**Decision**
Deploy Noble Path to Vercel. Maintain a production-grade `Dockerfile` in the repository
that is built and kept working, but not used in production.

**Context**
The application is a Next.js 16 app with no database (ADR-003) whose dominant runtime
workload is `next/image` optimisation over heavy photography (ADR-006, NFR-9).

**Alternatives considered**
- *A container platform (ECS/Cloud Run/Fly)* — the usual argument for containers is that
  the app has stateful dependencies to sit next to. Here there are none, which removes the
  strongest reason to take on the operational burden. It would also mean running and tuning
  our own image-optimisation tier, which is precisely the workload that would dominate cost
  and latency.
- *Static export to object storage + CDN* — cheapest of all, but `POST /api/bookings` needs
  a server, and `next/image` optimisation would have to be pre-generated or dropped.
- *A traditional VPS* — lowest cost, highest operational load, and no preview deployments.

**Chosen solution**
Vercel, with preview deployments per pull request so the UI/UX Designer can review real
builds on real devices.

**Consequences**
- Platform lock-in is real and accepted. It is mitigated by keeping the container image
  working, so the exit is a deployment change rather than a rewrite.
- `output: "standalone"` is set in `next.config.ts` for that image. It is inert on Vercel.
- **Revisit when:** a database or a shared rate-limit store is introduced, egress or image
  optimisation cost becomes material, or a compliance requirement dictates the hosting region.

---

## ADR-010 — Production deploys are gated structurally, not by convention

**Date:** 2026-09-19 · **Status:** Accepted · **Decided by:** DevOps Engineer, ratified by Orchestrator

**Decision**
Production deployment runs only via manual dispatch, in a job declaring a GitHub
`production` Environment with required reviewers, and only from the default branch.
Production credentials are **environment-scoped**, never repository-scoped.

**Context**
Fortechz rule 3: production is never modified without explicit human approval. A rule that
lives only in a document gets forgotten at 2am; a rule enforced by the pipeline does not.

**Alternatives considered**
- *Documented convention alone* — free, and worth exactly what it costs.
- *Branch protection only* — controls what merges, not what deploys.
- *Auto-deploy the default branch to production* — fastest, and directly contrary to the rule.

**Chosen solution**
Scoping is the mechanism, not a nicety. A repository secret is readable by every job; an
environment secret only resolves inside a job that declares that environment, so the
production token is not decryptable until a reviewer approves. The gate is therefore
cryptographic rather than procedural.

**Consequences**
- A production deploy always waits for a named human.
- **Vercel's own Git auto-deploy to production must be disabled.** If Vercel also deploys the
  default branch, the gate is bypassable and therefore worthless. This is easy to miss and is
  recorded in `docs/deployment/deployment.md` as a one-time setup step.
- The gate is **specified but unrehearsed** — it has never been dispatched, because no GitHub
  repository or Vercel project exists yet. It is a design claim until verified once, and is
  tracked as a required action in `docs/testing/test-results.md`.

---

## ADR-011 — Approved implementation deviations from the design specification

**Date:** 2026-09-19 · **Status:** Accepted · **Decided by:** Orchestrator

**Decision**
The implementation departs from `docs/design/` in the six places listed below, and nowhere
else. Each is recorded here so the UI stays traceable back to the approved design
(Fortechz policy §12) and so nobody "fixes" one of them back into a defect.

These use the `IMPL-xx` namespace. The designer's own deviations from the mockup
(D-01 link colour, D-02 hero lead typeface) are a different set
are recorded in `docs/design/design-system.md` §13 and are implemented as specified.

| ID | Spec says | Shipped | Why |
| --- | --- | --- | --- |
| **IMPL-01** | Trust bar reads "Secure Payments" | "Secure Booking" | v1 takes no card payments at all (ADR-004). Advertising secure payments on a site that cannot take one is a false claim to a real visitor, not a cosmetic difference. Restore when payments exist. |
| **IMPL-02** | Cards show a concrete price — "From $45", "From $1,450 /person" | The indicative band's label, plus an explicit "indicative · per person" qualifier | The domain model carries a band, not a quote, because requirements §7.4 says prices are indicative. Rendering an invented figure would be a price Noble Path cannot honour. The screen-reader text spells the band out in full so it is never announced as a bare symbol. |
| **IMPL-03** | Home S8 is a newsletter sign-up band | Same position and weight, but carrying the two actions that work: *Plan your trip* and *Make an enquiry* | There is no mailing list, no consent record and no endpoint to receive an address. An email field there would be a control that silently does nothing, which is worse than not offering it. Restore when a list exists. |
| **IMPL-04** | Nav includes Search and a Trip tray | Neither is shipped | Search is not in scope for v1 (requirements §3), and a trip tray implies a cross-page saved-items model that only the Plan page currently has. Shipping dead affordances in the primary navigation would be worse than omitting them. |
| **IMPL-05** | Nav is `position: sticky` | `position: fixed` | The approved mockup shows the nav sitting *over* the hero photograph, which is the whole point of the transparent variant. `sticky` would reserve layout space above the full-bleed hero. Scroll behaviour, hysteresis and the solid/transparent switch are otherwise as specified. |
| **IMPL-06** | Nav switches to solid via an `IntersectionObserver` sentinel at the hero's bottom edge | A passive scroll listener with a 24px threshold | Functionally equivalent for a single-sentinel case and materially simpler. The listener is `{ passive: true }` and writes only a boolean to state — it never reads layout, which is the failure mode the spec was guarding against. Worth revisiting if a second sentinel is ever needed. |

**Consequences**
- D-03, D-05 and D-06 all have the same root cause: the design was drawn for the product
  Noble Path intends to become, and v1 is deliberately narrower. Each has an explicit
  restore condition rather than an open question.
- Any further departure from the design specification must be added to this table before
  it is merged. An undocumented deviation is a defect.

---

# UI/UX design decisions (D-xx)

Authored by the UI/UX Designer and cited throughout `docs/design/`.

## Index

| ID | Title | Area | Date | Status |
|---|---|---|---|---|
| D-01 | Replace the mockup's blue "View all" link with white + amber underline | Design | 2026-09-19 | Approved |
| D-02 | Hero lead paragraph moves from display serif to Poppins | Design | 2026-09-19 | Approved |
| D-03 | Hero CTA label stays in the display serif | Design | 2026-09-19 | Approved |
| D-04 | Trust bar reflows below the thumbnail rail under 1024 px | Design | 2026-09-19 | Approved |
| D-05 | Navigation gains a persistent Book pill; About Us overflows at 1024–1199 | Design | 2026-09-19 | Approved |
| D-06 | Add-to-trip uses an inline popover, not a modal | Design | 2026-09-19 | Approved |
| D-07 | Form control boundaries use `--color-ink-400`, not a sand tone | Design / a11y | 2026-09-19 | Approved |
| D-08 | Typeface pairing: Playfair Display + Poppins | Design | 2026-09-19 | Approved |
| D-09 | Measured-scrim contrast model for text over photography | Design / a11y | 2026-09-19 | Approved |
| D-10 | Dual focus ring instead of a single outline | Design / a11y | 2026-09-19 | Approved |
| D-11 | Guest checkout; no account required before payment | Product / Design | 2026-09-19 | Approved — **security review required** |
| D-12 | "Load more" instead of infinite scroll | Design | 2026-09-19 | Approved |
| D-13 | Light working surfaces for all transactional UI | Design | 2026-09-19 | Approved |
| D-14 | Breakpoint set replaces Tailwind's defaults entirely | Design / Front-end | 2026-09-19 | Approved |
| D-15 | Target size set at 44 × 44 (AAA) rather than the AA 24 × 24 | Design / a11y | 2026-09-19 | Approved |
| D-16 | AAA contrast (7:1) explicitly **not** targeted | Design / a11y | 2026-09-19 | Approved with documented exception |
| D-18 | Airport transfer and vehicle choice, saved in the browser | Product / Front-end | 2026-09-21 | Implemented |
| D-19 | Booking request page (front end only) | Product / Front-end | 2026-09-21 | Front end done, delivery pending, security review required |
| D-20 | Activities page with a broad activity catalogue | Product / Content | 2026-09-21 | Implemented, content unconfirmed |

---

## D-01 — Replace the mockup's blue "View all" link

**Decision.** The "View all" link beside *Popular Destinations* is rendered as white text (`--color-on-image`) with a 2 px `--color-amber-500` underline that grows on hover, not in the mockup's sky blue (≈ `#3FA9F5`).

**Context.** The approved mockup shows this link in a saturated blue. Over the hero's mid-tone jungle canopy it measures ≈ 2.9:1 — below the 4.5:1 required for a 14 px link — and the blue belongs to no ramp in the palette. It reads as an unstyled browser default rather than an intentional choice.

**Alternatives considered.**
1. Keep the blue and darken the scrim beneath it — rejected: it would require ~0.75 opacity locally, visibly patching the image.
2. Recolour to `--color-amber-500` text — rejected: 9:1 on ink but the link then competes with the primary CTA for attention.
3. Add blue to the palette as a "lagoon" ramp — rejected: a fourth hue with no product meaning.

**Chosen solution.** White label + amber underline. Contrast comes from the label (white on a ≥0.62 scrim = 6.2:1); brand comes from the underline (amber-500 at 2 px is a graphic, needing 3:1, and delivers 9:1).

**Impact.** All secondary "View all"-class links on photographic backgrounds follow this pattern (`components.md` §2.3, §1.4).

**Status.** Approved. **Author.** UI/UX Designer. **Date.** 2026-09-19.

---

## D-02 — Hero lead paragraph moves from display serif to Poppins

**Decision.** `Discover breathtaking destinations, unique experiences and unforgettable memories across Sri Lanka.` is set in Poppins 400 at `--text-lead` (17–19 px), not in Playfair Display as the mockup shows.

**Context.** Playfair Display is a high-contrast Didone-derived face. Its hairline strokes are ~1 px at 17 px, and at that weight they are eaten by sub-pixel anti-aliasing — badly on non-Retina Windows displays, and worse over photography where the hairlines have no consistent backdrop.

**Alternatives considered.**
1. Keep Playfair and increase the size to 24 px — rejected: the paragraph would compete with the headline and push the CTA below the fold at 390 px.
2. Keep Playfair and add a heavier weight (500/600) — rejected: a bold lead paragraph reads as a second headline.
3. Introduce a third, low-contrast serif (Lora, Source Serif) for small serif text — rejected: three families is a maintenance and performance cost the brand does not need.

**Chosen solution.** Poppins for the lead. The serif voice is preserved by the display headline immediately above and the serif CTA label immediately below (D-03), so the editorial character survives at the sizes where the serif actually performs.

**Impact.** `--text-lead` is a sans token throughout the system. Playfair is restricted to ≥24 px (`design-system.md` §3.2).

**Status.** Approved. **Author.** UI/UX Designer. **Date.** 2026-09-19.

---

## D-03 — Hero CTA label stays in the display serif

**Decision.** The `Plan Your Trip →` label uses `--text-button-serif` (Playfair Display 600, 17–18 px). It is one of only two permitted sub-24 px uses of the serif.

**Context.** D-02 removes the serif from the hero paragraph. Removing it from the CTA as well would leave the headline as the only serif element and lose the mockup's editorial texture.

**Alternatives considered.** Poppins 600 for consistency with all other buttons — rejected: it flattens the hero's character with no legibility benefit here.

**Chosen solution.** Keep the serif. Unlike the paragraph, the CTA label sits on a **solid white pill** at 19.4:1 with a uniform, opaque backdrop, where the hairlines render cleanly.

**Impact.** `--text-button-serif` exists as a token and is used **only** for the hero primary CTA. Every other button uses `--text-button` (Poppins).

**Status.** Approved. **Author.** UI/UX Designer. **Date.** 2026-09-19.

---

## D-04 — Trust bar reflows below the thumbnail rail under 1024 px

**Decision.** The glass trust bar sits inline with the thumbnail rail only at ≥1024 px. At 768–1023 it becomes a full-width strip below the rail; at <768 it becomes a 2 × 2 grid.

**Context.** The mockup places the rail (4 thumbnails) and the trust bar (4 labelled cells) on one band. At 768–1023 px that band is ~700 px of usable width; the four labels would wrap to three lines each and the thumbnails would fall below 120 px.

**Alternatives considered.**
1. Drop the trust bar below 1024 — rejected: "Secure Payments" and "Flexible Booking" are highest-value on mobile, where purchase anxiety is greatest.
2. Reduce to two trust items on small screens — rejected: arbitrary, and it weakens the reassurance.
3. Horizontal scroll for the trust bar — rejected: reassurance content must be visible without interaction.

**Chosen solution.** Reflow to a full-width strip, then to 2 × 2. All four claims remain visible at every breakpoint.

**Impact.** `components.md` §7.1; hero height budget at 768–1023 increases by ~96 px.

**Status.** Approved. **Author.** UI/UX Designer. **Date.** 2026-09-19.

---

## D-05 — Navigation gains a persistent Book pill; About Us overflows at 1024–1199

**Decision.** The nav adds a primary **Book** pill and a trip-tray entry point at ≥1024, and a search affordance. At 1024–1199 px, `About Us` moves into a **More** disclosure.

**Context.** The mockup's nav has five links and no transactional affordance. Bookings is a required product section (per the brief) and needs a persistent entry point; without one, the only route to checkout is through a card CTA.

**Alternatives considered.**
1. Leave the nav exactly as mocked and rely on in-page CTAs — rejected: a returning buyer has no direct path.
2. Add `Bookings` as a sixth plain text link — rejected: it looks like another browsing section rather than an action, and six links plus a wordmark overflows at 1024.
3. Drop `About Us` entirely from the nav at all widths — rejected: it is a trust signal for a travel brand and belongs in the primary nav where there is room.

**Chosen solution.** Book as a pill (visually distinct from browsing links), with `About Us` overflowing only in the narrow 1024–1199 band.

**Impact.** `components.md` §1.5. The mobile drawer carries all six items with no overflow.

**Status.** Approved. **Author.** UI/UX Designer. **Date.** 2026-09-19.

---

## D-06 — Add-to-trip uses an inline popover, not a modal

**Decision.** When a user adds a destination or experience and no active trip exists, the choice ("Start a new trip" / "Add to a saved trip") is presented in a non-modal popover anchored to the button, not in a centred modal dialog.

**Context.** Adding to a trip is a high-frequency, low-stakes action. It happens repeatedly during browsing.

**Alternatives considered.**
1. Modal dialog — rejected: it seizes focus, blanks the page, and requires an explicit dismissal for what is a one-tap decision. Repeated across a browsing session it becomes hostile.
2. No choice at all — always create/append to the current draft — rejected: it silently merges items into the wrong trip for a user with several saved plans, and it is not undoable in an obvious way.
3. A toast with an action — rejected: a toast is transient, and this choice must not expire.

**Chosen solution.** Anchored popover with the safe option ("Start a new trip") focused by default, dismissible with `Esc` and outside click, plus an undo toast after the add.

**Impact.** `user-flows.md` §F2.1 step 6; `components.md` §14 popover rules. Popovers are non-modal: focus moves in, but the page is not `inert`.

**Status.** Approved. **Author.** UI/UX Designer. **Date.** 2026-09-19.

---

## D-07 — Form control boundaries use `--color-ink-400`, not a sand tone

**Decision.** Every form control's default boundary is `1.5px solid --color-ink-400` (`#72827C`, 4.0:1 on white). `--color-sand-200` is a decorative divider/card-border token only and is never a control boundary.

**Context.** The warm-neutral sand borders that suit cards measure 1.4:1 (`sand-200`) and 1.9:1 (`sand-300`) against white. WCAG 2.2 SC 1.4.11 requires 3:1 for the visual boundary of a UI component whose state must be perceivable. Form fields are exactly that.

**Alternatives considered.**
1. Darken `--color-sand-200` itself to reach 3:1 — rejected: it would make every card and divider in the product visually heavy, and those elements do not need the ratio.
2. Rely on a filled control background (`--color-sand-100`) instead of a border — rejected: the fill measures 1.06:1 against a white page and gives no boundary at all.
3. Accept the failure — rejected outright.

**Chosen solution.** A separate, darker boundary token for controls. Cards keep the soft sand border.

**Impact.** `components.md` §11.1–§11.2; `accessibility.md` §2.5. Forms read slightly more defined than cards — which is correct, since they are interactive.

**Status.** Approved. **Author.** UI/UX Designer. **Date.** 2026-09-19.

---

## D-08 — Typeface pairing: Playfair Display + Poppins

**Decision.** Display serif = **Playfair Display**; UI/body sans = **Poppins**. Both from Google Fonts, both self-hosted.

**Context.** The mockup's lettering had to be identified rather than approximated. The headline shows extreme stroke modulation with vertical stress and flat serifs; the nav and section labels are monolinear with circular bowls and a single-storey geometric `a`.

**Alternatives considered.** Display: DM Serif Display (one weight only — the mockup headline is clearly 700), Libre Baskerville (contrast too low), Fraunces (too idiosyncratic), Cormorant (fragile below 40 px). Sans: Montserrat (double-storey `a`, wider), Outfit (tighter apertures, less circular `O`), DM Sans (smaller x-height, reads SaaS), Jost (low x-height hurts 14 px UI).

**Chosen solution.** Playfair Display (variable `wght`, real italic, holds at 76 px) + Poppins (matches the wordmark's circular `O` and the nav's geometry).

**Impact.** Self-hosted, latin + latin-ext subset, `font-display: swap`, two preloaded files, metric-matched fallbacks to prevent CLS. Full rationale in `design-system.md` §3.1. A change of either family is a breaking design change requiring a new ADR.

**Status.** Approved. **Author.** UI/UX Designer. **Date.** 2026-09-19.

---

## D-09 — Measured-scrim contrast model for text over photography

**Decision.** White text over photography is protected by a scrim whose opacity is derived from a **`#FFFFFF` worst-case pixel**, not from the image's average luminance. Minimums: **0.55** combined opacity under normal text, **0.45** under large text and graphics. Every new hero image passes a maximum-luminance check inside each text bounding box before it ships.

**Context.** This is the highest-risk decision in the whole design. The site's identity is white type on full-bleed photography, and a sunrise sky contains genuinely blown-out highlights. "It looks fine on this photo" is not a conformance argument, and content editors will swap images after launch.

**Alternatives considered.**
1. Eyeball the scrim per image — rejected: unverifiable, and it degrades silently as content changes.
2. Always place text on a solid or glass panel — rejected: it destroys the full-bleed editorial effect that the mockup was approved for.
3. Use `text-shadow` / a text stroke for legibility — rejected: neither counts toward WCAG contrast, and a heavy shadow looks cheap.
4. Compute the scrim dynamically from the image at runtime — rejected for v1: it adds a decode-and-sample step on the LCP path and is not deterministic for QA.

**Chosen solution.** A fixed, mathematically derived scrim stack (wash + vertical + horizontal + top), plus a CI luminance gate.

**Impact.** `design-system.md` §10.2 (the recipe and the derivation table), `accessibility.md` §2.2 (the gate). The gate is **not yet automated** — recorded as risk A-01. Any change to the scrim tokens requires re-derivation, not adjustment by eye.

**Status.** Approved. **Author.** UI/UX Designer. **Date.** 2026-09-19.

---

## D-10 — Dual focus ring instead of a single outline

**Decision.** Focus is indicated by two concentric rings: a 3 px inner ring in a context colour plus a 2 px outer ring in the opposing colour (white on light, near-black on dark).

**Context.** A single ring cannot guarantee 3:1 against an unknown photographic backdrop. A white ring vanishes on sky; a dark ring vanishes on jungle.

**Alternatives considered.**
1. A single high-contrast ring (e.g. amber everywhere) — rejected: amber-400 is 1.7:1 against white, so it disappears on light surfaces.
2. A `mix-blend-mode: difference` ring — rejected: unpredictable on mid-tones, and unsupported in forced-colors mode.
3. Invert the element on focus — rejected: it changes the control's appearance so much that users lose their place.

**Chosen solution.** Dual ring, plus a transparent `outline` alongside the box-shadow so forced-colors mode still paints an indicator.

**Impact.** `design-system.md` §11; every component's focus-visible state. Adopts AAA SC 2.4.13.

**Status.** Approved. **Author.** UI/UX Designer. **Date.** 2026-09-19.

---

## D-11 — Guest checkout; no account required before payment

**Decision.** Browsing, trip-building and checkout all work without an account. Identity is captured as traveller details; account creation is offered **after** confirmation. Existing bookings are managed via sign-in or a signed magic link to the booking email.

**Context.** Forced registration before checkout is the largest single drop-off point in travel funnels, and this product deliberately lets an anonymous user do substantial work (building a plan) before committing.

**Alternatives considered.**
1. Require an account before checkout — rejected on conversion grounds.
2. Require an account before the plan builder — rejected: it blocks the product's core differentiator behind a signup wall.
3. Anonymous checkout with no post-booking management — rejected: travellers need to change and cancel.

**Chosen solution.** Guest checkout + post-confirmation account upgrade + magic-link booking management. Anonymous plans persist in `localStorage` (`np.trip.draft`, 30-day TTL) and are **merged**, never replaced, on sign-in, with an explicit user choice on conflict.

**Impact & security.** This creates four auth-adjacent surfaces that **require Cybersecurity Agent review before implementation**:
- magic-link entropy, single-use enforcement, TTL, and no PII in the URL;
- guest→account upgrade and the risk of takeover if the booking email is unverified at upgrade time;
- untrusted `localStorage` trip data merged into an authenticated account (server must re-validate every item id);
- `/plan/[id]` as an unauthenticated shareable URL — unguessable id required, and no traveller PII may ever be exposed there.

Also: payment card data must never reach the Noble Path origin (provider-hosted fields only), and the payment request must carry an idempotency key.

**Status.** Approved (design). **Blocked pending security review** before implementation. **Author.** UI/UX Designer. **Date.** 2026-09-19.

---

## D-12 — "Load more" instead of infinite scroll

**Decision.** Paginated index pages use an explicit **Load more** button.

**Context.** Infinite scroll strands the footer (which carries policy, support and credit links), breaks back-navigation from a detail page, and leaves keyboard and screen-reader users with an unbounded list.

**Alternatives considered.** Infinite scroll with a "load footer" escape hatch (rejected: still breaks back-navigation); numbered pagination (rejected: poor on mobile for visual browsing).

**Chosen solution.** Load more, with focus moved to the first new card and a polite announcement of the new count.

**Impact.** `components.md` §14; `page-specs.md` §2 S3.

**Status.** Approved. **Author.** UI/UX Designer. **Date.** 2026-09-19.

---

## D-13 — Light working surfaces for all transactional UI

**Decision.** Photography and glass are confined to heroes, editorial bands and card media. The Plan builder, all forms, the booking summary and checkout use light surfaces (`--color-sand-50` / `#FFFFFF`) with ink text.

**Context.** The brief calls for a cinematic, premium, dark-photographic feel. That treatment is excellent for 20 seconds of browsing and hostile for 20 minutes of itinerary editing, where a user reads dense text and fills forms.

**Alternatives considered.**
1. Carry the dark photographic treatment through the whole product — rejected: sustained white-on-dark reading is fatiguing, and form contrast over photography cannot be guaranteed.
2. Offer a dark/light toggle — rejected for v1: it doubles every component's state matrix for no validated user need. Revisit post-launch.

**Chosen solution.** Cinematic entry, calm workspace. `/plan` deliberately has **no** full-bleed hero (`page-specs.md` §6.1).

**Impact.** Semantic colour tokens are defined for both contexts (`design-system.md` §2.2); every component declares which context it uses.

**Status.** Approved. **Author.** UI/UX Designer. **Date.** 2026-09-19.

---

## D-14 — Breakpoint set replaces Tailwind's defaults entirely

**Decision.** `--breakpoint-*: initial;` clears Tailwind v4's defaults; the project defines `xs: 390`, `md: 768`, `lg: 1024`, `xl: 1440`, `2xl: 1920`. There is no `sm:`.

**Context.** The brief specifies 390/768/1024/1440/1920. Layering those on top of Tailwind's 640/768/1024/1280/1536 would leave `sm:` (640) and `xl:` (1280) as live but unspecified breakpoints — an invitation for drift.

**Alternatives considered.** Keep Tailwind's defaults and add custom ones (rejected: nine breakpoints, five of them unspecified); use arbitrary variants like `min-[1440px]:` (rejected: unreadable and unenforceable).

**Chosen solution.** A clean five-breakpoint set. Base/unprefixed styles are the 390 mobile layer.

**Impact.** `design-system.md` §12. Any use of `sm:` in application code is a review failure.

**Status.** Approved. **Author.** UI/UX Designer. **Date.** 2026-09-19.

---

## D-15 — Target size set at 44 × 44 (AAA) rather than the AA 24 × 24

**Decision.** Minimum interactive target is 44 × 44 CSS px, exceeding the AA requirement of SC 2.5.8 (24 × 24) and matching AAA SC 2.5.5.

**Context.** Noble Path is a booking product used one-handed on phones, often outdoors and in motion. 24 px targets are technically conformant and practically poor here.

**Impact.** Small visual controls (24 px icons, 40 px `sm` pills, chip remove buttons) must carry hit-area extenders. Glyphs are never scaled up to reach the size.

**Status.** Approved. **Author.** UI/UX Designer. **Date.** 2026-09-19.

---

## D-16 — AAA contrast (7:1) explicitly not targeted

**Decision.** The product targets WCAG 2.2 **AA** contrast (4.5:1 / 3:1). AAA contrast (7:1 / 4.5:1) is **not** a target, and this exclusion is deliberate and documented.

**Context.** Meeting 7:1 for white text over photography would require a combined scrim opacity of ≈ 0.70 against a white worst case. At that opacity the photography is visibly greyed out across the entire text column, which destroys the product's core visual value — the approved mockup would not survive it.

**Alternatives considered.** Move all text off the imagery onto solid panels to reach 7:1 (rejected: same loss of the full-bleed treatment); offer a user-toggled "high contrast" mode that raises the scrim (**deferred, not rejected** — a good post-launch enhancement, tracked as a future item).

**Chosen solution.** AA contrast, rigorously verified against worst-case pixels (D-09), plus four AAA items adopted where they cost nothing visually (target size, focus appearance, line length, motion pause).

**Impact.** Recorded in `accessibility.md` §12 as a documented exclusion so it is never mistaken for an oversight. A future high-contrast toggle would raise `--scrim-min-body` to 0.72 and `--scrim-min-large` to 0.62.

**Status.** Approved with documented exception. **Author.** UI/UX Designer. **Date.** 2026-09-19.

---

## D-17 (ADR-007) - Standalone accommodation page with curated data and maps

**Decision:** `/accommodation` asks a budget question (Budget / Mid-range / Luxury) first. The answer reveals, per destination, curated properties beside a map. "Stay here" saves a property to a "Your stays" list. It is independent of the trip planner. Picks persist in `localStorage`, and since D-21 they also carry into the booking request (see D-21).

**Reason:** Requested product flow, kept separate from planning and booking.

**Alternatives considered:** Google Places API (live data, needs billing, cannot map results to tiers cleanly); embedding in the plan builder (rejected: accommodation should not require building a route).

**Chosen solution:** `content/accommodations.ts` (typed, integrity-checked in `lib/content.ts`), Leaflet with OpenStreetMap tiles in `components/accommodation/stay-map.tsx`. It needs no API key or billing. Circle markers avoid image assets. The Google Maps JavaScript API was tried first and dropped because it needs a billing-enabled key.

**Impact:**
- CSP `img-src` in `next.config.ts` allows `https://tile.openstreetmap.org`.
- OSM tile policy: fine at low traffic with attribution (shown on the map). If traffic grows, move to a tile provider (MapTiler, Stadia, self-hosted) rather than the public servers.
- The homepage "Accommodation" card links to `/accommodation`.
- Dependencies added: `leaflet`, `@types/leaflet`.

**Known limitations:** Data comes from a team-compiled list and is **unverified**. Coordinates are **approximate** (see docs/database/accommodation-content.md). About 165 properties across 18 destinations; other places in the source need a destination entry first. No prices or availability. Still not connected to the trip planner (`/plan`). An "All Sri Lanka" tab shows every stay in a tier on one map.

---

## D-18 - Airport transfer and vehicle choice, saved in the browser

**Decision:** The trip page (`/trips/[slug]`) and the plan builder both offer airport pickup, airport drop and one vehicle from: Sedan, Sedan (electric), Mini car, Mini car (electric), Van, Bus, Scooter, Tuk tuk.

**Reason:** Requested product feature. Travellers need to say how they get to and from the airport and what they travel in.

**Alternatives considered:** Adding the fields to `PlanInput` and the itinerary engine (rejected: the choice does not affect route generation, and the trip page has no planner input); sending the choice to a server (rejected: no backend for it exists, and it would add personal-data handling for a preference).

**Chosen solution:** One shared client component, `components/transfers/transfer-picker.tsx`, with data and parsing in `lib/transfers.ts`. It stores `{ airportPickup, airportDrop, vehicle }` in `localStorage` under `np.transfers.v1`. The stored value is parsed as untrusted input: unknown vehicle ids fall back to none. If storage is unavailable, the picker still works but does not persist.

**Impact:**
- The choice is shared between the two pages in one browser, and never sent to a server.
- Adding or renaming a vehicle means editing `VEHICLE_IDS` and `VEHICLES` in `lib/transfers.ts`.

**Vehicle artwork:** each vehicle is a cartoon SVG in `public/images/vehicles/<id>.svg` (drawn in-house, original, no third-party licence). To replace one, save new art over the file with the same name (keep it SVG, or change the `src` in `transfer-picker.tsx`). The images are decorative (`alt=""`); the label carries the meaning.

**Known limitations:** It is a preference, not a booking. It is not passed to the `/bookings` enquiry form, so the traveller has to mention it when they enquire. There are no prices or availability. `/plan` (`app/plan/page.tsx`, 2026-09-21) shows only the transfer picker; the generated day-by-day plan was removed from the page at the product owner's request. `components/plan/*` and `lib/itinerary.ts` are no longer used by any route. Only the page load was checked, not the picker in a browser. One vehicle only; multiple vehicles are not supported.

---

## D-19 - Booking request page (front end only)

**Decision:** `/bookings` ("Plan your trip") is a booking request form: traveller details, trip dates (nights and days calculated), airport transfers, then Option A (pre-planned package: view itinerary, add to my trip) or Option B (build my own: stays, activities and transport, or a preferences-only request). A review step shows the full summary and an estimated price or custom quotation, then terms and **Submit booking request**, which shows a unique request ID. It is separate from `/plan`.

**Reason:** Requested product flow. The front end was built first, at the product owner's request, before any delivery mechanism.

**Alternatives considered:** Multi-page wizard (rejected: more state to carry and harder to review as a whole); saving the draft in `localStorage` (rejected: it holds names, emails and phone numbers, which should not sit in browser storage).

**Chosen solution:** `components/booking/*` (form sections, summary), `lib/booking-request.ts` (model, validation, nights/days, ID, price estimate), `app/bookings/page.tsx`. The vehicle grid is shared with the transfer picker (`components/transfers/vehicle-grid.tsx`).

**Impact:**
- **Submission is connected as of D-23.** `submitBookingRequest()` posts to `POST /api/bookings`, which validates server-side and emails the team via Resend. `DELIVERY_CONNECTED` in `lib/booking-request.ts` is now `true`. The paragraphs below describe the state this page shipped in *before* D-23; kept for the historical record rather than rewritten, since D-23 is the entry that supersedes them.
- The request ID (`NP-YYYYMMDD-XXXXXX`) is now minted server-side, in `app/api/bookings/route.ts` — see D-23. It is still not stored anywhere (no database in v1), so it remains a reference the traveller and the notification email agree on, not a lookup key.
- Client validation is a convenience only. The server route now repeats it in full: `lib/validation.ts`'s `bookingDraftRequestSchema` (D-23) replaced the older, unused schema this paragraph originally referred to.
- Prices: the site only holds indicative bands, so a package shows its band and a custom trip shows "custom quotation". No figures are invented.
- The `/api/bookings` route now exists (D-23); `docs/architecture/application-architecture.md`'s directory listing was accurate in describing it, just ahead of the code.

**Known limitations:** Terms text is draft wording and needs review against real booking, cancellation and privacy policies. Not viewed in a browser (the extension was unavailable) when this page was first built; logic was tested with a script and the page was checked server-side. Personal data is collected; the Cybersecurity review this section used to say was still required before delivery could be connected is D-23's own handoff in `docs/agents/handoffs.md` — read that entry, not this one, for the current, authoritative review status.

---

## D-20 - Activities page with a broad activity catalogue

**Decision:** `/activities` lists 92 activities in 27 categories (beaches, water sports, safaris, treks, adventure, trains and tours, tea, food, culture, village life, arts and crafts, eco, bird watching, wellness, photography, camping, Colombo, Kandy, Ella and Hill Country, Galle and the South, Jaffna and the North, Trincomalee and the East, family, couples, shopping, fishing, romantic dining). Each card shows location, duration, difficulty and an indicative price band. There is no booking status, at the product owner's request. `/experiences` redirects to `/activities` because the header, footer and destination pages link to it.

**Reason:** Requested product feature.

**Alternatives considered:** Extending `content/experiences.ts` (rejected: those are fully written, seasonal, photographed experiences used by the planner, and 92 more would dilute them); restoring a separate `/experiences` page (rejected in favour of one activity page).

**Chosen solution:** `content/activities.ts` (typed data), `components/activities/*` (card and filter/search explorer), `app/activities/page.tsx`. Difficulty reuses the site's `easy / moderate / challenging` scale and meter; price reuses the `$ / $$ / $$$` bands.

**Impact:** The header "Experiences" link now lands on `/activities`. The booking form's own activity dropdown still only lists the 33 experiences; since D-21, a specific pick from this catalogue instead carries into the request via the dropdown's existing "Something else" free-text path (see D-21) rather than the dropdown gaining these 92 as options.

**Known limitations:** **The details are draft.** Locations, durations, difficulty and price bands were drafted from general knowledge and are not confirmed by Noble Path or any operator; they must be reviewed before being treated as fact. Some are seasonal or need permits (for example Minneriya gatherings, whale watching, Adam's Peak season, national park entry) and no season or permit information is shown. No photographs. Not viewed in a browser (the extension was unavailable); data was checked by script (no duplicate slugs, every category used) and the page was checked server-side.

---

## D-21 - Picks on Accommodation, Activities and the Planner carry into the booking request

**Decision:** A specific accommodation picked on `/accommodation`, an activity added on `/activities`, and a saved `/plan` itinerary now carry into `/bookings` automatically: the booking form seeds `Option B: Build my own trip` with matching entries (or a read-only itinerary summary) the first time it loads, instead of the traveller re-entering what they already chose elsewhere.

**Reason:** Requested product feature. The three pages already let a traveller pick specific things while just browsing, before there is any traveller detail or a booking in progress; without this, those picks were silently discarded the moment the traveller opened the booking form (D-17's "independent of... bookings" and D-20's "does not yet offer these 92" were both symptoms of the same gap).

**Alternatives considered:**
- Passing picks as URL query parameters (rejected: `/accommodation` and `/activities` allow picking many items across an open-ended browsing session, not one value chosen right before navigating — a query string does not fit a growing list well, and it would leak the traveller's picks into browser history and shared links).
- A server-side cart/session (rejected: there is no backend yet — `submitBookingRequest` in `lib/booking-request.ts` is still a stub per `DELIVERY_CONNECTED = false` — and a cart would be a large addition for what is, today, a same-browser handoff between three static pages).
- Extending the booking form's activity dropdown with the 92-item `/activities` catalogue as real options, merging it with the 33-item `experiences` catalogue the dropdown already draws from (rejected: `content/activities.ts` is deliberately a separate, unreviewed-draft content domain from `content/experiences.ts`, per D-20 — merging them would mean either duplicating every activity into `experiences` or laundering unreviewed draft data into the planner's curated list. The dropdown's existing `"other"` + free-text `otherName` path already exists for exactly this case: a thing the traveller wants that is not in the curated list).
- Exploding a saved itinerary into one stay/activity entry per day (rejected: the itinerary is a route, not a shopping list — the traveller did not pick each day's accommodation or activity individually, so turning it into a dozen editable entries would misrepresent it and multiply the fields to validate. A read-only summary that links back to `/plan` says what it actually is).

**Chosen solution:** A new shared client-side store, `lib/trip-selections.ts` (`localStorage` key `np.selections.v1`), holds `{ stays: Record<destinationSlug, accommodationSlug>, activitySlugs: string[] }`. `/accommodation` (`stays-explorer.tsx`) and `/activities` (`activities-explorer.tsx`, a new "Add to my trip" control on each `ActivityCard`) write to it; both keep an on-page "Your stays" / "Your activities" list with a "Continue to booking" link, same pattern as before. `/plan`'s existing `np.plan.v1` storage was extracted, unchanged, from `plan-builder.tsx` into `lib/plan-storage.ts` so it can be read from elsewhere too. `components/booking/booking-form.tsx` reads both on mount (once, like the restore effects the other pages already use) and seeds `BookingDraft.stays` / `.activities` / the new `.plannedItinerary` field — only when those are still empty, so it never overwrites a request already in progress. A specific accommodation pick keeps its slug on the seeded `StayEntry` (`accommodationSlug`) so the plan section and summary can show the actual property name; a specific activity pick is seeded through the dropdown's existing `"other"` + `otherName` path with a new `sourceActivitySlug` bookkeeping field, so no validation or option-list change was needed. Entry ids are now minted by one shared counter, `makeEntryId` in `lib/booking-request.ts`, instead of a private counter local to `plan-section.tsx`, because seeded entries and traveller-added entries must never collide on the same React key.

**Impact:**
- `StayEntry` gains `accommodationSlug: string` (`""` when not from a specific pick) and `ActivityEntry` gains `sourceActivitySlug: string` — both additive, `validateDraft` is unchanged.
- `BookingDraft` gains `plannedItinerary: { days, destinationSlugs, interests } | null`, shown in `plan-section.tsx` (with a "View full itinerary" link to `/plan` and a remove control) and in `booking-summary.tsx`, regardless of which plan option the traveller chose — it is informational, not itself validated.
- D-17's "independent of... bookings" and D-20's "does not yet offer these 92" are superseded by this entry; both were updated in place above rather than left describing the old behaviour.
- `/plan` is unaffected in itself (D-18's note that its generated day-by-day plan was removed from the page still stands — this reads `np.plan.v1`, which `/plan` still writes via `PlanBuilder`, wherever that page's own UI currently stands).

**Known limitations:** Everything here is still front-end only, like the rest of the booking form (D-19) — no server receives or stores these picks; `submitBookingRequest` is unchanged. The seed only fires once, on the booking form's first mount in a session: if the traveller removes a seeded entry and then reloads `/bookings`, it reappears from `localStorage` unless they also un-pick it on the originating page. A specific accommodation/activity slug that no longer exists in the content data (a stale `localStorage` entry from a previous deploy) is silently skipped rather than shown as an error.

---

## D-22 - Destination detail page (`/destinations/[slug]`) built, scoped down from page-specs.md §3

**Decision:** `/destinations/[slug]` now exists — previously every `DestinationCard` across the site already linked to it, but the route itself 404'd. The page shows the destination's existing long-form `description` copy as its body, a compact fact panel (region, best months, suggested stay, season note), a single-pin location map, "Getting there" (the destination's authored `travel` links), experiences based there, nearby destinations, and a closing plan/enquire CTA — all from content that already existed in `content/destinations.ts`, no new data authored.

**Reason:** Requested product feature ("a small blog with a map" for every destination). `docs/requirements/requirements.md` FR-1.4 and `page-specs.md` §3 already fully specified this page; it had components partly built (`DestinationHero`, `TravelLinks`) but no route ever assembled them.

**Alternatives considered:**
- Building the full §3 spec as written (rejected for this pass: §3 S3 is a 4–8 image lightbox gallery, but `Destination.image` in `lib/types.ts` is a single `ImageAsset`, not a gallery — building S3 would mean inventing photographs or picking arbitrary stand-ins, which is exactly what D-1's photo-credit discipline and requirements §7.3/§7.4 exist to prevent. S1's "Add to trip"/"Share" actions and S7's sticky mobile action bar were also deferred: "add to trip" has no defined meaning for a destination by itself elsewhere in the app — trips, packages and stays are addable, a place is not — and a sticky bar for an action that does not exist yet would be UI with nothing behind it.).
- A shorter page with no fact panel or "Getting there" section (rejected: `TravelLinks` and the destination's authored `travel` array already existed specifically for this, and the fact panel needed only fields the content model already has — Region, Best months, Suggested stay — omitting them would throw away curated data for no reason).

**Chosen solution:** `app/destinations/[slug]/page.tsx`, `generateStaticParams`-driven like `/trips/[slug]`. Reuses `DestinationHero` and `TravelLinks` as originally built for this page; `getRelatedDestinations` (already written for "FR-1.4 detail page") drives "Nearby destinations"; `getExperiencesForDestination` drives "Experiences here" with the exact empty-state copy `page-specs.md` §3 S5 specifies. A new `components/destinations/destination-map.tsx` renders the location: same Leaflet/OpenStreetMap approach D-17 already chose for `/accommodation` (no new provider decision, no CSP change — `tile.openstreetmap.org` is already allowed), simplified to one always-labelled marker instead of `StayMap`'s multi-pin picker. `TouristDestination` JSON-LD is emitted (coordinates are the one field on this page not already covered by the `article`-flavoured `openGraph` block).

**Impact:**
- Every existing `DestinationCard`/`DestinationCardOverlay` link across the site (home, `/destinations`, `/trips/[slug]`, `TravelLinks`'s own destination links) now resolves instead of 404ing.
- New component: `components/destinations/destination-map.tsx`. No new dependency — reuses `leaflet`, already added for D-17.
- `page-specs.md` §3 is annotated inline to mark S1 (partial — hero built, "Add to trip"/"Share" actions and S7's sticky bar deferred), S2, S4, S5, S6 as built and S3 (gallery) as deferred, so the spec does not silently drift from what exists the way D-17/D-20 had before D-21 fixed their stale wording.

**Known limitations:** No photo gallery (data model constraint, see alternatives above). No "Add to trip" or "Share" action — the closing CTA links to `/plan` and `/bookings` instead, the same two destinations D-17/D-19's existing funnels already use. Fact panel omits "Entry fee", "Nearest airport" and "Accessibility notes" from the original S2 spec because `Destination` carries none of those fields today; inventing them would violate requirements §7.4 the same way a fabricated price would.

---

## D-23 - Booking delivery connected: `POST /api/bookings` sends the request by email via Resend

**Decision:** Submitting the booking form now actually reaches the team. `/api/bookings` (previously described in `docs/architecture/application-architecture.md` but, per D-19, never built) validates the request server-side, rate-limits it, and — on success — emails a full plain-text summary to `BOOKINGS_NOTIFICATION_EMAIL` via [Resend](https://resend.com). `DELIVERY_CONNECTED` in `lib/booking-request.ts` is now `true`; `submitBookingRequest` posts to the route instead of only minting a local id.

**Reason:** Requested product feature, explicitly conditioned by the requester on being "secured very well." This closes the exact gap D-19 flagged as blocking: *"No email... reaches staff yet... a Cybersecurity review is required before delivery is connected."* That review is this decision's own handoff (`docs/agents/handoffs.md`), not a formality — nothing here should be read as self-certifying its own security.

**Alternatives considered:**
- **SMTP via Nodemailer, sending from the destination Gmail account itself** (rejected: no new account needed, but Gmail enforces low daily sending caps and can flag automated mail from a personal account as suspicious — workable for a prototype, not for a real booking channel that must not silently start bouncing).
- **SendGrid** (rejected, not on the merits — either it or Resend would have worked; Resend was chosen for its simpler SDK and because it is the more common default for a Next.js app on Vercel, which this project already targets per the hosting ADR. Revisiting this is low-cost if it ever needs to change: the only Resend-specific code is the `new Resend(...)` call and its `emails.send` shape in `app/api/bookings/route.ts`).
- **AWS SES** (rejected for v1: needs a verified domain and, initially, "sandbox" approval from AWS before it can send to arbitrary addresses — more setup than this stage of the project needs, though it is a reasonable place to land later at higher volume).
- **Extending the *old*, simpler `bookingRequestSchema` in `lib/validation.ts`** rather than replacing it (rejected: that schema modelled an enquiry shape — name/email/phone/partySize/arrivalDate/bookingType/itemSlug/notes — that predates and does not match `BookingDraft`, the shape the actual booking form has sent since D-19. Nothing referenced it outside its own file. Extending a schema for the wrong shape would have meant maintaining two incompatible booking models; it and the equally-unused `BookingRequest`/`BookingType`/reference-shaped `BookingResponse` types in `lib/types.ts` were replaced rather than kept as dead scaffolding, per Fortechz policy §18).
- **HTML email body** (rejected: this field set is large — traveller details, dates, transfers, and either a package, a full build-your-own itinerary, or freeform preferences — and every one of those values would need an escaping discipline to avoid HTML injection into a staff inbox. Plain text sidesteps that entire class of risk for a message a human is going to read once and act on, not a marketing email that needs to look a certain way.)

**Chosen solution:**
- `lib/validation.ts`: `bookingDraftRequestSchema`, a Zod schema mirroring `BookingDraft` field-for-field, replacing the unused old schema. Every slug the client sends (destination, accommodation, experience, activity, trip) is re-checked against `lib/content.ts`'s actual data — including the destination/accommodation cross-check the security review (F-2) already applied to `lib/trip-selections.ts`, now applied here too for the same reason. `strictObject` throughout rejects unknown keys. A honeypot field (`website`) is carried over from the old schema's design, fixed to *not* fail validation on its own (see Known limitations) so a bot never learns which check it tripped.
- `app/api/bookings/route.ts`: size guard (50 KB) → rate limit (`lib/rate-limit.ts`, already built, previously unused) → `Content-Type` check → JSON parse → schema validation → honeypot branch (fake success, no email sent) → compose (`lib/booking-email.ts`) → send via Resend, `replyTo` set to the traveller's own address so a staff reply reaches them directly. Every error path returns the `ApiErrorBody`/`ApiErrorCode` envelope already designed (and, like the old schema, previously unused) in `lib/types.ts`, plus a `correlationId` logged alongside the server-side error so support can find the matching log line without the client ever seeing raw provider error text.
- `lib/env.ts`: `RESEND_API_KEY` and `RESEND_FROM_EMAIL`, validated the same way `BOOKINGS_NOTIFICATION_EMAIL` already was — hard-fail in production if the key is missing, warn-and-fall-back in development.
- `components/booking/booking-form.tsx`: an off-screen, `aria-hidden`, `tabIndex={-1}` honeypot input bound to the new `BookingDraft.website` field; `handleSubmit` now catches `BookingSubmissionError` and surfaces it through the existing `ErrorSummary`, keeping the traveller's draft intact for a retry.
- `next.config.ts`: `Cache-Control: no-store` on `/api/:path*`, closing out the standing item in `docs/deployment/deployment.md`'s remediation table.

**Impact:**
- `lib/env.ts` is now actually imported (by `app/api/bookings/route.ts`, transitively by `lib/rate-limit.ts`) for the first time — previously nothing in `app/` referenced it, so its production-hard-fail behaviour was dead code that had never actually run. **This changes what a production build requires**: `next build` now fails immediately if `RESEND_API_KEY` or `BOOKINGS_NOTIFICATION_EMAIL` is unset, because Next evaluates route modules while collecting page data at build time, not only at request time. This is the intended behaviour (see `lib/env.ts`'s own docstring on why silent lead loss is "the worst kind of bug to ship"), but it is a real, newly-load-bearing operational requirement for CI/deploy, not only for the running server — recorded here so it is not rediscovered as a mysterious build failure.
- `BookingDraft` gains a `website: string` field (honeypot), defaulting to `""`.
- `lib/booking-request.ts` exports `BookingSubmissionError`.
- `lib/types.ts`'s `BookingRequest`/`BookingType` (unused, describing the old enquiry shape) are removed; `BookingResponse` is corrected to `{ id: string }` (it previously said `{ reference: string }`, matching neither the old nor the new implementation); `ApiErrorCode` gains `payload_too_large`, `delivery_unavailable`, `delivery_failed`.

**Known limitations:**
- **No database.** The notification email *is* the only record of a submitted request — if it is lost after Resend accepts it (or if `BOOKINGS_NOTIFICATION_EMAIL` is ever misconfigured to an inbox nobody reads), there is nothing else to recover it from. Acceptable for v1 per D-19's original scope (enquiry-based, no accounts); revisit if request volume grows enough that losing one silently would be a real business problem, not a rare one.
- **Resend sandbox restriction.** Until a sending domain is verified in the Resend dashboard, Resend only actually delivers to the account's own verified address, regardless of `RESEND_FROM_EMAIL`/`BOOKINGS_NOTIFICATION_EMAIL`. This is an operational setup step, not a code path — see `docs/deployment/environment.md`.
- **In-memory rate limiting is still per-instance** (unchanged from `lib/rate-limit.ts`'s own pre-existing documented caveat) — now that this endpoint is real, that caveat is load-bearing for the first time rather than theoretical.
- **A malformed request missing an entire top-level object** (e.g. `dates` absent rather than merely invalid) surfaces Zod's own generic message ("Invalid input: expected object, received undefined") rather than a traveller-friendly one. Not reachable through the actual form, which always sends every key — only through a hand-crafted request against the API directly.
- Verified with `npm run lint`, `npm run typecheck`, `npm run build` (the last with placeholder `RESEND_API_KEY`/`BOOKINGS_NOTIFICATION_EMAIL` supplied inline, never committed — see previous bullet), and manual `curl` checks of every response path (`200` honest success, `200` honeypot-faked success, `400` malformed JSON, `400` validation failure, `413` oversized body, `415` wrong content type, `429` rate limited with `Retry-After`, `503` delivery not configured, `405` on every method but `POST`).
- **Confirmed end to end, 2026-09-24**, against a real Resend account and a real domain-verification flow: a live request was submitted and successfully delivered, `200` with a reference id, nothing logged beyond the id and correlation id. The requester's account is under `noblepath187@gmail.com`; `BOOKINGS_NOTIFICATION_EMAIL` is set to that address as the confirmed permanent destination (not a placeholder), `RESEND_FROM_EMAIL` remains the sandbox `onboarding@resend.dev` sender, which already works for this destination without domain verification. A custom domain (`noblepathsrilanka.com`, added via Resend's Cloudflare auto-configure flow) was left mid-verification, kept only as an optional future upgrade to a branded `RESEND_FROM_EMAIL` — not required for delivery to work, since it already does.
- **CI needed a follow-up fix the same day, exactly as predicted above**: `.github/workflows/ci.yml`'s "Production build" step failed once this ADR's env requirement went live, because nothing in that step set `RESEND_API_KEY`/`BOOKINGS_NOTIFICATION_EMAIL`. Fixed by adding the same kind of inert, non-secret placeholder that step already used for `NEXT_PUBLIC_SITE_URL: https://ci.invalid` — `RESEND_API_KEY` only needs to be a non-empty string and `BOOKINGS_NOTIFICATION_EMAIL` only needs to look like an address, so a fake value satisfies the schema without this build-only job ever calling Resend. Real secrets were deliberately **not** added to `ci.yml`: its own header comment prohibits that, because it runs on fork PRs too, and a real secret there would be exposed to them.

## D-24 - Single-ride booking: a separate "A single ride" option on `/bookings` and `POST /api/rides`

**Decision:** Travellers can book one point-to-point journey with a driver (for example Matara to Kandy, one way or return) without booking a full trip. `/bookings` now opens with "What would you like to book?" offering **A full trip** (the existing form, unchanged) or **A single ride** (a new, short form). A ride request is posted to a new endpoint, `POST /api/rides`, and emailed to staff exactly like a trip request.

**Reason:** Requested product feature: "book a single trip like Matara to Kandy ... provide a vehicle service and add that option to the booking section separately." Before this, a vehicle could only be requested *inside* a full-trip request (airport legs, or build-your-own transport entries), which forced arrival/departure dates, nationality and a trip plan on someone who only needs a car.

**Alternatives considered:**
- **A third `planChoice` ("transport only") inside `BookingForm`** (rejected: the full-trip draft requires arrival/departure dates, nationality and at least one plan item, and its validation, summary, email and server schema are all built around that. Making those conditional would touch every part of an already-reviewed form for a flow that shares almost none of its fields).
- **The same endpoint with a `kind` discriminator** (rejected: it changes the documented, reviewed `/api/bookings` contract and mixes two unrelated schemas' error messages in one handler).
- **Copying the `/api/bookings` handler into a second route** (rejected: two copies of the security-reviewed pipeline would drift. The pipeline was extracted instead, see below).
- **Pickup and drop-off chosen from destination slugs only** (rejected: a driver collects from towns, hotels and addresses that are not destinations in our content, Matara among them. Free text with a `datalist` of suggestions is used, bounded and stripped of control characters on the server).

**Chosen solution:**
- `lib/enquiry-endpoint.ts`: `handleEnquiryPost`, the D-23 pipeline (size guard → rate limit → content type → JSON → schema → honeypot → Resend) moved out of `app/api/bookings/route.ts` **with its behaviour unchanged**, parameterised by schema and email builder. `/api/bookings` and `/api/rides` are both thin wrappers over it. Both share **one rate-limit bucket per client**, so the new endpoint does not double what one caller can send.
- `lib/ride-request.ts` (client model, `validateRide`, `submitRideRequest`), `lib/ride-validation.ts` (strict Zod schema, authoritative), `lib/ride-email.ts` (plain-text staff email, subject `Ride request <id> — <from> to <to>, <date>`).
- `components/booking/booking-options.tsx` (the switch), `ride-form.tsx`, `ride-summary.tsx`. Both forms stay mounted and the inactive one is `hidden`, so switching never loses what was typed. `?service=ride` links straight to the ride form.
- Request ids use the same `NP-YYYYMMDD-XXXXXX` format. Staff tell the two apart by the email subject ("Ride request" vs "Booking request").
- `lib/booking-request.ts`: `postEnquiry(path, body)` factored out of `submitBookingRequest` so both forms map errors the same way.

**Impact:**
- New public write endpoint. It needs **no new environment variables**; it uses the same Resend and rate-limit settings as `/api/bookings`.
- `/bookings` now reads `searchParams`, so it is rendered per request instead of statically.
- Security review (F-5–F-8) led to `lib/safe-text.ts`, applied to **both** endpoints. Single-line fields reject control, format and line-separator characters, except ZWJ/ZWNJ, which Sinhala and Tamil need. The honeypot never fails validation. Unknown keys get a generic message. Counts must be plain digits.
- Price: a ride is always a quotation. The site holds no ride prices, and inventing one would be inventing data (requirements §7.4).

**Known limitations:**
- No distance or drive-time estimate is shown. `getTravelMinutes` only knows destinations in our content, and pickup/drop-off are free text.
- One vehicle per ride. A group needing two vehicles says so in the notes.
- The return leg is always drop-off → pickup. A different return destination is a second ride request.
- Terms wording is draft, same caveat as the trip form's `TERMS`.

## D-25 - Single trip: search, map pins and "Use my current location"

**Decision:** The single-ride option on `/bookings` is now presented as **"A single trip"**. Its pickup and drop-off can be set, a simpler version of how a ride-hailing app does it, in three ways:
- searching a place (instant built-in towns plus live results);
- tapping or dragging A/B pins on a map;
- "Use my current location" for the pickup.

A dashed line joins the pins, and a rough distance and drive time are shown. The pins travel with the request, and the staff email includes map and directions links built from them. Typed text stays required and the pins stay optional, so the form never depends on the map.

**Reason:** Requested feature: "select a location from the map ... Mannar to Jaffna ... put the current location and set the destination, simply like Uber but not that advanced, only one trip." Pins also remove the ambiguity of free-text addresses for the driver.

**Alternatives considered:**
- **A separate "single trip" form** (rejected: it would duplicate the D-24 single-ride form, its endpoint and its security review).
- **The browser calling the geocoder directly** (rejected: the CSP's `connect-src 'self'` would have to be widened, and every keystroke would send the traveller's IP address and User-Agent to a third party). A same-origin proxy (`/api/places/*`) is used instead. It also lets us cache, bound and rate-limit upstream use.
- **Nominatim (OSM's own geocoder)** (rejected: its public usage policy forbids search-as-you-type and caps use at one request per second for the whole app). **Photon** (komoot, also OSM data) supports search-as-you-type, needs no API key and has a reverse endpoint.
- **Google Places / Mapbox** (rejected for now: they need an account, a key and billing, and bring their own terms on displaying results. Swapping provider later only changes `lib/places.ts`).
- **A routing service (OSRM, Google Directions) for real road distance** (rejected: the public OSRM server is not for production use, and "not that advanced" was the brief. A straight-line × 1.3 estimate, the same rule the planner already uses, is shown and clearly labelled as an estimate).
- **Requiring a pin** (rejected: the map cannot be used by keyboard or screen reader, and may fail to load. The text field stays the accessible, always-working path).

**Chosen solution:**
- `lib/places.ts` (server only): the Photon client.
  - 4 s timeout, a cap of 5 upstream requests per second for the whole app, and a 24 h in-memory cache.
  - Results are kept only if they are in Sri Lanka, and only name, detail and coordinates are passed on.
  - Reverse lookups coarsen the point to 4 decimals (about 11 m) before it leaves our server.
- `GET /api/places/search`, `GET /api/places/reverse`: per-client limit of 60 per minute, in a **separate** bucket from bookings.
- `lib/geo.ts` (bounds, rounding, estimate, link builders; `lib/content.ts` now imports its road constants from here) and `lib/known-places.ts` (43 towns and airports with OpenStreetMap coordinates, the instant suggestions and the fallback when search is down).
- `RideDetails.pickupPoint` / `dropoffPoint`: nullable, validated inside Sri Lanka and rounded to 5 decimals (about 1 m). Typing in a field clears its pin, so a pin never disagrees with the visible text. Pins under 100 m apart count as the same place.
- UI: `place-search-field.tsx` (ARIA combobox), `trip-map.tsx` (Leaflet, divIcon A/B pins, map taps limited to Sri Lanka), and changes to `ride-form.tsx` and `ride-summary.tsx`.
- `next.config.ts`: `Permissions-Policy` `geolocation=()` → `geolocation=(self)`. Location is requested only when the button is pressed.

**Impact:**
- **A new third-party dependency (Photon) at runtime.** When it is down or slow, search degrades to the built-in towns and free text; booking is unaffected.
- **New read-only public endpoints.** They add upstream traffic, which the cache and cap bound.
- **Privacy:** the traveller's location, when they choose to share it, and any pins reach our server and the staff email. The terms text says so.
- No new environment variables.
- The security review (F-9 to F-13) led to these changes:
  - `lib/rate-limit.ts` now creates one independent limiter per limit. Previously a short-window limiter's sweep could reset the booking limit.
  - Cross-site calls to the place endpoints now get a 403.
  - Reverse-lookup URLs carry 4 decimals.
  - Provider text is sanitised.
  - The terms name the geocoder and the map-tile provider.

**Known limitations:**
- **No privacy page.** The site still has no privacy page (security review F-11).
- **No SLA on Photon.** The public Photon service has no SLA and is fair-use only. For real volume, self-host Photon or move to a paid provider.
- **Per-instance limits and cache.** The rate limits and the cache are per server instance, the same caveat as `lib/rate-limit.ts`.
- **Estimate only.** The drive-time figure is straight-line based and not a route. Staff check the real route with the directions link.
- **"Near …" labels.** A reverse-geocoded label names the *nearest named feature*, which may be a shop or hotel beside the pin. The pin itself is authoritative.
- **No keyboard dragging.** The map pins can't be dragged by keyboard, so keyboard users set places through search.

---

## Pending decisions (not yet made)

These are open and must be decided before the relevant work starts. Listed so they are visible rather than rediscovered mid-build.

| # | Question | Blocks | Owner |
|---|---|---|---|
| P-01 | Map view on `/destinations` — provider, licensing, cost, offline behaviour | Destinations index enhancement | Product + Full-Stack |
| P-02 | Ratings/reviews source (first-party vs. aggregated) | Rating component usage | Product |
| P-03 | Multi-currency support and whether a switcher exists | Price display, nav | Product |
| P-04 | Localisation (Sinhala/Tamil) — would require a third font family and a complex-script review | Type system, all copy | Product + UI/UX |
| P-05 | Payment provider selection — must publish a VPAT/ACR for its hosted fields (risk A-05) | Checkout step 3 | Cybersecurity + Full-Stack |
| P-06 | CMS choice, and whether it can enforce the hero luminance gate (risk A-01) | Content workflow | DevOps + Full-Stack |

---
