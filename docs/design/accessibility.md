# Noble Path — Accessibility Requirements

**Status:** Approved (v1.0)
**Owner:** UI/UX Designer, Fortechz
**Date:** 2026-09-19
**Conformance target:** **WCAG 2.2 Level AA**, plus the AAA items noted in §12.
**Depends on:** `design-system.md`, `components.md`, `page-specs.md`, `user-flows.md`

This document is normative. Items marked **BLOCKING** fail code review. Accessibility is a design requirement here, not a remediation phase — the tokens, scrims and focus treatments in `design-system.md` were derived from these rules, not retro-fitted to them.

---

## 1. Why this is the hardest part of this design

Noble Path is built on full-bleed photography with white overlay type and frosted glass. That is the single most contrast-hostile pattern in web design: the background is unknown at build time, it varies per pixel, and it changes when content authors swap an image. Nothing in this system may rely on "the photo happens to be dark there."

The three structural answers, all specified in `design-system.md`:
1. A **measured scrim** with a guaranteed worst case (§10.2 there, §2 here).
2. A **dual focus ring** that is visible on any backdrop (§11 there, §4 here).
3. **Light working surfaces** for everything transactional, so the photographic treatment never reaches a form.

---

## 2. Contrast

### 2.1 Requirements

| Content | Minimum | Notes |
|---|---|---|
| Body text (< 24 px, or < 18.66 px bold) | **4.5:1** | SC 1.4.3 |
| Large text (≥ 24 px, or ≥ 18.66 px bold) | **3:1** | SC 1.4.3 |
| UI component boundaries, icons carrying meaning, focus indicators, chart/route strokes | **3:1** | SC 1.4.11 |
| Disabled controls | exempt | But we still ship `--color-ink-400` at 4.0:1 so they remain perceivable |
| Decorative imagery, the route line where purely ornamental | exempt | SC 1.4.11 exception |
| Text over photography | **as above, guaranteed against a `#FFFFFF` worst case** | See §2.2 |

### 2.2 Text over photography — **BLOCKING**

Contrast over an image is only conformant if it holds for the *worst pixel* under the text, not the average.

Derived minimum scrim opacities (ink `#060A09` over a blown-out `#FFFFFF` highlight):

| Text class | Minimum combined scrim α | Worst-case ratio |
|---|---|---|
| Body / normal (`--text-body`, `--text-body-sm`, `--text-small`, `--text-lead`, `--text-kicker`, `--text-nav`) | **0.55** | 4.76:1 |
| Large / display (`--text-display`, `--text-display-sm`, `--text-h1`, `--text-h2`, and any ≥ 24 px) | **0.45** | 3.67:1 |
| Non-text graphics over photo (route line, dividers, icons) | **0.45** | 3.67:1 |

Tokens `--scrim-min-body` and `--scrim-min-large` exist so this is checkable in code review.

**Verification procedure (required before any hero or photographic band ships, and again whenever a content author swaps an image):**
1. Render the composited section (image + all scrim layers, no text) at **1440 × 900** and at **390 × 780**.
2. For each text run, take its bounding box, inflated by 4 px.
3. Compute the **maximum** WCAG relative luminance across all pixels in that box.
4. Assert `L_max ≤ 0.1833` for normal text and `L_max ≤ 0.3000` for large text.
5. Fail → strengthen the scrim for that image, or reject the image.

This is automatable in CI with a headless-browser screenshot plus a small luminance script. **The AI/ML or DevOps agent should wire step 1–4 into the visual-regression job.** Until it is automated, it is a manual gate on every new image, recorded in `docs/testing/test-results.md`.

**`text-shadow` never counts toward contrast.** It is permitted as reinforcement only.

### 2.3 Text inside glass — **BLOCKING**
Glass surfaces carrying text use `--glass-bg-text` (0.55) minimum. `--glass-bg` (0.38) is decorative-only. `--color-text-meta` (`rgba(255,255,255,0.72)`) is **forbidden inside glass** — see `design-system.md` §10.3.

### 2.4 Colour is never the only indicator — **BLOCKING** (SC 1.4.1)
Every state that uses colour also uses text, an icon, a border-weight change, or a position change:

| State | Colour | Non-colour co-indicator |
|---|---|---|
| Current nav item | amber/jungle underline | `aria-current="page"` + persistent underline |
| Selected chip | jungle fill | check icon + weight 600 |
| Card in trip | jungle border | check badge + "In your trip" text |
| Form error | red border + red text | icon + message text + `aria-invalid` |
| Form success | green border | check icon + visually-hidden "Valid" |
| Sold out | greyscale media | "Sold out" pill text |
| Booking status | status colour | status word |
| Route line travelled segment | amber | "Day 3 of 7" text label |
| Difficulty bar | jungle segments | the words Easy / Moderate / Challenging |

### 2.5 Non-text contrast specifics
- **Form control boundaries.** `--color-sand-200` (`#E6DBC9`) on `#FFFFFF` measures **1.4:1** and `--color-sand-300` measures 1.9:1 — both fail SC 1.4.11. The shipped rule is therefore: **every form control has a `1.5px --color-ink-400` (`#72827C`, 4.0:1 on white) boundary in its default, filled and readonly states, darkening to `--color-ink-500` (6.7:1) on hover.** `--color-sand-200` is a *decorative* divider/card-border token only, never a control boundary. Recorded as **D-07** in `../decisions/architecture-decisions.md`; `components.md` §11 reflects this.
- Card and section borders in `--color-sand-200` are permitted: a card's boundary is also conveyed by its shadow and surface change, and a card is not a UI component whose *state* must be perceivable.
- Focus indicator vs. adjacent colours ≥ 3:1 — satisfied by the dual ring (§4).
- Icon-only controls: the glyph must reach 3:1 against its own background.

---

## 3. Keyboard operability

### 3.1 Global — **BLOCKING**
- Every interactive element is reachable and operable by keyboard alone (SC 2.1.1).
- **No keyboard traps** (SC 2.1.2). Modals trap focus deliberately and release on `Esc` — that is a managed trap, not a violation.
- DOM order equals visual order. Never reorder with `order`, `row-reverse` or `grid-area` in a way that desynchronises them (SC 1.3.2, 2.4.3).
- `tabindex` is `0` or `-1` only. **Positive `tabindex` is forbidden.**
- Skip link is the first focusable element on every page; it targets `#main`.

### 3.2 Tab order per page type
1. Skip link
2. Wordmark → primary nav links → search → trip tray → Book
3. Breadcrumb (if present)
4. `<h1>` (programmatically focusable via `tabindex="-1"`, not in the tab order)
5. Page content in reading order
6. Sticky action bar (mobile) — positioned in the DOM **after** the content it acts on, so it is not encountered before the user has read anything
7. Footer

**Sticky bars caveat:** a fixed bottom bar late in the DOM is correct for reading order but means a keyboard user reaches it last. Acceptable, because the same action also exists in-content (the hero CTA, the card CTA). A sticky bar must never be the *only* instance of an action.

### 3.3 Key bindings

| Component | Keys |
|---|---|
| Buttons / links | `Enter` (both), `Space` (buttons only) |
| Radio chips (duration) | `←/→/↑/↓` move and select, `Tab` enters/leaves the group |
| Toggle chips (interests) | `Tab` between chips, `Space`/`Enter` toggles |
| Tabs | `←/→` move, `Home`/`End` jump, `Enter`/`Space` activate (manual activation — automatic activation would fire network requests on arrow-through) |
| Accordion | `Enter`/`Space` toggle |
| Modal / drawer | `Esc` closes, `Tab` cycles inside, focus returns to the trigger |
| Popover | `Esc` closes, `Tab` may leave (non-modal) |
| Combobox (search) | `↓/↑` move through options, `Enter` selects, `Esc` closes, `Home`/`End` within the input |
| Date picker | `←/→` day, `↑/↓` week, `PgUp`/`PgDn` month, `Shift+PgUp/PgDn` year, `Home`/`End` week bounds, `Esc` close |
| Stepper | `↑/↓` increment, `Home`/`End` min/max |
| Carousel / snap rail | `Tab` through items; rail container is `tabindex="0"` with `←/→` scrolling; prev/next buttons at ≥768 |
| **Itinerary reorder** | Focus the handle → `Space` lift → `↑/↓` move → `Space` drop → `Esc` cancel. **BLOCKING** — drag-only reordering fails SC 2.1.1 and SC 2.5.7 |
| Lightbox | `←/→` navigate, `Esc` close |

### 3.4 Focus management on navigation
- SPA route change: focus moves to the new page's `<h1>` (`tabindex="-1"`), scroll resets to top, and a polite live region announces the new page title.
- After **Load more**: focus moves to the first newly-added card; live region announces the count.
- After a modal closes: focus returns to the element that opened it.
- After deleting an item: focus moves to the next sibling, or to the container's "Add" button if the list is now empty. **Focus must never be lost to `<body>`.**
- After an inline error appears on submit: focus moves to the error summary, not the first field (so the user hears the full scope).

### 3.5 Focus never obscured — **BLOCKING** (SC 2.4.11 Focus Not Obscured, new in 2.2)
The sticky nav and sticky bottom bars can cover a focused element when tabbing. Required mitigation:
```css
:root { scroll-padding-top: calc(var(--nav-height) + 16px); scroll-padding-bottom: calc(var(--sticky-bar-height) + 16px); }
```
`--nav-height` and `--sticky-bar-height` must be kept in sync with the actual rendered heights (set them from the component, not hard-coded). Verify by tabbing the entire Plan and Checkout pages at 390 px and 1440 px with both sticky bars present.

---

## 4. Focus visibility

- `:focus-visible` only; `:focus` is not styled for mouse users.
- **Dual ring** (`design-system.md` §11): a 3 px inner ring in a context colour plus a 2 px outer ring in the opposing colour. This guarantees ≥3:1 against **any** backdrop, which a single ring cannot.
- Light context: `--color-jungle-600` inner + `#FFFFFF` outer.
- Dark/photographic context: `--color-amber-400` inner + `rgba(6,10,9,0.9)` outer.
- Ring follows the control's radius, including `--radius-pill`.
- A transparent `outline: 2px solid transparent; outline-offset: 2px` accompanies every box-shadow ring so **Windows High Contrast Mode / forced-colors** still renders a focus indicator.
- `outline: none` without a replacement indicator is **BLOCKING**.
- Focus indicator area meets SC 2.4.13 (AAA, adopted here): the ring is at least a 2 px perimeter of the control.

### 4.1 Forced-colors mode (`@media (forced-colors: active)`)
- Do not remove borders. Add `border: 1px solid transparent` to elements whose boundary is conveyed by background colour, so the boundary survives.
- Use `forced-color-adjust: none` only on the route-line SVG and brand photography; never on text or controls.
- Scrims and glass are overridden by the OS; verify that hero text falls back to `CanvasText` on `Canvas` and remains readable (it will, because the image is suppressed — but confirm the text is not `#FFFFFF` hard-coded in a way that survives).

---

## 5. Touch targets and pointer

- **Minimum 44 × 44 CSS px** for every interactive target (SC 2.5.8 requires 24 × 24 at AA; we adopt 44 × 44, matching AAA SC 2.5.5, because this is a travel-booking product used one-handed on phones). **BLOCKING below 24 × 24, review-flagged below 44 × 44.**
- Where a visual control is smaller (a 24 px close icon, a 40 px `sm` pill, a 20 px chip remove), extend the hit area with padding or a `::after { position:absolute; inset:-Npx }` overlay. **Never scale the glyph up to reach the size.**
- Minimum 8 px spacing between adjacent targets.
- **Dragging alternative** (SC 2.5.7) — **BLOCKING**: the itinerary reorder must have both the keyboard path (§3.3) and a pointer-only path (the `⋯` menu's "Move up"/"Move down"). Drag is an enhancement.
- **Pointer cancellation** (SC 2.5.2): actions fire on `pointerup`/`click`, never `pointerdown`. Destructive actions are always confirmable or undoable.
- No path-based gestures (SC 2.5.1). Snap rails scroll, but every rail also has prev/next buttons at ≥768 and the content is fully reachable by `Tab`.
- No hover-only information. Anything in a tooltip is also available in text or via focus (SC 1.4.13 — and the tooltip must be dismissible with `Esc`, hoverable, and persistent).

---

## 6. Motion, animation, and the cinematic effects

`prefers-reduced-motion: reduce` must produce a **designed** result, not a broken one. Each effect has a named replacement — **BLOCKING** if any effect simply stops mid-state.

| Effect | Full motion | Reduced-motion replacement |
|---|---|---|
| **Ken Burns** on the hero | `scale(1 → 1.06)` + `object-position` drift over `--dur-ken`, alternating | **Static image rendered at the animation's mid-point crop** (`scale(1.03)`, `object-position: 51% 43.5%`). Not the start frame — the mid-point is the composition we art-directed the scrim against |
| **Parallax** on hero/band images | 0.25× scroll rate, capped 120 px | No transform. Image is positioned at its scroll-zero offset |
| **Route-line draw-on** | `stroke-dashoffset` over `--dur-route` | Path renders fully drawn, immediately, no transition |
| **Hero text stagger** | 80 ms stagger, `translateY(16px)` + fade over `--dur-6` | All text at full opacity, no transform, no delay |
| **Card hover lift** | `translateY(-4px)` + media `scale(1.05)` | Border colour change to `--color-jungle-600` + `--shadow-md` only; no transform |
| **Skeleton shimmer** | 1.4 s sweep | Static `--color-sand-100` blocks |
| **Toast entry** | slide 16 px + fade, `--dur-4` | Fade only, `--dur-2` |
| **Modal / drawer** | slide + fade, `--dur-5` | Fade only, `--dur-2` |
| **Total count-up** in the summary panel | 240 ms numeric tween | Value snaps; the `aria-live` announcement is unchanged |
| **Accordion / tab transitions** | `grid-template-rows` 0fr→1fr over `--dur-3` | Instant open/close |
| **Scroll cue bob** | 1.2 s bob | Static chevron |
| **Smooth scroll** | `scroll-behavior: smooth` | `auto` |
| **Nav hide-on-scroll** | translateY | Disabled — the nav is always visible |

Additional motion rules:
- Nothing flashes more than **3 times per second** (SC 2.3.1). No strobing imagery, no rapid cross-fades.
- Any animation running longer than **5 seconds** that is not user-initiated must be pausable. The Ken Burns loop (18 s) therefore requires a **pause control** — a 44 × 44 icon button in the hero's bottom-right corner (or bottom-left at <768), `aria-label="Pause background animation"` / `"Play background animation"`, persisted in `localStorage` (SC 2.2.2). **BLOCKING.**
- `prefers-reduced-transparency: reduce` → drop all `backdrop-filter`, use `--glass-bg-strong` solid.
- Autoplaying video: none in v1. If added, it must be muted, ≤5 s or pausable, and carry a control.

---

## 7. Images and alternative text

### 7.1 Policy

| Image role | `alt` | Example |
|---|---|---|
| **Hero on a page whose `<h1>` names the subject** | `alt=""` (decorative) | Destination detail hero for Sigiriya — the `<h1>` already says "Sigiriya" |
| **Home hero** | `alt=""` | The `<h1>` "Explore Sri Lanka with us" carries the meaning; the image is mood |
| **Card thumbnail with a visible title** | `alt=""` | Destination card — the title is the link text |
| **Gallery image** | **Descriptive**, 80–150 characters | "Sunrise over Sigiriya rock fortress, with flocks of birds crossing a pink and gold sky above dense jungle." |
| **Image that is the only content of a link** | Describes the **destination of the link**, not the picture | `alt="View the Ella hill country trip"` |
| **Informational graphic** (map, seasonality chart) | Short `alt` + a longer text equivalent adjacent or via `aria-describedby` | "Map of the 10-day route" + a text list of the stops |
| **Decorative motif** (route line, pin, dividers) | `aria-hidden="true"` / `role="presentation"` | — |
| **Team portrait** | Person's name is in adjacent text → `alt=""` | — |

### 7.2 Rules
- `alt` is **never** the filename, never starts with "Image of" / "Picture of", and never duplicates adjacent visible text.
- Every `<img>` has an `alt` attribute. A missing `alt` is **BLOCKING**; an empty `alt=""` is a deliberate, reviewed decision.
- Gallery alt text is authored by the content editor, not generated. The CMS field is **required** with a 150-character guide and a validation warning if it matches the filename.
- `loading="lazy"` + `decoding="async"` everywhere except the LCP image.
- Every image has intrinsic `width`/`height` or an `aspect-ratio` wrapper (CLS, and it prevents the layout jump that disorients low-vision users using magnification).

---

## 8. Semantics and structure

- **One `<h1>` per page**, matching the page's purpose. Heading levels never skip. The card components accept an `as` prop for their heading level (`components.md` §4.5).
- Landmarks: `<header>`, `<nav aria-label>`, `<main id="main" tabindex="-1">`, `<aside aria-labelledby>`, `<footer>`. Each `<nav>` on a page has a distinct label.
- Lists are lists. The trust bar, meta rows, inclusion lists, day list and footer link groups are all `<ul>`/`<ol>`/`<dl>`.
- The itinerary is an `<ol>` — order is meaning.
- `<section>` only with an accessible name (`aria-labelledby` → its heading). An unnamed `<section>` is a `<div>`.
- `role` is used only where no native element exists. **No `<div role="button">`, no `<div role="link">`.**
- `lang="en"` on `<html>`; any Sinhala/Tamil place name in native script gets `lang="si"` / `lang="ta"` on its span.
- Page `<title>` is unique and front-loads the distinguishing part: `Sigiriya — Destinations — Noble Path`.

### 8.1 Live regions

| Purpose | Role/attribute |
|---|---|
| Filter results updated | `aria-live="polite"` (debounced 500 ms), text "24 destinations" |
| Plan generation progress | `aria-live="polite"`, one message per stage |
| Plan ready | `aria-live="polite"`, "Your 7-day plan is ready. 5 destinations across 3 regions." |
| Reorder feedback | `aria-live="assertive"` while a lift is active (it is a modal-like interaction), `polite` otherwise |
| Total price changed | `aria-live="polite"`, "Total updated: 1,680 US dollars" |
| Toast — success | `role="status"` |
| Toast / inline block — failure | `role="alert"` |
| Form error summary | `role="alert"` + focus moved to it |
| Route change | `aria-live="polite"`, announces the new page title |
| Copy confirmation | `role="status"`, "Booking reference copied" |

Live regions are present in the DOM **before** content is injected — injecting the region and its content together is not announced.

Two rules: **never** `aria-live="assertive"` for anything non-urgent, and **never** more than one live region announcing the same event.

---

## 9. Forms

- Every control has a programmatically associated `<label>`. `placeholder` is never a label. `aria-label` only where a visible label is genuinely impossible (a search field with an adjacent icon-only submit).
- **Optional** fields are marked; required ones are not (`components.md` §11.1) — and `required` / `aria-required` is still set on the control.
- `autocomplete` on every field that maps to a token (SC 1.3.5): `name`, `given-name`, `family-name`, `email`, `tel`, `tel-country-code`, `country-name`, `bday`, `street-address`, `postal-code`, `cc-*` (provider-managed).
- **Input purpose + no re-entry** (SC 3.3.7 Redundant Entry, new in 2.2): information already entered in checkout must be auto-populated or offered for selection in later steps. Do not ask for the lead traveller's name twice.
- **Accessible authentication** (SC 3.3.8, new in 2.2): no cognitive-function test. Password fields must allow paste and must have a show/hide toggle. If a CAPTCHA is introduced it must offer a non-cognitive alternative — flag to the Cybersecurity Agent before adding one.
- Validation on blur for format, on submit for completeness. Never on keystroke.
- Errors: `aria-invalid="true"`, `aria-describedby` → the message id (plus the helper-text id if present). Message text is specific and prescriptive.
- Error summary on submit: `role="alert"`, focused, with in-page anchors.
- **Error prevention for legal/financial commitments** (SC 3.3.4) — **BLOCKING**: the final checkout step must show a full review of what is being bought and its total, be reversible before submission, and require an explicit confirming action. Cancellation requires a confirm step stating the refund amount.
- Character counters announce only at ≥90 % of the limit, via a polite live region.
- Timeouts: if a checkout session can expire, warn at 2 minutes remaining with an option to extend (SC 2.2.1). The user's data is preserved regardless.

---

## 10. Content and language

- Reading level: aim for **CEFR B1** English. Many users are not native speakers.
- Link text is self-describing. **No "click here", no bare "Read more".** Where a card's CTA must be short, the accessible name carries the context (`aria-label="View the 10-Day Island Highlights trip"`).
- Abbreviations expanded on first use; `<abbr title>` thereafter.
- Dates written unambiguously: `14 March 2026`, never `14/03/26`.
- Prices always carry an explicit currency (`US$1,450`), and a per-person/per-group qualifier.
- Distances and durations always carry units.
- Idiom and wordplay are avoided in UI copy and error messages (the marketing display headline may be evocative; a validation message may not).
- Sentence case for all UI labels and buttons. Title case only in the wordmark and `--text-overline`.

---

## 11. Responsive, zoom and reflow

- **Reflow** (SC 1.4.10) — **BLOCKING**: no horizontal scrolling at 320 px width / 400 % zoom, except for the explicitly permitted exceptions: the horizontal snap rails, wide data tables, and the seasonality strip — each of which is an intentional two-dimensional control with a keyboard-reachable container and an alternative presentation.
- The design must be tested at **320 px** even though the lowest design breakpoint is 390 px. Nothing may break between 320 and 390.
- **Text spacing** (SC 1.4.12) — **BLOCKING**: no loss of content when the user applies `line-height: 1.5`, `letter-spacing: 0.12em`, `word-spacing: 0.16em`, `margin-bottom: 2em` on paragraphs. Consequence for implementation: **no fixed-height text containers.** Buttons, chips, cards and the trust bar use `min-height` + padding, never `height`.
- **Resize text** (SC 1.4.4): 200 % text-only zoom must not clip content. Consequence: the `clamp()` scale uses `rem` and `vw`, not `vw` alone — `vw`-only sizing does not respond to text zoom and would fail.
- Line-length caps (`--measure-body` 68ch) satisfy the AAA 80-character guideline and materially help dyslexic readers.
- `100svh`, not `100vh`, on the hero.
- Safe-area insets (`env(safe-area-inset-*)`) applied to all fixed bottom bars and the footer.
- Orientation is never locked (SC 1.3.4).

---

## 12. AAA items adopted

We adopt these beyond AA because the product's context justifies them:

| SC | Item | Why |
|---|---|---|
| 2.5.5 | 44 × 44 target size | One-handed mobile booking |
| 2.4.13 | Focus appearance (2 px perimeter, 3:1) | Photographic backgrounds |
| 1.4.8 | Line length ≤ 80 chars, no justified text | Long editorial reading |
| 2.2.2-adjacent | Pause control on the Ken Burns loop | It is the site's most prominent motion |

We do **not** target AAA contrast (7:1) globally — it would force a heavier scrim that destroys the photography, which is the product's core value. This is a documented, deliberate exclusion.

---

## 13. Testing requirements

**BLOCKING before any UI is declared complete.** Results go in `docs/testing/test-results.md`.

### 13.1 Automated
- `axe-core` (via Playwright or `jest-axe`) on every page and on every component story. **Zero violations** at `serious` and `critical`; `moderate` triaged with a written justification.
- Lighthouse accessibility score ≥ 95 on Home, Destinations, Plan, Checkout.
- ESLint `jsx-a11y` with the recommended + strict rule set, no disables without an inline justification comment.
- The **scrim luminance check** from §2.2, wired into visual regression.
- Contrast unit tests: a test that asserts every token pair listed in `design-system.md` §2 still meets its stated ratio. If a token changes, this test fails.

Automated tools catch roughly 30–40 % of issues. They are a gate, not the test.

### 13.2 Manual — required
1. **Keyboard-only pass** on all eight page types: full traverse, every control operable, focus always visible, focus never obscured by a sticky bar, no traps, logical order.
2. **Screen-reader pass:** VoiceOver + Safari (macOS), VoiceOver + Safari (iOS), NVDA + Firefox (Windows). Minimum: Home, Destinations index, Destination detail, Plan builder (including a full reorder), Checkout all three steps, Confirmation.
3. **200 % zoom** and **400 % zoom at 320 px** reflow check on every page.
4. **Text-spacing bookmarklet** applied to every page.
5. **`prefers-reduced-motion`** enabled — every effect in §6 verified against its replacement.
6. **`forced-colors: active`** (Windows High Contrast) — nav, cards, forms, focus rings.
7. **`prefers-reduced-transparency`** — all glass surfaces.
8. **Contrast spot-check** of white text over the three worst-case photographs (brightest sky, lowest-contrast mid-tone, busiest detail).
9. **Touch-target audit** at 390 px with a 44 px overlay grid.
10. **Voice-control pass** (macOS Voice Control / Windows Voice Access): every visible label must be speakable — this catches accessible names that don't match visible text (SC 2.5.3 Label in Name).

### 13.3 Definition of done for a component
- [ ] All states implemented, including `focus-visible`, `disabled`, `loading`, `empty`, `error`
- [ ] Keyboard-operable with the documented key bindings
- [ ] Semantics match the spec's DOM snippet
- [ ] Contrast verified for every colour pairing used
- [ ] Reduced-motion variant implemented
- [ ] Targets ≥ 44 × 44
- [ ] Tested at 320, 390, 768, 1024, 1440, 1920
- [ ] `axe` clean
- [ ] No hard-coded colours, sizes or shadows — tokens only

---

## 14. Known accessibility risks

Documented rather than hidden, per Fortechz policy.

| # | Risk | Severity | Mitigation / status |
|---|---|---|---|
| A-01 | Content editors can upload a hero image that defeats the scrim | **High** | §2.2 verification gate; CMS should reject an image failing the luminance check. **Automation not yet built — manual gate until then.** |
| A-02 | `backdrop-filter` glass is unreadable if the fallback is missed | High | `@supports` fallback mandated in `design-system.md` §7.3; add a lint rule |
| A-03 | Drag-and-drop reorder ships without the keyboard path | High | **BLOCKING** in review (§3.3, §5) |
| A-04 | `--color-sand-200` input borders would be 1.4:1 | Medium | Resolved by D-07 (§2.5): controls use a `--color-ink-400` boundary at 4.0:1 |
| A-05 | Third-party payment iframe accessibility is outside our control | Medium | Provider must publish a VPAT/ACR; evaluate before selection. Flag to Cybersecurity + Full-Stack agents |
| A-06 | Ken Burns pause control is easy to omit | Medium | **BLOCKING** in review (§6) |
| A-07 | `--color-on-image-secondary` (0.88) over a 0.55 scrim is **4.1:1** — below the 4.5:1 body threshold | Medium | Documented in `design-system.md` §10.3. The hero kicker at `--text-kicker` (16–18 px, normal weight) **must therefore sit under a combined scrim of ≥0.62 (5.3:1), not 0.55**. The hero scrim stack delivers ≈0.86 at that position, so it passes comfortably — but any new use of this token at body size must be re-verified |
| A-08 | No localisation plan; Sinhala/Tamil users get English only | Low (v1) | Out of scope; recorded in `page-specs.md` §11 |
| A-09 | The 40 px `sm` pill is below 44 px | Low | Hit-area extender mandated (`components.md` §3.1); verify in the touch-target audit |

---

## 15. Escalation

If an implementation constraint makes one of these requirements impossible, **do not silently drop it**. Raise it to the UI/UX Designer with the constraint stated; the outcome is either a spec change with a recorded ADR, or an accepted exception recorded in §14. An undocumented accessibility regression is a violation of the Fortechz engineering policy (§18).

**Related documents:** `design-system.md` · `user-flows.md` · `components.md` · `page-specs.md` · `../decisions/architecture-decisions.md`
