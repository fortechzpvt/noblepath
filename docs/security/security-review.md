# Noble Path — Security Review

Reviews are appended chronologically, most recent first. Each review is scoped to a
specific handoff; it does not re-review code outside that handoff unless a finding
requires it.

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
