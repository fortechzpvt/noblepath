# Noble Path — Page Specifications

**Status:** Approved (v1.0)
**Owner:** UI/UX Designer, Fortechz
**Date:** 2026-09-19
**Depends on:** `design-system.md`, `components.md`, `user-flows.md`

---

## 0. Grid system

Mobile-first. Base (unprefixed) styles target 390 px. Breakpoint prefixes after the Tailwind override in `design-system.md` §12: `xs:` 390 · `md:` 768 · `lg:` 1024 · `xl:` 1440 · `2xl:` 1920.

| Breakpoint | Columns | Gutter (side) | Column gap | Content container |
|---|---|---|---|---|
| 390–767 | 4 | 20 px | 16 px | fluid |
| 768–1023 | 8 | 32 px | 20 px | fluid |
| 1024–1439 | 12 | 40 px | 24 px | fluid, max 1280 px |
| 1440–1919 | 12 | 48 px | 24 px | 1280 px (1440 px for card grids/galleries) |
| ≥1920 | 12 | auto | 24 px | 1440 px, centred |

**Standard page shell**
```
<header>  sticky nav
<main id="main" tabindex="-1">
  … sections, each with vertical padding --section-y
<footer>
```
- `<main>` has `tabindex="-1"` so the skip link can move focus to it.
- Section vertical rhythm: `--section-y` between different content types; `--section-y-tight` between a heading block and its own grid.
- **Alternating surface rule:** consecutive light sections alternate `--color-sand-50` → `#FFFFFF` → `--color-sand-50`. Never two adjacent full-bleed photographic sections — the eye needs a light beat between them.

**Section header pattern** (used on nearly every section):
```
[overline]            (--text-overline, --color-jungle-700 on light / --color-amber-500 on dark)
[H2 heading]          (--text-h2, display serif)
[optional lead]       (--text-lead, --measure-lead)
                      … 32px …
[content]
```
At ≥1024, an optional right-aligned "View all →" link sits on the H2's baseline. At <1024 it moves below the content as a full-width ghost pill.

---

## 1. Home — `/`

Goal: convert a dreamer into a planner within one scroll session. Eight sections.

### S1 · Hero (full-bleed)
Per `components.md` §2. Image: Sigiriya sunrise. Contains: kicker, display headline, lead, **Plan Your Trip** CTA, Popular Destinations rail (4 thumbnails + View all), glass trust bar, decorative route line + pin.

| Breakpoint | Layout |
|---|---|
| <768 | Stacked, full width. Text column 100 %. Rail scrolls horizontally (~2.4 visible). Trust bar is a 2 × 2 grid below the rail. Route line hidden. Height `min(100svh, 760px)` |
| 768–1023 | Text column 70 %. Rail shows 3. Trust bar full-width 4-up strip below the rail. Route line hidden |
| 1024–1439 | Text column `min(500px, 48%)`. Rail 4-up bottom-left, trust bar bottom-right on the same band. Route line visible |
| ≥1440 | As the approved mockup. Text column `min(540px, 42%)`. Rail cols 1–6, trust bar cols 8–12 |

### S2 · Why Noble Path (light, `--color-sand-50`)
Three value columns: *Local knowledge* · *Built around you* · *Nothing hidden*. Each = 24 px Lucide icon, `--text-h4` title, `--text-body-sm` body (max 40ch).
Grid: 1 col (<768) · 3 cols (≥768). Gap `--grid-gap`. Section padding `--section-y-tight` top, `--section-y` bottom.
This section exists to give a light beat immediately after the hero and to state the proposition in words rather than photography.

### S3 · Destinations preview (white)
Section header (overline `WHERE TO GO` / H2 *"Places that stay with you"* / View all → `/destinations`).
Destination cards, **stacked** variant.
Grid: horizontal snap rail, 1.15 cards visible (<768) · 2 (768–1023) · 3 (1024–1439) · 4 (≥1440). 6 items max.

### S4 · Experiences (dark photographic band)
Full-bleed background image (`Sunset surf with friends.jpeg`) with `--scrim-vertical` at ≥0.62 under the text block. Section header in on-image tokens.
Content: 4 experience cards in a horizontal snap rail at all breakpoints (cards keep their light surface — they are light islands on a dark band, which is the intended contrast). 1.2 visible (<768) · 2.3 (768–1023) · 3 (1024–1439) · 4 (≥1440).
Height: content-driven; min 560 px at ≥1024.

### S5 · Plan teaser (light, `--color-sand-50`)
Two-column at ≥1024 (`7fr / 5fr`, gap 64 px), stacked below.
Left: overline `PLAN` · H2 *"Tell us what you love. We'll route the island."* · lead · three checklist lines (16 px `check` icon + `--text-body-sm`) · **Start planning** primary pill.
Right: a static, non-interactive preview of three itinerary day blocks at 0.9 scale with the dotted route connector, clipped with a bottom fade to `--color-sand-50`. `aria-hidden="true"` (it is an illustration of the UI, not the UI) — the left column carries all the meaning.

### S6 · Trips (white)
Section header (`READY TO GO` / *"Trips you can book today"*). 3 trip cards. Grid: 1 · 2 · 3 · 3. Below: **See all trips** ghost pill, centred.

### S7 · Editorial quote / island band (full-bleed)
Image `images.jpeg` (jungle villa) at 21:9 (<768: 4:5), `--scrim-wash` + `--scrim-vertical` 0.55.
Centred pull-quote at `--text-display-sm` in the display serif, `--color-on-image`, max 18 words, with an attribution line at `--text-small`. One of the two places the serif appears below display size is **not** here — this is ≥32 px, so the serif is correct.
Height: `min(70svh, 620px)`.

### S8 · Newsletter + footer
Newsletter band on `--color-jungle-900`: H3 `#FFFFFF`, lead `--color-on-image-secondary`, email field + primary-invert pill inline at ≥768 / stacked at <768, consent checkbox below. Then the footer (`components.md` §13).

**Home performance budget:** LCP element is the hero image; target LCP ≤ 2.5 s on a 4G throttle. Only S1 assets are eager; S2 onward lazy-load. Total hero payload ≤ 320 KB (image + fonts + critical CSS).

---

## 2. Destinations index — `/destinations`

### S1 · Compact page header (not a full hero)
Height 320 px (<768: 260 px). Background: a regional photograph with `--scrim-vertical` at 0.62 plus `--scrim-top`.
Content: breadcrumb (≥768), H1 *"Destinations"*, lead (max 52ch), and a result count.
Rationale: index pages get a compact header, not a 100svh hero — the user came to scan a list, and a full hero would push the grid below the fold.

### S2 · Filter bar
Sticky below the nav (`top: nav height`, `--z-sticky`), background `--color-sand-50` with a 1 px `--color-sand-200` bottom border, 64 px tall (72 px at <768 including the horizontal chip scroll).
Contents: **Region** chips (6), **Interest** chips (8), a **Sort** select (Popular / A–Z / Best season now), a **Clear all** ghost chip.
<1024: a **Filters (2)** primary-outline button opening the bottom-sheet drawer; only the 4 most-used chips show inline in a scroll rail.

### S3 · Results grid
Section padding `--section-y-tight`.

| Breakpoint | Columns |
|---|---|
| <768 | 1 |
| 768–1023 | 2 |
| 1024–1439 | 3 |
| 1440–1919 | 3 (container 1440) |
| ≥1920 | 4 |

Above the grid: `24 destinations` at `--text-body-sm` `--color-ink-500`, plus applied-filter removable chips.
Below the grid: **Load more** button (`components.md` §14).
States per `user-flows.md` §F2.2.

### S4 · Region explainer (light)
Six short region cards (name, one line, count) linking to a pre-filtered view. Grid 2 · 3 · 6 (one row at ≥1024, 88 px tall each).

### S5 · Newsletter + footer.

---

## 3. Destination detail — `/destinations/[slug]`

**Implementation status (D-22):** built, scoped down from this spec. S2, S4, S5 and S6 are implemented as
specified (S4/S6 as a simple grid rather than the described rail/three-column layout — see D-22). S1 is
implemented minus the **Add to trip**/**Share** actions (no defined meaning for a bare destination elsewhere
in the app). S3 (gallery) and S7 (sticky action bar) are **not built** — `Destination` carries one `image`,
not a gallery, and S7's bar exists to keep an action reachable that this pass has no action for. Revisit
both if/when a photo gallery and a real "add to trip" concept exist.

### S1 · Hero (medium, full-bleed)
Height `min(72svh, 640px)` at ≥1024; `min(60svh, 520px)` at <768. Transparent nav variant.
Content bottom-left: breadcrumb (≥768), overline = region (`--color-amber-500`), H1 = destination name, meta row (`map-pin` nearest town · `sun` best season · `clock` suggested time) in `--color-on-image-secondary`.
Actions bottom-right at ≥1024 / below the meta at <1024: **Add to trip** (primary-invert) + **Share** (ghost-on-dark, icon+label). *Deferred — see status note above.*

### S2 · Overview
Two-column at ≥1024 (`7fr / 5fr`, gap 64 px); stacked below with the fact panel first at <768 (the facts are what a phone user wants immediately).
Left: `--text-lead` intro then `--text-body` at `--measure-body`, with `<h2>`/`<h3>` subheads. Max 600 words.
Right: **Fact panel** — white card, `--radius-xl`, `--shadow-sm`, 24 px padding, a `<dl>` of: Region · Best months · Typical visit · Entry fee (with currency and an "as of" date) · Nearest airport · Accessibility notes. Sticky at ≥1024 (`top: 128px`). *Built with the three fields `Destination` actually carries (Region, Best months, Typical visit) plus the season note; Entry fee, Nearest airport and Accessibility notes are not in the content model and were not invented (D-22).*

### S3 · Gallery — not built (D-22)
4–8 images. Grid: 1 col snap rail (<768) · 2 cols (768–1023) · a 3-col masonry-style arrangement with one 2 × 2 feature cell (≥1024). Radius `--radius-lg`, gap 16 px.
Opening an image launches a lightbox dialog (`components.md` §14 modal rules): arrow-key navigation, `Esc` closes, counter "3 of 8", caption + descriptive alt, focus returns to the thumbnail. **Not** an infinite carousel.

### S4 · Getting there & around
Three-column (≥768) info blocks: *By road* · *By train* · *Nearby*. Each with a 20 px icon, `--text-h4`, and a short body. Distances use tabular numerals and always state the unit. *Built via the existing `TravelLinks` component, which already grouped by mode this way before this page existed.*

### S5 · Experiences here
Experience cards filtered to this destination. Grid 1 · 2 · 3 · 3. Empty state: *"We haven't added experiences here yet"* + link to `/experiences`.

### S6 · Nearby destinations
Destination cards, snap rail, max 6. Includes the dotted route-line motif as a horizontal connector beneath the rail at ≥1024 (decorative). *Built as a static grid of up to 3 (`getRelatedDestinations`'s existing default), not a snap rail; the route-line connector was not added.*

### S7 · Sticky action bar (<1024 only) — not built (D-22)
Fixed bottom, `--z-sticky`, white surface, `0 -8px 24px -8px rgba(10,15,13,0.16)`, 72 px + `env(safe-area-inset-bottom)`. Contains the destination name (truncated) + **Add to trip** primary pill. Appears once S1's CTA scrolls out of view.

---

## 4. Experiences index — `/experiences`

Structure mirrors `/destinations` with these differences:

- **S1 header** uses `Hey im coming…🇱🇰.jpeg` or `Sunset surf with friends.jpeg`.
- **S2 filters:** Category (8 chips: Beaches & surf, Wildlife & safari, Hiking & waterfalls, Trains & road trips, Temples & history, Food & markets, Tea country, Ayurveda) · Duration (Half-day / Full-day / Multi-day) · Difficulty (Easy / Moderate / Challenging) · Region.
- **S3 grid:** 1 · 2 · 3 · 4 (experience cards are less text-heavy, so 4-up works at 1440).
- **S4 · Seasonality strip:** a 12-month horizontal band showing which categories are best in the current month; 2 px `--color-jungle-600` marker on the current month. Scrollable at <1024. Accompanied by a text summary so the graphic is not the only carrier.

### Experience detail — `/experiences/[slug]`
Same skeleton as destination detail. Differences: the fact panel carries Duration · Difficulty (text + bar) · Group size · What to bring · Price from; S4 becomes **What to expect** (a numbered `<ol>` timeline using the route-line connector); S5 becomes **Where you can do this** (destination cards).

---

## 5. Trips — `/trips` and `/trips/[slug]`

### 5.1 `/trips` index
- **S1** compact header (320 px), H1 *"Trips"*, lead.
- **S2** filter bar: Duration (`3–5` / `6–9` / `10–14` / `15+`) · Interest · Budget band (`$` / `$$` / `$$$`, each with an explicit range in the label, e.g. `$$ · 1,200–2,400`) · Month.
- **S3** grid of trip cards: 1 · 2 · 3 · 3. Sort default: Popular.
- **S4** *"Nothing quite right?"* band on `--color-jungle-900`: H3 + lead + **Build your own plan** primary-invert pill. This is the bridge from Trips to Plan and must always be present, including in the empty state.
- **S5** newsletter + footer.

### 5.2 `/trips/[slug]` detail
| Section | Content | Grid |
|---|---|---|
| S1 Hero | Medium hero, H1 trip name, at-a-glance strip (glass): `10 days` · `4 regions` · `max 12 people` · `from $1,450` | Strip 2 × 2 (<768) / 4-up (≥768) |
| S2 Tabs | Overview · Itinerary · What's included · FAQ. Sticky under the nav at ≥1024 | `components.md` §14 |
| S3 Overview | Lead + body at `--measure-body`, map placeholder panel (static image, alt describes the route in words) | 7fr / 5fr ≥1024 |
| S4 Itinerary | Day blocks, **read-only variant** — no drag handles, no remove; accordion-collapsed beyond day 3 with a "Show all 10 days" button | 1 col; summary rail at ≥1024 |
| S5 Included / Not included | Two lists side by side (≥768), `check` in `--color-success-600` / `x` in `--color-ink-500`. Icons `aria-hidden`; each item starts with "Included:" or "Not included:" in visually-hidden text | 1 · 2 |
| S6 Gallery | As §3 S3 | — |
| S7 FAQ | Accordion, 6–10 items | 1 col, max 760 px |
| S8 Related trips | 3 trip cards | 1 · 2 · 3 |
| Sticky booking bar | ≥1024: right rail from S2 onward (360 px, sticky) with price, date select, **Book this trip** primary, **Customise this trip** secondary. <1024: fixed bottom bar with price + **Book** | — |

---

## 6. Plan — `/plan` and `/plan/[id]`

### 6.1 `/plan` — intake
**No photographic hero.** This is a task screen; a 100svh hero would be hostile. Instead:

- **S1 · Intake header:** 200 px tall, `--color-jungle-900` background with a subtle 8 % dotted route-line pattern. H1 *"Let's build your Sri Lanka"* in `#FFFFFF`, lead in `--color-on-image-secondary`.
- **S2 · Intake form:** centred, max 760 px (`--container-prose`), `--color-sand-50` page background, three `<fieldset>` blocks on white cards (`--radius-xl`, `--shadow-sm`, 24/32 px padding), 24 px apart. Content and rules per `user-flows.md` §F3.1.
- **S3 · Submit:** **Build my plan** primary `lg` pill. Full-width at <768; auto-width, left-aligned at ≥768. Below it, `--text-small` `--color-ink-500`: *"Takes about 5 seconds. You can change everything afterwards."*
- **S4 · Reassurance:** three `--text-small` lines with 16 px icons: *No account needed* · *Free to change* · *Book only what you want*.

Grid: single column throughout. Chip rows wrap; they never scroll horizontally on this page — completeness matters more than compactness here.

### 6.2 `/plan/[id]` — the builder

| Breakpoint | Layout |
|---|---|
| <768 | Single column. Summary becomes a collapsed sticky bottom bar (88 px) with total days + **Book this trip**. Day blocks full width |
| 768–1023 | Single column, max 720 px centred. Summary is a non-sticky card **above** the day list, plus the sticky bottom bar |
| 1024–1439 | `minmax(0,1fr) 360px`, gap 40 px. Summary rail sticky at `top: 128px` |
| ≥1440 | `minmax(0,1fr) 400px`, gap 48 px, container 1280 px |

**Sections**
1. **Plan header** — editable trip title (click-to-edit input, `--text-h1`, with a pencil affordance and a real `<label>` when in edit mode), date range or duration, region summary, **Share** / **Save** / `⋯` actions.
2. **Trip-at-a-glance strip** — days · destinations · regions · est. distance · est. budget. 2 × 3 grid (<768) / 5-up row (≥768). Values tabular.
3. **Day list** — `<ol>` of day blocks (`components.md` §10) with the vertical route connector.
4. **Add a day** — dashed ghost block at the end, `+ Add day 8`.
5. **Summary rail** — totals, **Save plan**, **Book this trip**, **Share**, and a "What's not included" note.

**Add-item side panel:** opens from the right at ≥1024 (400 px, non-modal, pushes nothing — overlays with a `--shadow-xl`), as a bottom sheet at <1024. Contains a search field, category chips, and a scrollable list of destination/experience rows with an **Add** pill each. Focus moves into the panel on open; `Esc` closes and returns focus.

All states per `user-flows.md` §F3.4.

---

## 7. About Us — `/about`

Editorial, single narrow column. No cards, no grids — the contrast with the rest of the site is the point.

| Section | Content | Layout |
|---|---|---|
| S1 Hero | Medium hero (`min(60svh, 560px)`), `Ella srilankan.jpeg`. H1 *"About Noble Path"*, kicker | Full-bleed |
| S2 Story | `--text-lead` opening paragraph, then `--text-body` at `--container-prose` (760 px), centred, with `<h2>` subheads. Drop-cap on the first paragraph: display serif, 3-line, `--color-jungle-700` (CSS `initial-letter` with a `float` fallback) | 1 col, 760 px |
| S3 Pull-quote | Full-bleed light band (`--color-sand-100`), `--text-display-sm` display serif, `--color-ink-900`, centred, max 20 words | 1 col, 860 px |
| S4 Principles | Four numbered blocks (`01`–`04` in the display serif at `--text-h2`, `--color-sand-300`), each with an H3 + body | 1 · 2 · 2 (≥1024 uses a 2 × 2 grid, gap 48 px) |
| S5 Team | Optional. Portrait cards 1:1, `--radius-xl`, name + role. **Only build if real photography exists** — no placeholder avatars | 2 · 3 · 4 |
| S6 Contact | H2, one line, **Get in touch** primary pill → `mailto:` or `/contact`; plus address and hours in a `<address>` | 1 col |
| S7 | Newsletter + footer | — |

---

## 8. Bookings — `/bookings`, `/bookings/checkout`, `/bookings/confirmation`, `/bookings/[ref]`

### 8.1 `/bookings` — entry
No hero. `--color-sand-50` page.
- If a trip/plan exists: a summary card of what's ready to book + **Continue to checkout** primary pill, and a secondary list of bookable services (accommodation, driver, transfers, activities) as checkbox cards.
- If nothing exists: the empty state from `user-flows.md` §F4 (three routes out).
- Below: **Your bookings** — a list of existing bookings for signed-in users, or an email-lookup field for guests ("Find a booking" → magic link).

Layout: single column, max 860 px, centred.

### 8.2 `/bookings/checkout`
**Reduced chrome:** the nav collapses to the wordmark + a `lock` "Secure checkout" label + an exit link. No primary nav links, no search, no trip tray. This is deliberate — every additional link in checkout is a leak. The exit link is a real, obvious link ("Back to your trip"), not a trap.

| Breakpoint | Layout |
|---|---|
| <768 | Single column, `--gutter` 20 px. Progress indicator = "Step 1 of 3" text + a 4 px progress bar. Summary = collapsed bottom sheet |
| 768–1023 | Single column, max 640 px (`--container-form`). Progress = 3 labelled steps. Summary = collapsed bottom sheet |
| ≥1024 | `minmax(0, 640px) 360px`, gap 48 px, centred as a group. Progress = 3 labelled steps above the form. Summary = sticky right rail |
| ≥1440 | Rail 400 px, gap 64 px |

**Progress indicator:** an `<ol>` with `aria-label="Checkout progress"`; the current step has `aria-current="step"`; completed steps show a check and are links back; future steps are plain text, not links. The visible text always includes "Step 2 of 3".

Sections per step per `user-flows.md` §5.2. Every step ends with a **Continue** primary pill (full-width <768) and a **Back** ghost link.

### 8.3 `/bookings/confirmation`
Single column, max 760 px, `--color-sand-50`.
- Success block: 48 px `check-circle` in `--color-success-600` inside a 96 px `--color-success-50` circle, H1 *"You're booked"*, lead with the confirmation email address stated explicitly.
- Reference code: white card, `--radius-lg`, monospace-tabular, 24 px, with a **Copy** button (copy confirmation announced via `role="status"`).
- Itinerary summary (read-only day blocks, collapsed beyond day 3).
- Actions row: **Add to calendar** (secondary) · **Download itinerary** (secondary) · **View booking** (primary).
- "What happens next" — a numbered `<ol>` of 3 items.
- Account upgrade panel (`--color-jungle-50`): *"Set a password to manage this booking"* + primary pill. Dismissible.
- **No upsell carousel on this page.** The page's job is reassurance.

### 8.4 `/bookings/[ref]`
Single column, max 860 px. Booking status badge (word + colour), traveller details, itinerary, payment summary, documents, and a **Manage** section with *Request a change* (primary) and *Cancel booking* (ghost, `--color-error-600` text — the destructive **filled** variant is reserved for the confirm dialog's action).

---

## 9. System pages

| Page | Spec |
|---|---|
| **404** | Full-bleed photograph (`Ella srilankan.jpeg`) with `--scrim-vertical` 0.62. H1 *"This path doesn't exist"*, lead *"The page you're looking for has moved or never was."*, **Back to home** primary-invert + **Explore destinations** ghost-on-dark. Plus a search field. Height `min(80svh, 700px)` |
| **500** | Light page, no photography (the asset pipeline may itself be down). `--color-sand-50`, 32 px `alert-triangle` in `--color-ink-500`, H1 *"Something went wrong on our side"*, **Try again** + **Back to home**. Includes a support reference id if available |
| **Offline** | Same shape as 500, copy adapted, plus a list of any locally-cached plans |
| **Maintenance** | Light page, expected-return time stated, no interactive elements beyond a status link |

All system pages carry the standard nav (solid variant) and footer, except Maintenance.

---

## 10. Print styles (itinerary and confirmation only)

Travellers print itineraries. Required:
- `@media print`: hide nav, footer, sticky bars, all decorative imagery and glass; set `--color-bg` to `#FFFFFF`, text to `#000000`.
- Day blocks become page-break-avoiding units (`break-inside: avoid`).
- The route line prints as a solid 1 px `--color-ink-600` (`components.md` §8.3).
- Link URLs are appended after link text via `content: " (" attr(href) ")"` for external links only.
- The header of every printed page carries the trip name and booking reference.

---

## 11. Open page-level questions

Listed here so they are not lost; each needs a product decision before the relevant page is built.

1. **Map view on `/destinations`** — a toggle between grid and map was considered but is not specified. It needs a mapping-provider decision (cost, licensing, offline) before design.
2. **Reviews / ratings source** — the rating component is specified, but where ratings come from (first-party vs. aggregated) is undecided. Until decided, do not render ratings.
3. **Multi-currency** — all prices are specified as explicit currency. Whether a currency switcher exists is undecided; if added, it is a nav-level control and needs a spec addendum.
4. **Localisation** — the type system is Latin-subset only. Sinhala/Tamil UI would need a third font and an RTL/complex-script review. Out of scope for v1.

**Related documents:** `design-system.md` · `components.md` · `user-flows.md` · `accessibility.md`
