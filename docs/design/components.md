# Noble Path — Component Specification

**Status:** Approved (v1.0)
**Owner:** UI/UX Designer, Fortechz
**Date:** 2026-09-19
**Depends on:** `design-system.md` (all tokens referenced here are defined there)

## How to read this document

Each component gives: **anatomy → layout & tokens → states → responsive behaviour → DOM/ARIA semantics → motion**. Every value is a token or a number. If a value you need is absent, it is a spec defect — request it; do not invent it.

**States every interactive component must implement:** `default`, `hover`, `focus-visible`, `active`, `disabled`, `loading`, and where applicable `selected`, `error`, `empty`.

**Universal rules**
- Minimum interactive target: **44 × 44 CSS px** (WCAG 2.2 AA). Where the visual control is smaller, extend the hit area with padding or a `::after` overlay — never shrink the target.
- Focus uses the dual ring from `design-system.md` §11. `:focus-visible` only.
- `hover` styles are wrapped in `@media (hover: hover) and (pointer: fine)` so touch devices don't get sticky hover.
- Transitions name their properties explicitly (`transition: background-color var(--dur-2) var(--ease-standard), transform var(--dur-3) var(--ease-standard)`). Never `transition: all`.
- Any component with a dark/photographic variant must declare which context tokens it uses (see `design-system.md` §2.2).

---

## 1. Top navigation

The mockup's nav is transparent over the hero with a white wordmark and white links. It must become solid and legible the moment it leaves the hero.

### 1.1 Anatomy
`[ NOBLE PATH ]` · spacer · `[ Destinations  Experiences  Trips  Plan  About Us ]` · `[ Search ]` `[ Trip tray ]` `[ Book ]`

### 1.2 Layout & tokens

| Property | ≥1024 | 768–1023 | <768 |
|---|---|---|---|
| Height | 80 px | 72 px | 64 px |
| Horizontal padding | `--gutter` | `--gutter` | `--gutter` |
| Position | `sticky; top: 0; z-index: var(--z-nav)` | same | same |
| Wordmark | `--text-wordmark`, uppercase, weight 700, tracking `0em` | same | same |
| Link type | `--text-nav`, weight 400 | — | drawer: `--text-h3` |
| Link gap | 40 px (1024–1199: 32 px) | — | — |
| Link padding | `12px 4px` + a `::after` hit extender to 44 px height | — | `16px 0` |
| Book pill | Primary pill, `sm` size (40 px) | Primary pill `sm` | In drawer, full-width `md` |

### 1.3 Variants

**A. Transparent (over hero)** — only on routes whose first section is a full-bleed hero (`/`, destination/experience/trip detail).
- `background: transparent`
- A `--scrim-top` gradient layer sits behind the nav (160 px tall, `--z-media-scrim`). The nav itself has no background.
- Text: `--color-on-image`; `text-shadow: var(--text-shadow-on-image)`
- Book pill: white fill (`#FFFFFF`), `--color-ink-900` label — maximum contrast against any photo
- Bottom border: none

**B. Solid (scrolled, or any non-hero route)**
- Trigger: `scrollY > heroHeight − navHeight` (use an `IntersectionObserver` sentinel at the hero's bottom edge — **not** a scroll listener)
- `background: rgba(251,248,243,0.86)` + `backdrop-filter: var(--glass-filter)`; `@supports` fallback `--color-sand-50` solid
- Text: `--color-ink-900`; secondary links `--color-ink-600`; no text-shadow
- Bottom border: `1px solid --color-sand-200`
- `box-shadow: var(--shadow-lg)` at 60 % opacity (`0 20px 48px -20px rgba(10,15,13,0.14)`)
- Transition: `background-color`, `color`, `box-shadow` over `--dur-4` `--ease-standard`
- **Hysteresis:** switch to solid at the sentinel, back to transparent only when scrolled 24 px above it, to stop flicker

**C. Hidden-on-scroll-down (≥1024 only, and only on long index pages)** — translateY(−100%) on downward scroll past 400 px, returns on any upward scroll. Never hides on `/plan/[id]` or checkout. Disabled entirely under `prefers-reduced-motion`.

### 1.4 States

| State | Treatment |
|---|---|
| Link default | Full colour, no underline |
| Link hover | 2 px underline (`text-underline-offset: 6px`), colour `--color-amber-500` on transparent / `--color-jungle-700` on solid; underline animates from `scaleX(0)` origin-left over `--dur-2` |
| Link focus-visible | Dual ring, pill-shaped (`--radius-pill`) around the padded link box |
| Link active (pressed) | `opacity: 0.8`, no transform |
| Link current page | Persistent 2 px underline in `--color-amber-500` (transparent) / `--color-jungle-600` (solid), **plus** `aria-current="page"`. Colour is never the only indicator |
| Disabled | Nav links are never disabled |
| Loading | On route transition, a 2 px `--color-amber-500` progress bar at the nav's bottom edge, indeterminate, `--dur-6` |

### 1.5 Responsive

| Breakpoint | Behaviour |
|---|---|
| **<768** | Wordmark + trip tray icon + hamburger (44 × 44). Links move into a full-height drawer |
| **768–1023** | Wordmark + 5 links (`--text-nav` at min size, gap 24 px) + Book pill. Search collapses to an icon |
| **1024–1199** | `About Us` moves under a **More** disclosure button (see D-05 in `design-system.md` §13) |
| **≥1200** | Full nav as in the mockup, plus Search / Trip tray / Book |

**Mobile drawer:** slides from the right, full height, `--glass-bg-strong` over a blurred page + `--color-ink-900` at 92 % fallback. Links at `--text-h3`, 56 px row height, separated by `1px rgba(255,255,255,0.14)`. Closes on `Esc`, on backdrop click, and on route change. **Focus is trapped** while open; `inert` is applied to `<main>` and `<footer>`; scroll is locked on `<body>` preserving scroll position. On close, focus returns to the hamburger.

### 1.6 Semantics

```html
<a class="skip-link" href="#main">Skip to content</a>
<header>
  <nav aria-label="Primary">
    <a href="/" aria-label="Noble Path, home"><span aria-hidden="true">NOBLE PATH</span></a>
    <ul>
      <li><a href="/destinations" aria-current="page">Destinations</a></li>
      …
    </ul>
    <button type="button" aria-expanded="false" aria-controls="mobile-nav" aria-label="Open menu">…</button>
  </nav>
</header>
```
- `<header>` is a landmark; `aria-label="Primary"` on the nav distinguishes it from the footer nav.
- The wordmark link's accessible name is "Noble Path, home". The visible text is `aria-hidden` to avoid a doubled name.
- The hamburger toggles `aria-expanded` and swaps `aria-label` between "Open menu" / "Close menu".
- Skip link: visually hidden until focused, then pinned top-left at `--z-skip-link`, `--color-ink-900` on `#FFFFFF`, `--radius-pill`, 12 × 20 px padding.

---

## 2. Hero

### 2.1 Anatomy (per the mockup, top to bottom)
Full-bleed image → scrim stack → kicker → display headline (2 lines) → lead paragraph → primary CTA pill → rail heading + "View all" → thumbnail rail → glass trust bar. Decorative dotted route line + pin overlays the right half.

### 2.2 Layout & tokens

| Property | ≥1440 | 1024–1439 | 768–1023 | <768 |
|---|---|---|---|---|
| Height | `min(100svh, 900px)`, min 720 px | `min(100svh, 860px)` | `min(92svh, 780px)` | `min(100svh, 760px)`, min 600 px |
| Image ratio | 21:9 crop, `object-fit: cover`, `object-position: 50% 45%` | same | 16:9 | **4:5 art-directed crop** via `<picture>` |
| Text column width | `min(540px, 42%)` | `min(500px, 48%)` | `min(560px, 70%)` | 100 % |
| Text alignment | left | left | left | left |
| Content inset | `--gutter` left, bottom aligned above the rail | same | same | same |
| Kicker → headline gap | 20 px | 20 px | 16 px | 16 px |
| Headline → lead gap | 24 px | 24 px | 20 px | 16 px |
| Lead → CTA gap | 32 px | 32 px | 28 px | 24 px |
| CTA → rail heading gap | 56 px | 48 px | 40 px | 32 px |

- Use `100svh`, not `100vh` — mobile browser chrome otherwise clips the rail.
- The hero is its own stacking context (`isolation: isolate`).
- Layer order: image (`z:0`) → `--scrim-wash` → `--scrim-vertical` → `--scrim-horizontal` (≥768 only) → route line (`--z-raised`) → content (`--z-media-content`).

### 2.3 Typography (mapped from the mockup)

| Element | Token | Colour |
|---|---|---|
| Kicker `Sri Lanka is Waiting ....` | `--text-kicker` (Poppins 400, sentence case) | `--color-on-image-secondary` |
| Headline `Explore` / `Sri Lanka with us` | `--text-display` (Playfair Display 700) | `--color-on-image` + `--text-shadow-on-image` |
| Lead paragraph | `--text-lead` (Poppins 400, `--measure-hero`) | `--color-on-image-secondary` |
| CTA label `Plan Your Trip →` | `--text-button-serif` (Playfair Display 600) | `--color-ink-900` on white pill |
| Rail heading `Popular Destinations` | `--text-h3` (Poppins 600) | `--color-on-image` |
| `View all` | `--text-body-sm` 600 | `--color-on-image` + 2 px `--color-amber-500` underline (D-01) |

The headline breaks manually into two lines at ≥768 using `<br>` inside a `<span>`; at <768 it wraps naturally with `text-wrap: balance`.

### 2.4 Thumbnail rail

| Property | Value |
|---|---|
| Thumbnail size | 176 × 88 (2:1) @ ≥1440 · 160 × 80 @ 1024–1439 · 148 × 74 @ 768–1023 · 140 × 70 @ <768 |
| Radius | `--radius-lg` (20 px) |
| Border | `1px solid rgba(255,255,255,0.28)` |
| Shadow | `--shadow-media` |
| Gap | 16 px |
| Count | 4 visible @ ≥1024 · 3 @ 768 · horizontal scroll, ~2.4 visible @ <768 |
| Label | Destination name at `--text-small` 600 `--color-on-image`, over `--scrim-card`, bottom-left, 10 px inset. **Required** — an unlabelled thumbnail is not an accessible link |

**Mobile scroll rail:** `overflow-x: auto`, `scroll-snap-type: x mandatory`, `scroll-padding-inline-start: var(--gutter)`, each item `scroll-snap-align: start`. `-webkit-overflow-scrolling: touch`. Scrollbar hidden visually but the container is keyboard-scrollable and has `tabindex="0"` with `role="group"` and `aria-label="Popular destinations"` so keyboard users can scroll it. Prev/next buttons appear at ≥768 when the rail overflows.

**States:** hover → `transform: scale(1.04)` + border to `rgba(255,255,255,0.5)` over `--dur-3`; focus-visible → dual ring on dark; active → `scale(0.99)`; loading → `--color-ink-700` fill with LQIP blur-up.

### 2.5 States

| State | Treatment |
|---|---|
| **Default** | As specified |
| **Loading (image not yet decoded)** | LQIP (20 px AVIF, `filter: blur(20px) scale(1.06)`), cross-fades to the full image over `--dur-5`. Text and CTA render immediately at full opacity — **never** gate text on the image |
| **Loading (rail data)** | 4 thumbnail-shaped `rgba(255,255,255,0.10)` blocks with a slow highlight sweep; heading and CTA already present |
| **Error (hero image fails)** | Fall back to `--color-jungle-900` → `--color-ink-900` vertical gradient. All text stays at spec contrast (white on jungle-900 = 12.4:1). The hero must never be unreadable because of a failed asset |
| **Empty (no rail items)** | Rail and its heading are omitted entirely; the trust bar moves up to fill. No empty placeholder |
| **Reduced motion** | No Ken Burns, no parallax, no route draw-on. Text appears at full opacity with no stagger |

### 2.6 Motion

| Effect | Spec |
|---|---|
| Text reveal | Kicker → headline line 1 → headline line 2 → lead → CTA, each `translateY(16px) + opacity 0→1`, `--dur-6`, `--ease-cinematic`, 80 ms stagger. Fires once, on load |
| Ken Burns | `scale(1) → scale(1.06)` with `object-position` drifting `50% 45% → 52% 42%` over `--dur-ken`, `--ease-linear`, `alternate infinite`. `will-change: transform` set only while running |
| Parallax | Image translates at `0.25×` scroll rate, capped at 120 px total. Implemented with a scroll-linked animation or `transform` on rAF — never on a scroll event handler that writes layout |
| Route line | `stroke-dashoffset` draw over `--dur-route` `--ease-cinematic`, fires at 25 % intersection, once. Pin fades + drops 8 px over `--dur-5` after the draw completes |
| Scroll cue | A 24 px chevron, 1.2 s gentle 6 px bob, fades out after the first scroll. `aria-hidden` |

### 2.7 Semantics

```html
<section aria-labelledby="hero-title">
  <picture>…<img alt="" fetchpriority="high" decoding="async" width="…" height="…"></picture>
  <div aria-hidden="true"><!-- scrim layers --></div>
  <div>
    <p>Sri Lanka is Waiting ....</p>
    <h1 id="hero-title">Explore<br>Sri Lanka with us</h1>
    <p>Discover breathtaking destinations, unique experiences and unforgettable memories across Sri Lanka.</p>
    <a href="/plan" class="btn btn--primary-invert">Plan Your Trip <svg aria-hidden="true">…</svg></a>
  </div>
  <svg aria-hidden="true" role="presentation"><!-- route line + pin --></svg>
</section>
```
- The hero image is **decorative** in context (`alt=""`) because the `<h1>` already names the place and the page. See `accessibility.md` §7 for the full alt-text policy.
- The route line SVG is `aria-hidden="true"`.
- The kicker is a `<p>`, **not** an `<h2>` — it is not a heading, and making it one breaks the heading outline.

---

## 3. Pill button

One shape, three variants, three sizes. Every button in the product.

### 3.1 Sizes

| Size | Height | Padding X | Gap (icon↔label) | Type token | Icon |
|---|---|---|---|---|---|
| `sm` | 40 px | 20 px | 8 px | `--text-button` min | 16 px |
| `md` (default) | 48 px | 28 px | 10 px | `--text-button` | 20 px |
| `lg` | 56 px | 36 px | 12 px | `--text-button` max | 20 px |

All sizes: `border-radius: var(--radius-pill)`, `font-family: var(--font-sans)`, `font-weight: 600`, `white-space: nowrap`, `display: inline-flex; align-items: center; justify-content: center`.
`sm` at 40 px is below the 44 px target — it must carry `position: relative` + a `::after { inset: -2px -0px; min-height: 44px }` hit extender, or only be used inside a ≥44 px container row.

### 3.2 Variants — light context

| Variant | Default | Hover | Active | Focus-visible | Disabled |
|---|---|---|---|---|---|
| **Primary** | bg `--color-jungle-700`, label `#FFFFFF` (8.8:1), `--shadow-sm` | bg `--color-jungle-600`, `--shadow-md`, `translateY(-1px)` | bg `--color-jungle-800`, `translateY(0)`, `--shadow-xs` | `--focus-ring` | bg `--color-sand-200`, label `--color-ink-400`, no shadow, `cursor: not-allowed` |
| **Secondary** | bg `transparent`, label `--color-jungle-700`, `1.5px` border `--color-jungle-700` | bg `--color-jungle-50`, border `--color-jungle-600` | bg `--color-jungle-200` | `--focus-ring` | border + label `--color-ink-400` |
| **Ghost** | bg `transparent`, label `--color-ink-900`, no border | bg `rgba(10,15,13,0.06)` | bg `rgba(10,15,13,0.10)` | `--focus-ring` | label `--color-ink-400` |
| **Destructive** | bg `--color-error-600`, label `#FFFFFF` (6.5:1) | bg `#9C1F18` | bg `#851A14` | `--focus-ring` | as Primary disabled |

### 3.3 Variants — dark / photographic context

| Variant | Default | Hover | Active | Focus-visible |
|---|---|---|---|---|
| **Primary-invert** (the hero CTA) | bg `#FFFFFF`, label `--color-ink-900` (19.4:1), `--shadow-media` | bg `--color-sand-50`, `translateY(-1px)`, arrow icon translates `+4px` over `--dur-2` | bg `--color-sand-100`, `translateY(0)` | `--focus-ring-on-dark` |
| **Secondary-on-dark** | bg `rgba(255,255,255,0.12)` + `backdrop-filter: blur(var(--blur-sm))`, label `#FFFFFF`, border `1px rgba(255,255,255,0.4)` | bg `rgba(255,255,255,0.22)`, border `rgba(255,255,255,0.6)` | bg `rgba(255,255,255,0.3)` | `--focus-ring-on-dark` |
| **Ghost-on-dark** | label `#FFFFFF`, no bg | bg `rgba(255,255,255,0.12)` | bg `rgba(255,255,255,0.2)` | `--focus-ring-on-dark` |

> `rgba(255,255,255,0.12)` over a blown-out photo does **not** guarantee label contrast on its own. Secondary-on-dark and Ghost-on-dark are only permitted inside a region already carrying a ≥0.55 scrim (hero, card scrim, glass panel). Outside such a region, use Primary-invert.

### 3.4 Loading state

- Label is **replaced** by a 20 px spinner **and** the button keeps its rendered width (capture width before swap, or use `min-width`) so the layout does not jump.
- `aria-busy="true"`, `aria-disabled="true"`; the button remains focusable (do **not** set the `disabled` attribute — it would move focus and silence the control for AT).
- The accessible name changes to the progress phrasing: `aria-label="Processing payment"`.
- Spinner: 2 px stroke, `currentColor`, 800 ms linear rotation. Under reduced motion, the spinner is replaced by a static 3-dot pulse at 0.01 ms (effectively static) plus the text label *"Working…"*.
- Minimum display time 400 ms, to avoid a flash.

### 3.5 Icon rules
- Leading icon for category/meaning, trailing icon for direction/navigation (the hero CTA's `arrow-right` is trailing).
- Icon-only buttons: 48 × 48 (`md`), always `aria-label`, always a tooltip on hover/focus.
- Icons are `aria-hidden="true"` whenever a visible label exists.

### 3.6 Semantics
- Navigates → `<a>` styled as a button. Performs an action → `<button type="button">`. Submits → `<button type="submit">`. **Never** a `<div role="button">`.
- Disabled links do not exist. If a navigation is unavailable, render a `<button disabled>` or omit it.
- Transition: `background-color var(--dur-2) var(--ease-standard), box-shadow var(--dur-2), transform var(--dur-2)`.

---

## 4. Destination card

### 4.1 Anatomy
Media (4:3) with `--scrim-card` → region overline → name (H4) → 1–2 line description → meta row (best season · nearest town) → optional **Add to trip** icon button top-right.

Two variants:
- **`overlay`** (used on the Home rail and featured grids): all text sits over the image, over `--scrim-card`.
- **`stacked`** (used on `/destinations` index, and everywhere on light backgrounds): image on top, text on a white surface below. **This is the default** — it stays readable regardless of the photo.

### 4.2 Layout & tokens (stacked)

| Property | Value |
|---|---|
| Surface | `--color-surface` (`#FFFFFF`) |
| Radius | `--radius-xl` (24 px) |
| Border | `1px solid --color-sand-200` |
| Shadow | `--shadow-sm` |
| Media | `aspect-ratio: 4/3`, `object-fit: cover`, inner radius flush (card radius 24, media is flush to three edges so it keeps 24 px top corners) |
| Body padding | `--card-pad` (16/20/24 px by breakpoint) |
| Overline → title | 8 px |
| Title → description | 8 px |
| Description → meta | 12 px |
| Meta row | `--text-small`, `--color-text-meta`, 16 px icons, 12 px gap |
| Title | `--text-h4`, `--color-ink-900`, clamp 2 lines (`-webkit-line-clamp: 2`) |
| Description | `--text-body-sm`, `--color-ink-600`, clamp 2 lines |

### 4.3 States

| State | Treatment |
|---|---|
| **Default** | As above |
| **Hover** | `translateY(-4px)`, `--shadow-md`, media `scale(1.05)` (media wrapper `overflow: hidden`), title colour → `--color-jungle-700`. All over `--dur-3` `--ease-standard` |
| **Focus-visible** | Dual ring on the **whole card**, following `--radius-xl`. No transform (movement on focus is disorienting) |
| **Active** | `translateY(-1px)`, `--shadow-sm` |
| **Disabled / unavailable** | `opacity: 0.6`, media `filter: grayscale(0.7)`, a `--color-sand-200` badge reading "Temporarily closed". Card is still focusable and readable; the CTA inside is `disabled` |
| **Loading (skeleton)** | Same footprint. Media → `--color-sand-100`; three text bars (60 %, 100 %, 80 % width) at 12/16/12 px height, `--radius-xs`, `--color-sand-100`, shimmer `--color-sand-200` at 1.4 s linear infinite. `aria-hidden="true"` on the skeleton; the container carries `aria-busy="true"` |
| **Selected (in trip)** | 2 px `--color-jungle-600` border, a `--color-jungle-600` check badge top-right (24 px, white glyph), and the text "In your trip" in the meta row. Never border-colour alone |
| **Empty** | A card is never empty — if data is missing the card is not rendered |
| **Error (image)** | `--color-sand-100` fill + 32 px `--color-sand-400` mountain glyph; text content unaffected |

### 4.4 Responsive

| Breakpoint | Columns (on `/destinations`) | Notes |
|---|---|---|
| <768 | 1 | Full-width card; media 4:3 |
| 768–1023 | 2 | gap `--grid-gap` (20) |
| 1024–1439 | 3 | gap 24 |
| 1440–1919 | 3 | container `--container-wide`; cards get wider, not more numerous |
| ≥1920 | 4 | container `--container-wide`, centred |

On the Home rail the `overlay` variant is used at a fixed 320 × 400 (4:5) with horizontal scroll below 1024.

### 4.5 Semantics

```html
<article class="card">
  <a href="/destinations/sigiriya" class="card__link">
    <img src="…" alt="" width="800" height="600" loading="lazy" decoding="async">
    <p class="overline">Cultural Triangle</p>
    <h3 class="card__title">Sigiriya</h3>
    <p class="card__desc">A fifth-century rock fortress rising 180 m above the jungle.</p>
  </a>
  <ul class="card__meta">
    <li><svg aria-hidden="true"></svg>Best: Jan–Apr</li>
    <li><svg aria-hidden="true"></svg>Dambulla, 18 km</li>
  </ul>
  <button type="button" aria-label="Add Sigiriya to your trip">…</button>
</article>
```
- **Do not wrap the whole card in an `<a>`** when it contains a second control. Use the "card link with pseudo-element overlay" pattern: the title link carries `::after { position: absolute; inset: 0 }`, and the **Add to trip** button gets `position: relative; z-index: 1` so it stays clickable. This keeps exactly one link per card in the AT tab order.
- Heading level is context-dependent: `<h3>` inside a section with an `<h2>`; the component must accept an `as` prop for its heading level.
- Card media `alt=""` because the adjacent title names the subject. On a detail page gallery, alt is descriptive (`accessibility.md` §7).

---

## 5. Experience card

Differs from the destination card by carrying **activity metadata** and an intensity indicator.

### 5.1 Anatomy
Media (3:2) → category tag (pill, `--color-clay-100` bg / `--color-clay-600` text, or `--color-jungle-50`/`--color-jungle-700`) → title (H4) → description (2 lines) → **meta strip**: duration · difficulty · region → price-from (optional).

### 5.2 Layout & tokens
Same surface/radius/shadow/padding as the destination card. Differences:

| Property | Value |
|---|---|
| Media ratio | `3/2` |
| Category tag | Height 24 px, padding `4px 10px`, `--radius-xs`, `--text-small` 600. Positioned **in the body**, not over the media (over-media tags fail contrast unpredictably) |
| Difficulty | Text label (`Easy` / `Moderate` / `Challenging`) **plus** a 3-segment bar (12 × 4 px segments, 3 px gap, filled `--color-jungle-600`, empty `--color-sand-200`). Text first — the bar is decorative and `aria-hidden` |
| Duration | `clock` icon 16 px + `2–3 hours` at `--text-small` |
| Price | `From $45` — `--text-h5`, `--color-ink-900`, `font-variant-numeric: tabular-nums`. Currency is explicit, never a bare number |

### 5.3 States
Identical to the destination card (§4.3), plus:

| State | Treatment |
|---|---|
| **Seasonal / unavailable now** | `--color-warning-50` inline strip inside the body: `alert-circle` 16 px + "Best May–Sep" at `--text-small` `--color-warning-700`. Card remains fully interactive |
| **Added to a day** | Check badge + meta text "On day 3". Clicking the badge opens the day picker |

### 5.4 Responsive
Columns on `/experiences`: 1 (<768) · 2 (768–1023) · 3 (1024–1439) · 4 (≥1440). Gap `--grid-gap`.

### 5.5 Semantics
As §4.5. The meta strip is a `<ul>`. Difficulty is exposed as text inside a `<span>`; the segment bar is `aria-hidden="true"`.

---

## 6. Trip / package card

The most information-dense card. It sells.

### 6.1 Anatomy
Media (16:9) → **duration badge** over the media, bottom-left → title (H4, up to 2 lines) → region chips row (max 3 + "+2") → inclusions row (3 icons + labels: stays · transport · guide) → **price block** (from-price, per-person note, optional strike-through original) → **View trip** secondary pill + **Book** primary pill.

### 6.2 Layout & tokens

| Property | Value |
|---|---|
| Media ratio | `16/9` |
| Duration badge | Glass over media: `--glass-bg-text`, `--radius-pill`, padding `6px 14px`, `--text-small` 600, `#FFFFFF`, 12 px inset from bottom-left, `backdrop-filter: blur(var(--blur-sm))` |
| Region chips | 24 px tall, `--radius-pill`, `--color-sand-100` bg, `--color-ink-600` text, `--text-small` |
| Inclusions | 3-column grid, 20 px icon above a `--text-small` `--color-ink-600` label, centred |
| Divider above price | `1px --color-sand-200`, full-bleed to card padding, 16 px margin |
| Price | `From` at `--text-small` `--color-ink-500`, amount at `--text-h3` `--color-ink-900` tabular, `/person` at `--text-small` `--color-ink-500` |
| Original price (if discounted) | `--text-body-sm`, `--color-ink-500`, `text-decoration: line-through`, **plus** a visually-hidden "Was" prefix and a "Save 15 %" tag in `--color-success-600` on `--color-success-50` |
| Actions | Row at ≥768 (secondary + primary, 12 px gap); stacked full-width at <768, primary first |
| Card padding | `--card-pad` |

### 6.3 States

| State | Treatment |
|---|---|
| Default / hover / focus / active | As destination card (§4.3) |
| **Sold out** | Media `filter: grayscale(0.8) brightness(0.9)`; a `--color-ink-900` / `#FFFFFF` "Sold out" pill replaces the duration badge; **Book** becomes `disabled`; **View trip** stays enabled; a "Notify me" ghost link appears |
| **Limited availability** | `--color-warning-50` strip: "Only 3 places left · departs 12 Mar" |
| **Loading** | Skeleton mirroring the anatomy: media block, 2 title bars, 3 chips, 3 icon blocks, a price bar, 2 pill outlines |
| **Price loading** | Only the price block shows a 24 × 96 px shimmer; everything else is live. `aria-live="polite"` announces the resolved price once |
| **Error (price unavailable)** | Price block reads "Price on request" with a **Contact us** ghost link. Never render `$NaN`, `$0`, or a blank |

### 6.4 Responsive
Columns on `/trips`: 1 (<768) · 2 (768–1023) · 3 (≥1024). Cards do not go to 4-up — the density would compress the price block below legibility.

### 6.5 Semantics
`<article>` with an `<h3>`; price uses `<p>` with a visually-hidden full phrasing ("From 1,450 US dollars per person") so screen readers don't read "From 1450 slash person". Two actions = two real elements (`<a>` for View, `<a>` or `<button>` for Book), each with the trip name in its accessible name (`aria-label="Book 10-Day Island Highlights"`) so a list of cards isn't 12 identical "Book" links.

---

## 7. Glass trust bar

The mockup's four-item strip: **Best Price · 24/7 Travel Support · Flexible Booking · Secure Payments**, on frosted glass with vertical dividers.

### 7.1 Layout & tokens

| Property | ≥1024 | 768–1023 | <768 |
|---|---|---|---|
| Position | Bottom-right of the hero, inline with the thumbnail rail | Full-width strip **below** the rail (D-04) | Full-width strip below the rail |
| Layout | 4 columns, `display: grid; grid-template-columns: repeat(4, 1fr)` | 4 columns | **2 × 2 grid** |
| Height | 88 px | 80 px | auto (two 64 px rows) |
| Padding | `20px 28px` | `16px 24px` | `16px 20px` |
| Radius | `--radius-xl` (24 px) | `--radius-xl` | `--radius-lg` |
| Background | `--glass-bg-text` + `--glass-filter` | same | same |
| Border | `1px solid --glass-border` | same | same |
| Shadow | `--shadow-glass` | same | same |
| Item gap | 0 (dividers do the work) | 0 | 0 |
| Divider | `1px` solid `--color-on-image-rule` (`rgba(255,255,255,0.28)`), full item height minus 12 px top/bottom, on `:not(:first-child)::before` | same | vertical between columns, horizontal between rows |
| Label | `--text-body-sm` weight 500, `#FFFFFF`, max 2 lines, `text-wrap: balance`, centred | same | same |
| Item padding | `0 20px` | `0 14px` | `0 12px` |

### 7.2 Icons
The mockup shows text only. **Keep it text-only.** Adding four icons to a 88 px glass strip crowds it and the icons would carry no information the labels don't. If a future variant needs icons, they go **above** the label at 20 px, and the bar grows to 104 px.

### 7.3 States
This component is **non-interactive** by default — it is a reassurance banner, not navigation.

| State | Treatment |
|---|---|
| Default | As above |
| Hover | None (non-interactive) |
| **Linked variant** (if an item links to a policy page) | The whole item becomes an `<a>`, hover → `background: rgba(255,255,255,0.08)` on that cell, label underline; focus-visible → `--focus-ring-on-dark` inset within the cell; the cell must be ≥ 44 px tall |
| Loading | Never — this content is static and ships in the HTML |
| Reduced transparency (`prefers-reduced-transparency: reduce`) | Drop `backdrop-filter`, use `--glass-bg-strong` (0.68) solid |
| No `backdrop-filter` support | `--glass-bg-strong` solid (see `design-system.md` §7.3) |

### 7.4 Semantics
```html
<ul aria-label="Why book with Noble Path">
  <li>Best Price</li>
  <li>24/7 Travel Support</li>
  <li>Flexible Booking</li>
  <li>Secure Payments</li>
</ul>
```
A `<ul>` (it is a list of four peer claims). Dividers are CSS `::before`, never characters, so they are not announced.

---

## 8. Route line + pin motif

### 8.1 Spec
All visual properties are defined in `design-system.md` §10.5. This section covers usage.

### 8.2 Placements

| Context | Use |
|---|---|
| **Hero** | Decorative curve from the pin (over the rock) sweeping down-right to the trust bar. `aria-hidden="true"`. Hidden below 768 px — at that width it crosses the text column and the crop leaves no room |
| **Plan day list** | Vertical connector in the left gutter of the day column: a 2 px dotted line between day markers, with a filled dot at each day. `aria-hidden="true"`; day sequence is conveyed by the `<ol>` and the visible "Day 3" labels |
| **Trip detail day accordion** | Same vertical connector, read-only |
| **Section transition** | A single short arc between two stacked editorial sections at ≥1024, max 200 px wide, `--color-sand-300` on light surfaces (not white) |

### 8.3 States

| State | Treatment |
|---|---|
| Default | `#FFFFFF` at 0.92 on photography; `--color-sand-300` on light surfaces |
| Drawn (after animation) | Fully visible |
| **Active / travelled segment** (Plan) | `--color-amber-500` up to the currently-focused day, `rgba(255,255,255,0.4)` beyond. **Plus** a visible "Day 3 of 7" text label — colour is never the only indicator |
| Reduced motion | Renders fully drawn, no `stroke-dashoffset` animation |
| Print | Rendered as a solid 1 px `--color-ink-600` line (dotted white disappears on paper) |

### 8.4 Pin
- Asset traced to `route-pin.svg` on import (see `design-system.md` §10.5).
- On the Plan page, a pin marks the current day; it has `aria-hidden="true"` and sits beside a real text label.
- The pin is never a control. If a map marker needs to be clickable (future map view), that is a different component and requires a new spec entry.

---

## 9. Filter chip

Used on Destinations, Experiences, Trips, and as the Plan intake control.

### 9.1 Layout & tokens

| Property | Value |
|---|---|
| Height | 40 px (hit area extended to 44 px via `::after`) |
| Padding | `0 16px`; `0 12px 0 16px` when it carries a trailing count or ✕ |
| Radius | `--radius-pill` |
| Type | `--text-body-sm`, weight 500 (600 when selected) |
| Gap between chips | 8 px row, 8 px column |
| Icon | optional 16 px leading |
| Count | `--text-small`, `--color-ink-500`, 6 px gap, tabular |

### 9.2 States (light context)

| State | Background | Border | Label |
|---|---|---|---|
| Default | `#FFFFFF` | `1px --color-sand-200` | `--color-ink-600` (10.4:1) |
| Hover | `--color-sand-100` | `1px --color-sand-300` | `--color-ink-900` |
| Focus-visible | unchanged | unchanged | + `--focus-ring` |
| Active (pressing) | `--color-sand-200` | — | — |
| **Selected** | `--color-jungle-700` | `1px --color-jungle-700` | `#FFFFFF` (8.8:1) + a 16 px `check` icon leading |
| Selected + hover | `--color-jungle-600` | — | — |
| Disabled (0 results) | `--color-sand-100` | `1px --color-sand-200` | `--color-ink-400`, `cursor: not-allowed`, count shows `0` |
| Loading (counts pending) | default | — | count replaced by a 20 × 12 px shimmer |

Dark/photographic context: default `rgba(255,255,255,0.12)` + `blur(var(--blur-sm))`, border `rgba(255,255,255,0.35)`, label `#FFFFFF`; selected `#FFFFFF` bg with `--color-ink-900` label. Focus uses `--focus-ring-on-dark`. Only permitted inside a ≥0.55 scrim region.

### 9.3 Behaviour
- **Selection change is not a submit.** Multi-select chips apply immediately and update the URL; the results region announces "24 destinations" via `aria-live="polite"` (debounced 500 ms).
- A **Clear all** ghost chip appears at the end of the row once ≥1 chip is selected.
- Overflow at <1024: horizontal scroll with snap, plus a **Filters** button opening a bottom-sheet drawer with the full set, an "Apply (24 results)" primary pill and a "Clear all" ghost. The sheet traps focus and closes on `Esc`.

### 9.4 Semantics

| Use | Markup |
|---|---|
| Multi-select filter | `<button type="button" aria-pressed="true|false">` inside a `<div role="group" aria-labelledby="…">` |
| Single-select (duration in Plan) | `<fieldset>` + `<legend>` with `<input type="radio">` visually hidden and a `<label>` styled as the chip. **Arrow keys must work** — native radios give this for free, which is why this is not a button group |
| Removable applied-filter chip | `<button type="button" aria-label="Remove filter: Hill Country">` with a trailing 16 px `x` icon |

Never use `role="checkbox"` on a `<button>`; `aria-pressed` is the correct toggle semantic here.

---

## 10. Itinerary day block

The core of the Plan builder.

### 10.1 Anatomy
```
┌ [Day marker] ── Day 3 · Fri 14 Mar ──────────── [⋯ menu] ┐
│  ┆                                                        │
│  ●  [thumb] Sigiriya Rock climb      07:00 · 3 h   ⋮⋮ ✕  │
│  ┆                                                        │
│  ●  [thumb] Dambulla Cave Temple     13:00 · 2 h   ⋮⋮ ✕  │
│  ┆                                                        │
│  ●  Transfer to Kandy                 ~2 h 30 by car      │
│  ┆                                                        │
│     [ + Add to this day ]                                 │
└───────────────────────────────────────────────────────────┘
```

### 10.2 Layout & tokens

| Property | Value |
|---|---|
| Block surface | `--color-surface` (`#FFFFFF`) |
| Block radius | `--radius-xl` |
| Block border | `1px --color-sand-200` |
| Block shadow | `--shadow-sm` |
| Block padding | `--card-pad` |
| Gap between blocks | 24 px (<1024) / 32 px (≥1024) |
| Day header | `--text-h4` weight 600 for "Day 3"; date at `--text-body-sm` `--color-ink-500` |
| Route gutter | 32 px wide, dotted 2 px `--color-sand-300` vertical line at its centre |
| Day marker | 32 px circle, `--color-jungle-700` fill, `#FFFFFF` numeral at `--text-small` 600 |
| Item dot | 10 px, `--color-jungle-500` fill, 3 px `#FFFFFF` ring |
| Item row min height | 72 px (thumbnail 56 × 56, `--radius-md`) |
| Item title | `--text-h5` `--color-ink-900` |
| Item meta | `--text-small` `--color-ink-500`, tabular numerals for times |
| Item gap | 16 px |
| Controls | Drag handle (`grip-vertical`, 20 px, 44 × 44 target) and Remove (`x`, 20 px, 44 × 44). At ≥768 a **Swap** text button also shows |
| Transfer row | No thumbnail; `car`/`train` icon 20 px, `--color-ink-500` text, dashed `1px --color-sand-300` top+bottom border, 48 px tall |

### 10.3 States

| State | Treatment |
|---|---|
| **Default** | As above |
| **Hover (item row)** | `background: --color-sand-50`, controls fade from `opacity: 0` to `1` over `--dur-2`. **Controls are always present in the DOM and always focusable** — only their opacity changes, and they are `opacity: 1` whenever focused-within or on touch devices |
| **Focus-visible (item row)** | Dual ring around the row, `--radius-md` |
| **Dragging** | Row lifts: `--shadow-lg`, `scale(1.02)`, `rotate(-0.4deg)`, `opacity: 0.95`, `cursor: grabbing`. A 2 px `--color-jungle-600` drop indicator shows the target slot |
| **Keyboard reorder active** | Row gets a 2 px `--color-jungle-600` border and a `--color-jungle-50` fill; a live region announces "Sigiriya, day 3, position 1 of 3. Use arrow keys to move, space to drop, escape to cancel" |
| **Disabled (locked item, e.g. a booked transfer)** | `--color-sand-100` fill, `lock` icon 16 px, controls removed, tooltip "Booked — contact support to change" |
| **Loading (generating)** | Skeleton: day header bar, 3 item rows each with a 56 px square + 2 text bars. Route line draws downward over `--dur-route` |
| **Loading (single item swapping)** | Only that row shows a shimmer overlay at 40 % `--color-sand-100`; `aria-busy` on the row |
| **Empty day** | Dashed `1.5px --color-sand-300` border, `--radius-xl`, 120 px min height, centred `--text-body-sm` `--color-ink-500` "Nothing planned yet — a rest day, or add something." + an **Add something** ghost pill. This is a valid state, styled as intentional, not as an error |
| **Error (save failed)** | 3 px `--color-error-600` left border on the block, an inline `role="alert"` strip: "Changes to Day 3 didn't save · Retry" |
| **Over-packed warning** | If items exceed the day's realistic hours: `--color-warning-50` strip, "This day is tight — about 11 hours of activity." Informational only, never blocks |

### 10.4 Responsive

| Breakpoint | Behaviour |
|---|---|
| <768 | Single column. Route gutter narrows to 24 px. Swap/Remove collapse into a single `⋯` menu button (44 × 44) opening a bottom sheet. Drag handles remain (long-press to drag) **and** the `⋯` menu contains "Move up" / "Move down" |
| 768–1023 | Single column, controls inline as icon buttons with tooltips |
| ≥1024 | Two-column page layout: plan column `minmax(0, 1fr)`, summary rail `360px`, gap 40 px. Controls show text labels |
| ≥1440 | Summary rail `400px`, gap 48 px |

### 10.5 Semantics

```html
<ol aria-label="Your itinerary">
  <li>
    <section aria-labelledby="day-3-h">
      <h3 id="day-3-h">Day 3 <span>· Friday 14 March</span></h3>
      <ul aria-label="Day 3 activities">
        <li>
          <h4>Sigiriya Rock climb</h4>
          <p>07:00 · 3 hours</p>
          <button type="button" aria-label="Reorder Sigiriya Rock climb" aria-describedby="reorder-help">…</button>
          <button type="button" aria-label="Remove Sigiriya Rock climb from day 3">…</button>
        </li>
      </ul>
      <button type="button">Add to day 3</button>
    </section>
  </li>
</ol>
<p id="reorder-help" class="sr-only">Press space to lift, arrow keys to move, space to drop, escape to cancel.</p>
<div aria-live="polite" class="sr-only"></div>
```
- Days are an ordered list; order is semantic, not just visual.
- Every control's accessible name includes the item name **and** the day — "Remove" alone is ambiguous across 7 days.
- Drag-and-drop **must** have the documented keyboard equivalent. DnD without it is a build-blocking accessibility defect.

---

## 11. Booking form

### 11.1 Field anatomy
`<label>` → optional helper text → control → error message (when invalid).

| Property | Value |
|---|---|
| Label | `--text-body-sm` weight 600, `--color-ink-900`, 8 px above the control |
| Optional marker | The word `(optional)` at `--text-small` `--color-ink-500` appended to the label. **Mark optional fields, not required ones** — most fields are required, so the asterisk noise is inverted |
| Helper text | `--text-small` `--color-ink-500`, 6 px below the label, `id` referenced by `aria-describedby` |
| Control height | 48 px (text/select) — 56 px at <768 for thumb comfort |
| Control padding | `12px 16px` |
| Control radius | `--radius-sm` (10 px) |
| Control border | `1.5px solid --color-ink-400` (4.0:1 on white — clears SC 1.4.11; see D-07) |
| Control fill | `#FFFFFF` |
| Control type | `--text-body` (16 px — **never smaller on mobile**, or iOS zooms the viewport on focus) |
| Placeholder | `--color-text-placeholder`. Placeholders are **hints only**; they never replace a label |
| Textarea | min-height 120 px, `resize: vertical` |
| Field gap (vertical) | 20 px |
| Field-group gap | 32 px |
| Two-up rows | ≥768 only: `grid-template-columns: 1fr 1fr; gap: 20px` |

### 11.2 Control states

| State | Border | Fill | Other |
|---|---|---|---|
| Default | `1.5px --color-ink-400` | `#FFFFFF` | Boundary is 4.0:1 — SC 1.4.11 ✅ |
| Hover | `1.5px --color-ink-500` | `#FFFFFF` | — |
| Focus-visible | `1.5px --color-jungle-600` | `#FFFFFF` | `--focus-ring` |
| Filled | `1.5px --color-ink-400` | `#FFFFFF` | — |
| **Error** | `1.5px --color-error-600` | `--color-error-50` | `aria-invalid="true"`, message below |
| **Success** (async-validated, e.g. promo code) | `1.5px --color-success-600` | `#FFFFFF` | 20 px check icon inset-right + a visually-hidden "Valid" |
| Disabled | `1.5px --color-sand-200` | `--color-sand-100` | `--color-ink-400` text, `cursor: not-allowed` (disabled controls are exempt from 1.4.11) |
| Readonly (during payment submit) | `1.5px --color-ink-400` | `--color-sand-50` | Value still selectable and announced |
| Loading (async check) | default | — | 20 px spinner inset-right, `aria-busy` on the field wrapper |

### 11.3 Error message
- Position: below the control, 8 px gap.
- Style: 16 px `alert-circle` icon + `--text-small` `--color-error-600` (6.1:1 on sand-50).
- Wired with `aria-describedby`; when both helper text and an error exist, `aria-describedby` lists **both** ids, error first.
- Copy rules: say what to do, not what went wrong. *"Enter your email so we can send your confirmation"* — not *"Email is invalid"*. Never use the field name alone.
- Form-level summary on submit: `role="alert"`, `tabindex="-1"`, receives focus, lists each error as an in-page anchor link.

### 11.4 Specific controls

| Control | Spec |
|---|---|
| **Phone** | Country-code `<select>` (flag emoji + dial code, with the country **name** in the option text for AT) + `<input type="tel" autocomplete="tel-national">`. Both in one bordered group; focus ring wraps the group |
| **Date range** | Two `<input type="date">` at <768 (native pickers are better than anything we'd build); a custom two-month calendar popover at ≥768 with full keyboard support (arrows = day, PgUp/PgDn = month, Home/End = week bounds, `Esc` = close, focus returns to the trigger), `role="dialog"` `aria-modal="false"`, and a visually-hidden live region announcing the focused date |
| **Traveller counts** | Stepper: `−` button (44 × 44) / value (tabular, `role="spinbutton"`-equivalent via `<input type="number" inputmode="numeric">`) / `+` button (44 × 44). Buttons get `aria-label="Add an adult"` / `"Remove an adult"`; the value has a real `<label>`. `−` is `disabled` at the minimum with a visually-hidden explanation |
| **Radio cards** (room type, transport) | `<fieldset>` + `<legend>`; each option a `<label>` wrapping a visually-hidden `<input type="radio">`; card styling: `--radius-lg`, `1.5px --color-sand-200`, selected → `2px --color-jungle-600` + `--color-jungle-50` fill + a filled radio glyph. Arrow-key navigation comes free from native radios |
| **Checkbox cards** (add-ons) | As radio cards with `<input type="checkbox">`; selected shows a check glyph. Each card states its price delta in text |
| **Terms checkbox** | 24 × 24 visual box, 44 × 44 target, `--radius-xs`. Label is a real `<label>` containing the link. **Never pre-checked** |
| **Payment fields** | Provider-hosted. We style only the wrapper. We must pass our tokens to the provider's style API so the fields match; if the provider cannot match, the wrapper adopts the provider's look rather than faking a mismatched one |

### 11.5 Responsive
<768: single column, 56 px controls, sticky bottom action bar (see §12). 768–1023: single column, 640 px max (`--container-form`), two-up rows for short pairs. ≥1024: form column + sticky summary rail.

---

## 12. Booking summary panel

### 12.1 Layout & tokens

| Property | ≥1024 | <1024 |
|---|---|---|
| Position | `position: sticky; top: calc(80px + 24px)`, right column 360 px (400 px at ≥1440) | Fixed bottom sheet, collapsed |
| Surface | `--color-surface` | `--color-surface` |
| Radius | `--radius-xl` | `--radius-2xl` top corners only |
| Border | `1px --color-sand-200` | `1px --color-sand-200` top only |
| Shadow | `--shadow-md` | `0 -8px 24px -8px rgba(10,15,13,0.16)` |
| Padding | 24 px | `16px var(--gutter)` + `env(safe-area-inset-bottom)` |
| Max height | `calc(100svh - 128px)`, `overflow-y: auto` | collapsed 88 px; expanded `min(70svh, 560px)` |

### 12.2 Content
Trip/plan thumbnail (64 × 64, `--radius-md`) + title + dates → line items (`--text-body-sm`, label left / amount right, tabular) → divider → subtotal → taxes & fees → **Total** (`--text-h3`, tabular) → cancellation-policy one-liner → primary action pill (full width) → a `lock` icon + "Secure payment" at `--text-small` `--color-ink-500`.

### 12.3 States

| State | Treatment |
|---|---|
| Default | As above |
| **Collapsed (<1024)** | Shows total + "Details ⌃" expander + the primary pill. `aria-expanded` on the expander |
| **Expanded (<1024)** | Slides up over `--dur-5` `--ease-out`; backdrop `rgba(6,10,9,0.4)`; focus trapped; `Esc` collapses |
| **Updating** | Changed line items and the total shimmer for the duration of the request; the total then count-animates over `--dur-3` and `aria-live="polite"` announces "Total updated: 1,680 US dollars" |
| **Empty** | Panel is not rendered; the page shows the F4 empty state instead |
| **Error (price fetch failed)** | Total area shows "Couldn't update the price" + a **Retry** ghost link; the primary action is `disabled` with `aria-describedby` pointing at the explanation |
| **Loading (initial)** | Thumbnail block + 4 line bars + a total bar, shimmer |

### 12.4 Semantics
`<aside aria-labelledby="summary-h">` with an `<h2 id="summary-h">Booking summary</h2>`. Line items are a `<dl>` (`<dt>` label, `<dd>` amount). The total is marked up so it is read as a sentence, with a visually-hidden "Total:" prefix and the currency spelled out.

---

## 13. Footer

### 13.1 Layout & tokens

| Property | Value |
|---|---|
| Background | `--color-ink-800` |
| Text | `--color-on-image-secondary` for body, `#FFFFFF` for headings and links |
| Top padding | `--section-y` |
| Bottom padding | `--space-12` + `env(safe-area-inset-bottom)` |
| Columns | 1 (<768, stacked, each group a collapsible `<details>`) · 2 (768–1023) · 4 + a brand column (≥1024) |
| Column gap | 32 px / 40 px / 64 px |
| Group heading | `--text-overline`, `#FFFFFF` |
| Link | `--text-body-sm`, `--color-on-image-secondary` (12.9:1 on ink-800 ✅), 12 px row gap, 44 px target |
| Divider | `1px rgba(255,255,255,0.14)` above the legal bar, 32 px margin |
| Legal bar | `--text-small`, `--color-on-image-muted`, flex row (wraps) |

### 13.2 Content
- **Brand column:** wordmark (`--text-wordmark`, `#FFFFFF`), one-line positioning statement, newsletter field + pill, social icon links (44 × 44 each, `aria-label` per network).
- **Explore:** Destinations · Experiences · Trips · Plan your trip
- **Company:** About Us · Contact · Careers · Press
- **Support:** Help centre · Booking terms · Cancellation policy · Travel insurance
- **Legal bar:** © Noble Path · Privacy · Terms · Cookie preferences · photo credits.

### 13.3 States
Link hover → `#FFFFFF` + 1 px underline at 4 px offset. Focus-visible → `--focus-ring-on-dark`. Newsletter states per `user-flows.md` §F9. `<details>` groups on mobile are **open by default** on the Explore group and closed on the rest.

### 13.4 Semantics
`<footer>` landmark; the link groups sit inside `<nav aria-label="Footer">` with each group having a heading that the `<ul>` is `aria-labelledby`-associated with. Social links carry `aria-label` ("Noble Path on Instagram") and `rel="me noopener"`.

---

## 14. Supporting components (abbreviated specs)

These are fully constrained by the tokens above; only their distinguishing rules are listed.

| Component | Key rules |
|---|---|
| **Toast** | `--z-toast`, bottom-centre (<768) / bottom-right (≥768), `--radius-pill` for single-line / `--radius-lg` with an action, `--color-ink-900` surface + `#FFFFFF` text, `--shadow-xl`, max 1 visible, 6 s, pause on hover/focus, dismiss button 44 × 44, `role="status"` (success) or `role="alert"` (failure). Slides up 16 px + fades over `--dur-4` |
| **Modal / dialog** | `--z-modal`, backdrop `rgba(6,10,9,0.55)` + `blur(var(--blur-sm))` at `--z-overlay`, panel `--radius-2xl`, max-width 520 px, padding 32 px (24 at <768), full-width bottom sheet at <768. `<dialog>` element or `role="dialog" aria-modal="true"` + `aria-labelledby`. Focus trapped, `Esc` closes, focus returns to the trigger, `inert` on the rest of the page. **Never** default-focus a destructive action |
| **Popover** (add-to-trip, day picker) | `--z-dropdown`, `--radius-lg`, `--shadow-lg`, 8 px offset from the anchor, arrow optional. Non-modal: focus moves in but the page is not `inert`; closes on `Esc`, outside click, and scroll-out. Anchored with the CSS anchor API or a positioning lib with collision flipping |
| **Tabs** (trip detail: Overview / Itinerary / Included / FAQ) | `role="tablist"`, arrow-key navigation, `aria-selected`, `aria-controls`; active tab has a 2 px `--color-jungle-600` underline **and** weight 600. Scrollable row at <768. Panels `tabindex="0"` so keyboard users can scroll them |
| **Accordion** (FAQ, trip days) | `<button aria-expanded>` inside an `<h3>`, panel below. 56 px min row. Chevron rotates 180° over `--dur-3`. Height animated with `grid-template-rows: 0fr → 1fr` (no JS height measurement) |
| **Breadcrumb** | `<nav aria-label="Breadcrumb">` + `<ol>`; separators are CSS `::after`; last item `aria-current="page"` and not a link. `--text-small`, `--color-ink-500`, hidden at <768 where the back affordance is the browser/OS |
| **Pagination / load more** | Prefer **Load more** (a real `<button>`) over infinite scroll — infinite scroll strands the footer and breaks back-navigation. After load, focus moves to the first new card and a live region announces "12 more destinations loaded, 36 of 48 shown" |
| **Rating** | Numeric value in text ("4.8 out of 5, 214 reviews") is the accessible content; stars are `aria-hidden` 16 px `--color-amber-600` glyphs on light / `--color-amber-500` on dark |
| **Badge / tag** | 24 px, `--radius-xs`, `--text-small` 600, paired surface+text tokens only from §2.4/§2.1. Never colour-only meaning — always a word |
| **Skeleton** | `--color-sand-100` base, `--color-sand-200` sweep, 1.4 s linear infinite, `--radius-xs` for text bars. `aria-hidden="true"`; the region carries `aria-busy="true"`. **Static (no sweep) under reduced motion** |
| **Empty state** | 32 px Lucide icon in `--color-sand-400`, `--text-h3` headline, `--text-body` `--color-ink-600` body at `--measure-lead`, one primary + one ghost action. Centred, 64 px vertical padding. Never an illustration we don't have |
| **Tooltip** | `--z-tooltip`, `--color-ink-900` surface, `#FFFFFF` `--text-small`, `--radius-sm`, 8 px padding, 6 px offset, 400 ms open delay / 0 ms close. Shows on hover **and** focus, dismissible with `Esc`, hoverable (WCAG 2.2 §1.4.13). Never the only source of essential information |

---

## 15. Component inventory & build order

Recommended implementation order for the Full-Stack Engineer (dependencies first):

1. Tokens (`@theme` block) + base layer + fonts
2. Button, Chip, Badge, Skeleton, Empty state, Focus utilities
3. Top nav (both variants) + Footer + Skip link
4. Hero (incl. scrim stack, rail, trust bar, route line)
5. Destination / Experience / Trip cards + grids
6. Filter bar + drawer
7. Form controls + validation + Booking summary panel
8. Itinerary day block (incl. keyboard reorder)
9. Toast, Modal, Popover, Tabs, Accordion
10. Page assembly per `page-specs.md`

---

## 16. Booking flow: cross-page selection patterns

Added 2026-09-23 (UI/UX review of D-21, `../decisions/architecture-decisions.md`). These cover the traveller picks made on `/accommodation` and `/activities` that now carry into `/bookings`. All four reuse existing primitives (`Button`/`LinkButton`, `components/booking/ui.tsx`'s `Card`/`Entry`, the Block/Row pair in `booking-summary.tsx`) — nothing here is a new visual component, only a new arrangement of approved ones, which is why this is documented rather than spec'd in full.

### 16.1 Add/remove trip toggle
The pill-button toggle first specified for pre-planned packages (`components/booking/plan-section.tsx`'s "Add to my trip" on a `TripOption`) is now the general pattern for adding any single item to a trip from a card, and is reused verbatim on `ActivityCard`. One control, two states, using the standard `Button`:
- Default — `size="sm"`, `variant="outline"`, leading `Plus` (16 px), label "Add to my trip".
- Selected — `variant="solid"`, leading `Check` (16 px), label "Added to my trip", `aria-pressed="true"`.

`aria-pressed` is the toggle semantic (never `role="checkbox"` on a `<button>` — see §9.4). Any future "add to trip" affordance (destination cards, experience cards) should reuse this exact control — same icon pair, same copy, same states — rather than introduce a variant.

### 16.2 "Your [X]" saved-picks list
Established by `/accommodation`'s "Your stays" section; `/activities`'s "Your activities" section mirrors it exactly. Anatomy: an `<h2>` with a leading 24 px Lucide icon in `--color-jungle-600`, a `<ul>` of `rounded-xl border border-border bg-surface p-4` rows (a meta line + the item name), each with a trailing 44×44 icon-only remove button (`X`, 18 px, `aria-hidden`, with a visually-hidden accessible name naming the removed item), a closing line of copy ("These will carry into your booking request.") and a `Continue to booking` `LinkButton` (`variant="outline"`, `size="sm"`) to `/bookings`. A visually-hidden `aria-live="polite"` region near the top of the page (present before content is injected, per `accessibility.md` §8.1) announces additions and removals. Any future page that lets a traveller build a pick list before booking should follow this same anatomy rather than invent one.

### 16.3 "Picked elsewhere" entry legend
When a `plan-section.tsx` `Entry` (a stay or activity row) was seeded from a specific `/accommodation` or `/activities` pick rather than entered by hand, its `<legend>` appends the picked item's name and its source in parentheses, e.g. `Stay 1 — Cinnamon Wild Yala (from Accommodation)`. This is additive text inside the existing legend — no new visual element, no change to the `Entry` primitive itself.

### 16.4 Saved-itinerary summary
Two read-only views of the same `plannedItinerary` data, both built from existing primitives:
- **In the form** (`plan-section.tsx`) — a `rounded-xl border-2 border-jungle-700 bg-jungle-50` block (the same "chosen" treatment already used for a selected package, §6.3-equivalent selected-card styling), with a `Route` icon, the day count and route, a "View full itinerary" link to `/plan` (new tab) and a 44×44 remove control. Sits inside the section's existing `Card` — it is not its own card.
- **In the review step** (`booking-summary.tsx`) — an ordinary `Block`/`Row` pair titled "Your saved itinerary". No new markup.

Shown only when the traveller has a saved `/plan` itinerary; omitted entirely otherwise (an empty state is not rendered, consistent with the Trip/package card rule in §6.3).

---

**Related documents:** `design-system.md` · `user-flows.md` · `page-specs.md` · `accessibility.md`
