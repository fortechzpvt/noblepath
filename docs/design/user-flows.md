# Noble Path — User Flows

**Status:** Approved (v1.0)
**Owner:** UI/UX Designer, Fortechz
**Date:** 2026-09-19
**Depends on:** `design-system.md`, `components.md`, `page-specs.md`

Every flow below specifies its **states**: default, empty, loading, error, success. A screen without a defined empty/error state is not implementable — if the engineer hits one that is missing, treat it as a spec defect and raise it rather than inventing UI.

---

## 0. Audience and mental model

| Persona | Need | Entry | Dominant flow |
|---|---|---|---|
| **The dreamer** (60 % of traffic) — has not decided on Sri Lanka yet | Inspiration, "is this for me?" | Home hero, social, search | F1 Discover |
| **The planner** (30 %) — going, needs a route | A day-by-day itinerary that fits their dates and interests | Plan, Trips | F3 Build itinerary |
| **The buyer** (10 %) — ready to commit | Price, dates, confirmation | Trips, Bookings, returning link | F4 Booking |

**Design consequence:** the product must let someone move from *dreaming* to *planning* without an account, and only ask for identity at the point of commitment. See §5 (Account & auth boundary).

---

## 1. Site map

```
/                          Home
/destinations              Destinations index (filterable)
/destinations/[slug]       Destination detail
/experiences               Experiences index (filterable)
/experiences/[slug]        Experience detail
/trips                     Trips / packages index
/trips/[slug]              Trip detail
/plan                      Itinerary builder — step 1 (intake)
/plan/[id]                 Itinerary builder — generated plan (editable)
/about                     About Us
/bookings                  Booking entry (choose what to book)
/bookings/[ref]            Booking detail / manage
/bookings/checkout         Checkout (3 steps)
/bookings/confirmation     Confirmation
/my-trips                  Saved trips (account or local)
```

---

## 2. Primary flow F1 — Discover → Plan → Book

This is the spine of the product. Everything else is a branch off it.

```
 Home hero
   │  "Plan Your Trip" (primary CTA)          "View all" / rail thumbnail
   │                                            │
   ▼                                            ▼
 /plan  (intake)                            /destinations  ──► /destinations/[slug]
   │  duration + interests + month                              │  "Add to trip"
   ▼                                                            ▼
 /plan/[id]  (generated day-by-day plan)  ◄───────────────  Trip tray (persistent)
   │  edit · reorder · swap · add nights
   ├──► Save  ────► /my-trips
   └──► "Book this trip"
            ▼
     /bookings/checkout  (3 steps: traveller → extras → pay)
            ▼
     /bookings/confirmation
```

### F1 step detail

| # | Screen | User action | System response | Success signal |
|---|---|---|---|---|
| 1 | Home | Lands on hero | Hero image + headline reveal (§Motion) | Understands "Sri Lanka, curated" within 3 s |
| 2 | Home | Clicks **Plan Your Trip** | Route to `/plan` | — |
| 3 | `/plan` | Picks **duration** (chips: 3–5 / 6–9 / 10–14 / 15+ / custom) | Chip selects; Continue enables | Continue button becomes enabled |
| 4 | `/plan` | Picks **interests** (multi-select chips, min 1, max 6) | Live count "3 of 6 selected" | — |
| 5 | `/plan` | Picks **travel month** (optional) | Shows a seasonality hint ("South coast: best surf") | — |
| 6 | `/plan` | Clicks **Build my plan** | Loading state (§F3.4) → `/plan/[id]` | Day-by-day plan renders |
| 7 | `/plan/[id]` | Reviews, edits days | Inline edits persist optimistically | Toast "Day 3 updated" |
| 8 | `/plan/[id]` | Clicks **Book this trip** | Route to `/bookings/checkout` with the plan attached | Summary panel shows the plan |
| 9 | Checkout | Completes 3 steps | — | Confirmation with reference code |

**Exit ramps at every step.** A user must always be able to leave the funnel without losing work: the trip tray persists across all routes, and `/plan/[id]` is a shareable URL.

---

## 3. Flow F2 — Browse destination → add to trip

### F2.1 Happy path

1. `/destinations` — user filters by **region** (North / Cultural Triangle / Hill Country / South Coast / East Coast / West & Colombo) and/or **interest** chips.
2. Results grid updates **without a full page reload**; URL updates with query params (`?region=hill-country&interest=hiking`) so the state is shareable and back-button-safe.
3. User opens a destination card → `/destinations/[slug]`.
4. Detail page: hero image, overline (region), H1 name, lead description, "Best time to visit", "Getting there", gallery, nearby experiences, related destinations.
5. User clicks **Add to trip** (primary pill, sticky on mobile).
6. **If no active trip exists:** an inline popover appears with two options — *Start a new trip* (default, focused) or *Add to a saved trip* (only shown when saved trips exist). This is a popover, not a modal — see Decision D-06 in `../decisions/architecture-decisions.md`.
7. Item is added; the **trip tray** (bottom-right pill on desktop, bottom bar on mobile) increments with a count badge and a 240 ms count-up.
8. Toast: *"Sigiriya added to your trip · Undo"* — persists 6 s, dismissible, `role="status"`.

### F2.2 States

| State | Trigger | UI |
|---|---|---|
| **Default** | Results present | Grid of destination cards; result count "24 destinations" above the grid |
| **Loading (first load)** | Route entered | 6 skeleton cards at the current breakpoint's column count; skeleton = `--color-sand-100` with a `--color-sand-200` shimmer at `--dur-6` linear infinite. `aria-busy="true"` on the grid; visually-hidden live region announces "Loading destinations" |
| **Loading (filter change)** | Chip toggled | Grid dims to `opacity: 0.55` over `--dur-2`, a 2 px `--color-jungle-600` progress bar animates under the filter bar. Existing cards remain interactive-disabled (`inert`). No layout shift, no skeleton swap |
| **Empty (no results)** | Filters exclude everything | Centred block: 32 px `map-pin-off` icon (`--color-sand-400`), H3 *"No destinations match those filters"*, body *"Try removing a filter, or explore everything we cover."*, two pills: **Clear all filters** (primary) and **Browse all destinations** (ghost). Active filters are echoed as removable chips directly above |
| **Empty (no content at all)** | CMS has zero destinations | H3 *"We're still mapping this one"* + body + link to `/experiences`. Never show a broken grid |
| **Error (fetch failed)** | 5xx / network | Inline block replacing the grid (not a full-page error): `alert-triangle` icon, H3 *"We couldn't load destinations"*, body *"This is on us, not you. Check your connection and try again."*, **Try again** primary pill (re-fires the request, shows inline spinner in the button). `role="alert"`. The filter bar stays usable |
| **Error (add-to-trip failed)** | Mutation failed | Card returns to pre-add state (optimistic rollback), toast switches to error variant: *"Couldn't add Sigiriya · Try again"* with a retry action. `role="alert"` |
| **Success** | Item added | Trip tray badge increments + 240 ms scale pulse `1 → 1.12 → 1`; **Add to trip** button on the detail page becomes **Added ✓** (secondary variant, still focusable, now labelled "Remove from trip" on hover/focus) |
| **Partial (slow image)** | Images still loading | LQIP blur-up; card text and CTA are fully usable before images land |

### F2.3 Trip tray behaviour

- Persists for **anonymous users** in `localStorage` (key `np.trip.draft`), TTL 30 days.
- On sign-in, the local draft is **merged**, never replaced. If a conflict exists, the user is asked: *"You have an unsaved trip on this device. Keep it, or use your saved trip?"* — two pills, no destructive default.
- Tray shows: count, first 3 item thumbnails, **View trip** link.
- Empty tray is **not rendered at all** (no empty pill floating on screen).

---

## 4. Flow F3 — Build an itinerary in Plan

The Plan builder is the product's differentiator. It must feel like a concierge, not a form.

### F3.1 Step 1 — Intake (`/plan`)

Single screen, no pagination. Three question blocks stacked, each with a `<fieldset>` + `<legend>`:

| Block | Control | Rules |
|---|---|---|
| **How long?** | Filter chips, single-select, `role="radiogroup"` | Options: `3–5 days`, `6–9 days`, `10–14 days`, `15+ days`, `Exact dates…` (opens a date range picker). **Required.** |
| **What are you into?** | Filter chips, multi-select, `role="group"` with `aria-pressed` toggle buttons | Beaches & surf · Wildlife & safari · Hiking & waterfalls · Trains & road trips · Temples & history · Food & markets · Tea country · Ayurveda & slow travel. **Min 1, max 6.** Live counter. |
| **When?** | Month selector, single-select, optional | 12 months + "Not sure yet". Selecting a month shows a seasonality note (see §F3.2). |
| **Pace** (optional, collapsed under "More options") | Segmented control | `Relaxed` · `Balanced` (default) · `Packed` |

- **Submit:** `Build my plan` — primary pill, full-width at < 768, auto-width at ≥ 768.
- The button is **enabled but invalid-on-submit** rather than disabled (a disabled button gives a screen-reader user no explanation). On invalid submit: focus moves to the first incomplete fieldset, an `role="alert"` summary appears above the form listing what is missing, and the fieldset legend gains an error style.

### F3.2 Seasonality hint

Selecting a month renders an info panel (not a blocking warning): *"May–September: the south-west coast is wet. We'll favour the east coast and Cultural Triangle for these dates."* `--color-jungle-50` surface, `--color-jungle-700` text, `info` icon. Never prevents submission.

### F3.3 Step 2 — Generated plan (`/plan/[id]`)

Layout: two-column at ≥ 1024 (plan column + sticky summary rail), single column below.

Each **day block** contains: day number + date (if dates given), a route-line connector down the left gutter, 1–4 **plan items** (destination, experience, transfer, stay), and an **Add to this day** ghost button.

Per-item controls (all keyboard-reachable, all with visible text labels at ≥ 768; icon+`aria-label` at < 768):
- **Swap** — opens a side panel of alternatives matched to the user's interests
- **Remove** — with undo toast
- **Reorder** — drag handle **and** a keyboard alternative: focus the handle, `Space` to lift, `↑/↓` to move, `Space` to drop, `Esc` to cancel. Live region announces "Sigiriya, day 2, position 1 of 3".
- **Notes** — a free-text field per day, 500 char limit with a live counter that only announces at 90 %

Summary rail shows: total days, destinations count, estimated distance, estimated budget range, **Save plan**, **Book this trip**, **Share** (copies URL).

### F3.4 States

| State | UI |
|---|---|
| **Loading (generating)** | Full-column takeover, **not** a spinner. A skeleton of 3 day blocks draws in, with the dotted route line animating downward over `--dur-route`, and a rotating status line: *"Matching your interests…" → "Routing between regions…" → "Balancing your days…"* (each 1.2 s). `aria-live="polite"` announces each. **Hard cap 8 s**; beyond that, fall back to F3.4-Error-timeout. Under `prefers-reduced-motion`, the route line renders complete and only the status text rotates |
| **Empty (zero-day plan impossible)** | Cannot occur — duration is required. If the generator returns nothing, treat as error |
| **Empty (a day with no items)** | Day block renders with a dashed `--color-sand-300` outline, `--radius-xl`, centred text *"Nothing planned yet"* and an **Add something** ghost pill. This is a valid, intentional state — a rest day |
| **Empty (saved trips list)** | `/my-trips` with none: 32 px `route` icon, H3 *"No saved trips yet"*, body *"Build a plan and save it — it'll be here when you come back."*, **Start planning** primary pill |
| **Error (generation failed)** | Replace the plan column: H3 *"We couldn't build that plan"*, body *"Your choices are saved. Try again, or adjust them."*, **Try again** (primary) + **Change my answers** (ghost → back to `/plan` with the intake pre-filled). `role="alert"` |
| **Error (timeout > 8 s)** | Same block, body *"This is taking longer than it should."* Same two actions |
| **Error (edit failed to save)** | The affected item gets a `--color-error-200` left border and an inline retry link; the summary rail shows *"1 change not saved"* in `--color-error-600`. The rest of the plan stays editable. Never lose the user's edit — keep it in local state and retry on reconnect |
| **Offline** | Sticky bar below the nav: *"You're offline. Edits are saved on this device and will sync when you reconnect."* `--color-warning-50` surface, `--color-warning-700` text, `role="status"` |
| **Success (plan built)** | Day blocks stagger in 80 ms apart; the summary rail slides up over `--dur-5`; `aria-live` announces *"Your 7-day plan is ready. 5 destinations across 3 regions."* |
| **Success (saved)** | **Save plan** → spinner in button (`aria-busy`) → checkmark + label change to **Saved**, then a toast *"Plan saved to My Trips · View"*. If anonymous, the toast instead reads *"Plan saved on this device · Create an account to keep it"* with a **Create account** action |
| **Unsaved changes** | Navigating away with unsaved edits triggers a dialog: *"Leave without saving?"* — **Save and leave** (primary) / **Leave** (ghost) / **Cancel** (ghost, default focus). `beforeunload` for hard navigation |

---

## 5. Flow F4 — Complete a booking

### 5.1 Account & auth boundary

| Action | Account required? |
|---|---|
| Browse, filter, view detail | No |
| Add to trip, build a plan, edit a plan | No (local draft) |
| Save a plan permanently / access from another device | Yes |
| Start checkout | No — **guest checkout is supported** |
| Manage or cancel an existing booking | Yes, or via a signed magic link sent to the booking email |

**Rationale:** forcing account creation before checkout is the single biggest drop-off in travel funnels. Identity is collected as part of the traveller-details step anyway; account creation is offered *after* confirmation as a one-click upgrade ("Set a password to manage this booking").

> **Security note for the Cybersecurity Agent:** the booking-management magic link, guest-to-account upgrade, and the local-draft merge on sign-in are all auth-adjacent surfaces defined by this flow. They require review before implementation. Flagged in §8.

### 5.2 Checkout — three steps, one page per step, progress indicator persistent

```
Step 1  Traveller details   →  Step 2  Options & extras  →  Step 3  Payment  →  Confirmation
```

The **summary panel** is present at every step: sticky right rail at ≥ 1024 (top: 24 px below the nav), collapsible sticky bottom sheet at < 1024 showing the total and a "Details" expander.

#### Step 1 — Traveller details
Fields: lead traveller name, email, phone (with country code), number of adults, number of children (with ages if > 0), nationality (affects visa note), arrival date, departure date, special requirements (textarea, optional).

- Autocomplete attributes required on every field (`name`, `email`, `tel`, `bday` etc.).
- Validation on **blur** for format, on **submit** for completeness. Never validate on every keystroke.
- A visa note appears based on nationality: informational, `--color-jungle-50` panel, never blocking.

#### Step 2 — Options & extras
Room type (radio cards), transport (private driver / train + transfers / self-drive), add-ons (checkbox cards: airport pickup, safari jeep upgrade, cooking class, SIM card). Each option shows its price delta (`+ $120`), and the summary panel total updates with a 240 ms count animation and an `aria-live="polite"` announcement of the new total.

#### Step 3 — Payment
Payment fields are rendered by the payment provider inside an iframe/hosted-fields component. **Noble Path never renders a raw card-number input and never receives card data.** Above the fields: total, cancellation policy summary, and a required checkbox for terms with a link that opens in a new tab (with an "opens in new tab" affordance).

### 5.3 States

| State | UI |
|---|---|
| **Default** | Step 1, summary panel populated from the trip/package |
| **Empty (nothing to book)** | `/bookings` reached with no trip and no package: H3 *"Nothing in your trip yet"*, body, three pills: **Browse trips** · **Build a plan** · **Explore destinations** |
| **Loading (price/availability check)** | Summary panel total replaced by a 20 px shimmer bar; the **Continue** button shows an inline spinner and `aria-busy="true"`; the form stays readable and scrollable but `Continue` is the only blocked control |
| **Loading (payment submitting)** | Full-panel lock: `Continue` → spinner + label *"Processing payment…"*, all inputs `readonly` (not `disabled`, so values stay screen-reader accessible), an overlay at `--z-overlay` with `--glass-bg-light`. **Double-submit must be impossible** — idempotency key on the request |
| **Error (field validation)** | Per-field: 1.5 px `--color-error-600` border, `aria-invalid="true"`, `aria-describedby` → message. Message is `--text-small` `--color-error-600` with a 16 px `alert-circle` icon, placed **below** the field, 8 px gap. Copy is specific and actionable: *"Enter an email address so we can send your confirmation"*, never *"Invalid input"* |
| **Error (form-level on submit)** | Summary block at the top of the form, `role="alert"`, focused: H4 *"3 things need your attention"* + a list of anchor links to each field. Focus moves to the summary, not to the first field |
| **Error (payment declined)** | Inline block above the payment fields, `role="alert"`: *"Your card was declined. No money was taken. Try another card, or contact your bank."* Form state preserved. Provider decline codes are **never** shown raw |
| **Error (availability lost mid-checkout)** | Modal, not a toast (it changes what the user is buying): *"The 12 Mar departure just sold out"*, with the two nearest available dates as choices and a **See other trips** ghost action |
| **Error (session expired)** | Non-destructive: the form is preserved in local state, a bar offers **Resume** which re-authenticates and restores |
| **Success** | `/bookings/confirmation`: large checkmark in `--color-success-600` (plus the word "Confirmed" — never colour alone), booking reference in a copyable field with tabular numerals, an itinerary summary, **Add to calendar** and **Download itinerary (PDF)** actions, "What happens next" list, and a soft **Create an account to manage this booking** panel. Confirmation email is sent; the screen says so explicitly with the address used |

### 5.4 Post-booking

- `/bookings/[ref]` — view, download, request a change, cancel (subject to policy).
- **Cancellation is a two-step confirm** with the refund amount stated in the dialog before the destructive action. The destructive button is `--color-error-600`, is **not** the default-focused control, and is labelled with the outcome (*"Cancel booking"*), never just *"Confirm"*.

---

## 6. Secondary flows

### F5 — Browse experiences → open detail → add to a day
Identical mechanics to F2, with one difference: from an experience detail page reached *while a plan is open*, **Add to trip** becomes **Add to day…** and opens a day picker popover listing the plan's days with their current load ("Day 3 · 2 items"). If no plan is open, behaves exactly as F2.

### F6 — Trips (packages) → detail → book
1. `/trips` filtered by duration, interest, budget band.
2. `/trips/[slug]`: hero, at-a-glance strip (days · regions · group size · from-price), day-by-day accordion (the same day-block component as Plan, read-only variant), what's included / not included, gallery, FAQ, sticky booking bar.
3. **Book this trip** → `/bookings/checkout` (F4), **or** **Customise this trip** → forks the package into an editable plan at `/plan/[id]` with a provenance line: *"Based on: 10-Day Island Highlights"*.

### F7 — Search (global)
Accessible from the nav at ≥ 1024 and in the mobile drawer. `role="combobox"` with `aria-expanded`, `aria-controls`, `aria-activedescendant`. Results grouped by type (Destinations / Experiences / Trips) with group headings. Debounce 250 ms. States: idle (recent + popular), typing (loading skeleton rows), results, **no results** (*"Nothing matched 'xyz'. Try a place, an activity, or a region."* + popular suggestions), error (inline, retry).

### F8 — About Us
Static editorial page. No transactional state. Loading = skeleton; error = full-page error with a link home.

### F9 — Newsletter / contact (footer)
Single email field + pill submit. States: default, invalid email (inline), submitting (button spinner), success (field replaced by *"You're on the list."* with a checkmark, `role="status"`), error (inline retry). **Consent checkbox is required and unchecked by default** — no pre-ticked consent.

---

## 7. Cross-cutting state rules

These apply to **every** screen and are not restated per flow.

1. **Loading never blanks content that already exists.** Re-fetches dim and disable; they do not replace rendered content with skeletons.
2. **Skeletons only on first paint** of a region, and only when the expected wait is > 300 ms. Below that, show nothing.
3. **Every error offers a way forward** — retry, adjust, or an alternate route. An error with no action is a spec violation.
4. **Errors are `role="alert"`; progress and success are `role="status"`.** Never the reverse.
5. **Optimistic UI with rollback** for add/remove/reorder. Never for payment.
6. **Toasts are for confirmations with an optional undo**, max 1 visible, 6 s, pause-on-hover/focus, dismissible, never used for errors that block progress.
7. **Destructive actions always have undo or a confirm step.** Removing a plan item = undo toast. Cancelling a booking = confirm dialog.
8. **URL carries state.** Filters, plan id, and checkout step are all in the URL. Back and forward always work. Refresh never loses a plan.
9. **No dead ends.** Every empty and error state offers at least one navigation out.
10. **Focus after navigation:** on route change, focus moves to the page `<h1>` (which has `tabindex="-1"`), and the route change is announced by a polite live region.

---

## 8. Security-sensitive points in these flows

Flagged for the Cybersecurity/AppSec Agent — design-level, requires review before implementation:

| Flow | Surface | Concern |
|---|---|---|
| F4 §5.1 | Guest-checkout magic link for booking management | Link entropy, single-use, short TTL, no booking data in the URL fragment |
| F4 §5.1 | Guest → account upgrade after confirmation | Account takeover if the booking email is unverified at upgrade time |
| F2.3 | `localStorage` trip draft merged on sign-in | Untrusted client data merged into an authenticated account; server must re-validate every item id |
| F3 | `/plan/[id]` is a shareable, unauthenticated URL | Must be an unguessable id, must contain no PII, and must not expose any traveller details added later |
| F4 §5.3 | Payment step | Card data must never touch Noble Path origin; hosted fields only; idempotency key required to prevent double-charge |
| F4 §5.4 | Cancellation | Authorisation check must be server-side; the confirm dialog is UX, not a control |
| F9 | Newsletter | Consent must be explicit and logged; double opt-in recommended |

---

## 9. Measurement (for the analytics/AI agent)

Key events to instrument, so the flows can be evaluated: `hero_cta_click`, `filter_applied`, `destination_view`, `add_to_trip`, `plan_intake_submit`, `plan_generated`, `plan_edit`, `plan_saved`, `checkout_start`, `checkout_step_complete`, `booking_confirmed`, `error_shown` (with an `error_type` dimension). No PII in event payloads.

**Related documents:** `design-system.md` · `components.md` · `page-specs.md` · `accessibility.md`
