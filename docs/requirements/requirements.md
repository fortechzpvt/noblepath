# Noble Path — Requirements

**Project:** Noble Path
**Owner:** Fortechz
**Status:** Approved for v1 build
**Last updated:** 2026-09-19

---

## 1. Purpose

Noble Path is a Sri Lankan trip-planning website that helps inbound tourists plan
and organise a journey across Sri Lanka efficiently.

The core problem it solves is **time**. Visitors arrive with a fixed number of days
and a long, unordered list of things they have heard about. Noble Path turns that
into an ordered, geographically sensible, bookable plan.

Success means a visitor can go from "I have 10 days in Sri Lanka" to "here is my
day-by-day route, and I have enquired about the parts I want booked" in one sitting.

---

## 2. Target users

| User | Context | Primary need |
| --- | --- | --- |
| First-time visitor | Never been to Sri Lanka, 7–14 days, overwhelmed by options | A credible pre-planned route they can trust |
| Returning / independent traveller | Knows the country, wants specific regions | Browse destinations and experiences, assemble their own plan |
| Short-stay visitor | 3–5 days, often a stopover or business extension | The highest-value itinerary for very little time |
| Group / family organiser | Booking on behalf of others | Clear packages, clear inclusions, a way to enquire |

---

## 3. Functional requirements

### FR-1 — Destinations
- FR-1.1 Browse all destinations in a visual grid.
- FR-1.2 Filter by region (Cultural Triangle, Hill Country, South Coast, East Coast, West Coast, North, Wilderness).
- FR-1.3 Filter by interest tag (culture, nature, beach, wildlife, adventure, food, wellness).
- FR-1.4 Each destination has a detail page with: hero image, description, best time to
  visit, suggested length of stay, what to do there, nearby destinations, and the
  experiences available.
- FR-1.5 A destination can be added to the user's trip from both the grid and the detail page.

### FR-2 — Experiences
- FR-2.1 Browse activities and experiences a visitor can take part in.
- FR-2.2 Each experience states: location, duration, difficulty/intensity, price band, best season.
- FR-2.3 Filter by category and by destination.
- FR-2.4 An experience can be added to the user's trip.

### FR-3 — Trips (pre-planned packages)
- FR-3.1 Browse pre-planned packages grouped by duration (short 3–5 days, classic 7–10 days, grand 12–16 days).
- FR-3.2 Each package shows a day-by-day breakdown, route map/overview, inclusions,
  exclusions, price band and the destinations covered.
- FR-3.3 A package can be taken as-is into the Plan section and then customised.
- FR-3.4 A package can be booked (see FR-5).

### FR-4 — Plan (itinerary builder)
- FR-4.1 The user enters trip length in days, arrival month, and selects interests.
- FR-4.2 The system generates a suggested day-by-day itinerary that is geographically
  coherent — consecutive days must not require implausible travel.
- FR-4.3 The user can add, remove and reorder days and items.
- FR-4.4 The plan persists in the browser between visits without requiring an account.
- FR-4.5 The plan shows total estimated travel time and flags unrealistic days.
- FR-4.6 The finished plan can be sent as a booking enquiry.

### FR-5 — Bookings
- FR-5.1 A visitor can submit a booking enquiry for a package, an experience, or their own plan.
- FR-5.2 The enquiry captures: name, email, phone (optional), party size, arrival date,
  the item being booked, and free-text notes.
- FR-5.3 All input is validated server-side. Invalid submissions return field-level errors.
- FR-5.4 The visitor receives an on-screen confirmation with a reference code.
- FR-5.5 v1 is enquiry-based. **No card payments are taken in v1** — see Section 7.

### FR-6 — About Us
- FR-6.1 Explain who Noble Path is, how itineraries are put together, and why to trust them.

### FR-7 — Cross-cutting
- FR-7.1 Every page is responsive from 390px to 1920px.
- FR-7.2 Every page has correct metadata (title, description, Open Graph, canonical).
- FR-7.3 The site is navigable and operable by keyboard alone.

---

## 4. Non-functional requirements

| ID | Requirement | Target |
| --- | --- | --- |
| NFR-1 | Largest Contentful Paint on the home page, 4G mobile | ≤ 2.5s |
| NFR-2 | Cumulative Layout Shift | ≤ 0.1 |
| NFR-3 | Interaction to Next Paint | ≤ 200ms |
| NFR-4 | Accessibility | WCAG 2.2 AA |
| NFR-5 | Browser support | Last 2 versions of Chrome, Safari, Firefox, Edge; iOS Safari 16+ |
| NFR-6 | No secrets in client bundles | Enforced; only `NEXT_PUBLIC_*` reaches the browser |
| NFR-7 | All user input validated server-side | Enforced via schema validation |
| NFR-8 | Public write endpoints rate limited | Yes |
| NFR-9 | Hero photography payload | ≤ 300KB delivered (AVIF/WebP) |
| NFR-10 | Reduced motion respected | All cinematic motion disabled under `prefers-reduced-motion` |

---

## 5. Design requirements

The approved visual direction is the hero mockup at
`docs/design/` (see `design-system.md`, `page-specs.md`).

The site must feel **cinematic, premium and editorial** while remaining simple to use:
full-bleed photography, white overlay type, high-contrast display serif, geometric
sans for UI, pill CTAs, frosted-glass surfaces, and the dotted route-line motif.

Implementation must trace back to the UI/UX Designer's specification. Deviations
must be recorded in `docs/decisions/architecture-decisions.md`.

---

## 6. Out of scope for v1

- User accounts, login, and saved profiles
- Card payment capture and payment processing
- Live availability or inventory from suppliers
- Multi-language / multi-currency
- A content management system for non-technical editors
- Native mobile applications
- Reviews and user-generated content

---

## 7. Key assumptions

1. **Bookings are enquiries, not transactions.** v1 collects an enquiry and Noble Path
   staff follow up. This removes PCI-DSS scope from v1 entirely. Taking payments is a
   separate project with its own security review.
2. **Content is editorial and version-controlled.** Destinations, experiences and packages
   live as typed data in the repository, not in a database. This is deliberate for v1 —
   see ADR-002.
3. **Photography.** Noble Path owns a small set of photographs. Remaining imagery uses
   licensed stock until the owned library is complete. Tracked as a known limitation.
4. **Prices are indicative bands**, not live quotes. They are labelled as such in the UI.
5. Estimated travel times are derived from typical road conditions and are advisory.

---

## 8. Traceability

| Requirement area | Design | Implementation | Tests |
| --- | --- | --- | --- |
| FR-1 Destinations | `docs/design/page-specs.md` | `app/destinations/` | `docs/testing/test-results.md` |
| FR-2 Experiences | `docs/design/page-specs.md` | `app/experiences/` | `docs/testing/test-results.md` |
| FR-3 Trips | `docs/design/page-specs.md` | `app/trips/` | `docs/testing/test-results.md` |
| FR-4 Plan | `docs/design/user-flows.md` | `app/plan/`, `lib/itinerary.ts` | `docs/testing/test-results.md` |
| FR-5 Bookings | `docs/design/user-flows.md` | `app/bookings/`, `app/api/bookings/` | `docs/security/security-review.md` |
