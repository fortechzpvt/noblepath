# Noble Path — Design System

**Status:** Approved (v1.0)
**Owner:** UI/UX Designer, Fortechz
**Date:** 2026-09-19
**Applies to:** Noble Path web application (Sri Lanka trip planning)
**Source of truth for:** colour, typography, spacing, radii, elevation, glass, motion, z-index, iconography, imagery treatment.

Implementation target: **Tailwind CSS v4** + native CSS custom properties. No proprietary design tooling is required to build any part of this system.

The approved reference is the hero mockup at
`/Users/kethnulasiriwardana/Documents/Screenshot 2026-09-19 at 19.31.59.png`.
Where this document deviates from that mockup, the deviation is listed in §13 with rationale and is also recorded in `docs/decisions/architecture-decisions.md`.

---

## 1. Design principles

1. **Photography leads; type serves.** The image is the content. Typography sits on it quietly, never fights it. Never crop a photo to fit a box if the subject is lost — re-art-direct instead.
2. **Cinematic, not busy.** One dominant idea per viewport. Motion is slow and continuous (600–900 ms), never bouncy.
3. **Editorial contrast.** High-contrast display serif against a neutral geometric sans. That tension *is* the brand. Nothing else needs to be decorative.
4. **Legible before beautiful.** Every white-on-photo text run is backed by a measured scrim (§10). If a photo cannot carry the scrim, the photo is wrong, not the type.
5. **Light inside, dark outside.** Hero and section headers are dark/photographic. Working surfaces — cards, forms, the itinerary builder, booking — are warm-light and calm. The product must remain readable for 20 minutes of planning, not just 20 seconds of browsing.
6. **Nothing is invented.** The wordmark is the text `NOBLE PATH` set in the sans. There is no logomark, no icon lockup, no secondary brand asset. Do not create one.

---

## 2. Colour

### 2.1 Palette — raw ramps

All values are sRGB hex. "Contrast" columns are WCAG 2.x contrast ratios, computed, not estimated.

#### Ink (near-black, cool jungle cast) — text, dark surfaces, scrims

| Token | Hex | Use | vs `--color-sand-50` | vs `#FFFFFF` |
|---|---|---|---|---|
| `--color-ink-950` | `#060A09` | Scrim base, pure overlay black | 18.8:1 | 19.9:1 |
| `--color-ink-900` | `#0A0F0D` | Primary text on light; darkest UI surface | 18.3:1 | 19.4:1 |
| `--color-ink-800` | `#16211E` | Dark section background, footer | 15.6:1 | 16.5:1 |
| `--color-ink-700` | `#24322E` | Dark card surface, dark input field | 12.6:1 | 13.4:1 |
| `--color-ink-600` | `#33433E` | Secondary text on light | 9.9:1 | 10.4:1 |
| `--color-ink-500` | `#4E605A` | Tertiary/meta text on light | 6.3:1 | 6.7:1 |
| `--color-ink-400` | `#72827C` | Placeholder text, disabled label, **form control boundary** | 3.8:1 | 4.0:1 |
| `--color-ink-300` | `#A3AFAA` | Hairline on dark, decorative rule | 2.1:1 | 2.3:1 |

> `--color-ink-400` is **placeholder / disabled / boundary only** (4.0:1 on white — clears the 3:1 non-text threshold, misses the 4.5:1 text threshold). Never use it for text a user must read. `--color-ink-500` (6.7:1) is the floor for meta text.

#### Sand (warm neutral) — light surfaces

| Token | Hex | Use |
|---|---|---|
| `--color-sand-50` | `#FBF8F3` | Page background (light pages) |
| `--color-sand-100` | `#F3EDE3` | Subtle section band, input fill, skeleton base |
| `--color-sand-200` | `#E6DBC9` | Border on sand, divider, skeleton shimmer |
| `--color-sand-300` | `#C9B99B` | Decorative rule, disabled surface on sand |
| `--color-sand-400` | `#A08D6D` | Icon on sand — decorative only (3.0:1 on sand-50) |

#### Jungle (deep teal / green) — primary brand action colour

| Token | Hex | Use | White text on it |
|---|---|---|---|
| `--color-jungle-900` | `#0E3B34` | Dark brand panel, map surface | 12.4:1 ✅ |
| `--color-jungle-800` | `#11473E` | Primary button **active** | 10.5:1 ✅ |
| `--color-jungle-700` | `#15544A` | **Primary button default** | 8.8:1 ✅ |
| `--color-jungle-600` | `#1A6659` | Primary button **hover**; focus ring | 6.8:1 ✅ |
| `--color-jungle-500` | `#1E7A6A` | Link on light (5.2:1 ✅), selected chip fill | 5.2:1 ✅ |
| `--color-jungle-400` | `#3FA08D` | Link/accent **on dark** (6.1:1 on ink-900 ✅) | — |
| `--color-jungle-200` | `#BFE0D8` | Selected chip tint, success surface |
| `--color-jungle-50` | `#EAF5F2` | Soft brand wash, info surface |

#### Amber (sunrise) — accent, highlight, wayfinding

| Token | Hex | Use | vs white | vs ink-900 |
|---|---|---|---|---|
| `--color-amber-700` | `#8A5416` | **Amber text on light surfaces** | 6.3:1 ✅ | — |
| `--color-amber-600` | `#C9812A` | Amber icon/border/rating glyph on light — **graphics only** | 3.2:1 ⚠️ | — |
| `--color-amber-500` | `#E9A23B` | **Accent on dark/photo** | 2.2:1 ❌ | 9.0:1 ✅ |
| `--color-amber-400` | `#F4BF63` | Hover state of amber-on-dark; focus ring on dark | 1.7:1 ❌ | 11.5:1 ✅ |
| `--color-amber-100` | `#FCEFD8` | Warning/highlight surface on light |

> **Hard rule:** `--color-amber-500` and `--color-amber-400` are **never** used as text on white or sand. On light surfaces, amber text is `--color-amber-700`. Amber-500 is for dark/photographic contexts and for non-text graphics (underlines ≥ 2 px, rating stars, the active route-line segment) where 3:1 applies.

#### Clay (Sigiriya rock) — editorial tertiary, used sparingly

| Token | Hex | Use |
|---|---|---|
| `--color-clay-600` | `#8E4C2C` | Clay text on light (6.5:1 ✅) |
| `--color-clay-500` | `#B4643C` | Graphic accent only on light (4.35:1 — **large text ≥24 px or graphics only**) |
| `--color-clay-100` | `#F6E5DB` | Tag surface |

Clay appears on at most one element per page (typically the "Cultural Triangle" region tag). It is not an interactive colour.

### 2.2 Semantic tokens

Components must reference **semantic** tokens, not raw ramp tokens. Raw ramps exist so the semantic layer can be retuned in one place.

| Semantic token | Light context value | Dark/photo context value |
|---|---|---|
| `--color-bg` | `--color-sand-50` | `--color-ink-900` |
| `--color-bg-subtle` | `--color-sand-100` | `--color-ink-800` |
| `--color-surface` | `#FFFFFF` | `--color-ink-700` |
| `--color-surface-raised` | `#FFFFFF` | `--color-ink-700` |
| `--color-border` | `--color-sand-200` | `rgba(255,255,255,0.14)` |
| `--color-border-strong` | `#D3C6AF` | `rgba(255,255,255,0.28)` |
| `--color-text` | `--color-ink-900` | `#FFFFFF` |
| `--color-text-secondary` | `--color-ink-600` | `rgba(255,255,255,0.82)` |
| `--color-text-meta` | `--color-ink-500` | `rgba(255,255,255,0.72)` |
| `--color-text-placeholder` | `--color-ink-400` | `rgba(255,255,255,0.60)` |
| `--color-text-inverse` | `#FFFFFF` | `--color-ink-900` |
| `--color-link` | `--color-jungle-500` | `--color-amber-500` |
| `--color-link-hover` | `--color-jungle-700` | `--color-amber-400` |
| `--color-accent` | `--color-amber-700` | `--color-amber-500` |

> `rgba(255,255,255,0.72)` over `--color-ink-900` = **10.0:1** — safe. The same value over **glass at 0.55 opacity sitting on a blown-out photo** is **3.3:1** — **not safe for body text**. Inside glass surfaces, secondary text must be `rgba(255,255,255,0.86)` (4.0:1) minimum, and essential body text must be full `#FFFFFF` (4.8:1). See §10.3.

### 2.3 Text-on-image tokens

| Token | Value | Use |
|---|---|---|
| `--color-on-image` | `#FFFFFF` | Display + body text over photography |
| `--color-on-image-secondary` | `rgba(255,255,255,0.88)` | Hero kicker, card meta over photo |
| `--color-on-image-muted` | `rgba(255,255,255,0.74)` | Decorative only (never body copy) |
| `--color-on-image-rule` | `rgba(255,255,255,0.28)` | Trust-bar dividers, hairlines over photo |

### 2.4 Feedback colours

| Token | Hex | On-colour text | Surface token | Border token |
|---|---|---|---|---|
| Success | `--color-success-600: #1E7A4A` (white text 5.3:1 ✅) | `#FFFFFF` | `--color-success-50: #E8F5ED` | `--color-success-200: #A8D8BC` |
| Warning | `--color-warning-700: #8A5A0E` (white 5.9:1 ✅) | `#FFFFFF` | `--color-warning-50: #FCF2DF` | `--color-warning-200: #EFD29A` |
| Error | `--color-error-600: #B3261E` (white 6.5:1 ✅) | `#FFFFFF` | `--color-error-50: #FDECEA` | `--color-error-200: #F1B5B0` |
| Info | `--color-jungle-700` | `#FFFFFF` | `--color-jungle-50` | `--color-jungle-200` |

Error text on `--color-sand-50` uses `--color-error-600` (6.1:1 ✅).

### 2.5 Focus tokens

| Token | Value | Use |
|---|---|---|
| `--color-focus` | `#1A6659` | Focus ring on light surfaces |
| `--color-focus-on-dark` | `#F4BF63` | Focus ring on dark/photographic surfaces |
| `--color-focus-contrast` | `#FFFFFF` | Outer halo ring (dual-ring technique, §11) |
| `--focus-ring-width` | `3px` | |
| `--focus-ring-offset` | `2px` | |

---

## 3. Typography

### 3.1 Families

| Role | Family | Google Fonts | Weights shipped | Token |
|---|---|---|---|---|
| Display serif | **Playfair Display** | yes (variable, `wght` 400–900 + italic) | 400, 500, 600, 700 | `--font-display` |
| UI / body sans | **Poppins** | yes (static, 9 weights + italic) | 300, 400, 500, 600, 700 | `--font-sans` |
| Numeric (tabular) | Poppins with `font-variant-numeric: tabular-nums` | — | — | `--font-num` |

```css
--font-display: "Playfair Display", "Playfair Display Fallback", "Iowan Old Style", "Times New Roman", Times, serif;
--font-sans: "Poppins", "Poppins Fallback", "Century Gothic", "Avenir Next", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
```

**Why Playfair Display.** The mockup's headline (`Explore / Sri Lanka with us`) shows extreme stroke modulation — hairline thins against very heavy stems — with vertical stress, flat unbracketed-to-lightly-bracketed serifs, and a teardrop terminal on the `r` and `a`. That is a transitional/Didone hybrid. Playfair Display is the only high-quality Google Fonts face in that genre with a true variable weight axis and a real italic, and it holds up at 76 px, which is where our display sizes land. **Alternatives considered:** *DM Serif Display* (correct contrast, but a single 400 weight — the mockup headline is clearly 700, so we would be faking weight); *Libre Baskerville* (contrast too low, reads bookish rather than cinematic); *Fraunces* (its `wonk`/`soft` axes add personality the mockup does not have); *Cormorant* (far too fragile below 40 px and its cap height is too small for a full-bleed hero).

**Why Poppins.** The mockup's nav (`Destinations`, `Experiences`), the `Popular Destinations` rail heading and the trust-bar labels are monolinear with near-perfect circular bowls on `o`/`e`/`p`, a single-storey geometric `a`, and a tall x-height with long ascenders — the `O` in `NOBLE` is a true circle. That is Poppins. **Alternatives considered:** *Montserrat* (double-storey `a`, wider, less strictly geometric — the wordmark would not match); *Outfit* (very close, but tighter apertures and a less circular `O`); *DM Sans* (softer, smaller x-height, reads more "SaaS" than "premium travel"); *Jost* (Futura-derived, but its `a` and low x-height hurt UI legibility at 14 px).

**Pairing rationale.** Playfair's vertical-stress, high-contrast Didone structure and Poppins' monolinear circular geometry share no stroke DNA at all, which is exactly what makes the pairing read as editorial rather than accidental. Both have vertical axes and neutral, non-quirky letterforms, so the contrast is in weight and modulation, not in mood.

**Loading requirements (for the implementing engineer):**
- Self-host via `@fontsource-variable/playfair-display` and `@fontsource/poppins` (or `next/font/google`). Do **not** load from `fonts.googleapis.com` at runtime — it costs a third-party round trip on the hero's critical path.
- Subset to `latin` + `latin-ext`. Sinhala/Tamil place names are rendered in Latin transliteration; if native-script names are added later, that is a new spec item, not a silent font swap.
- `font-display: swap` on both.
- Preload **only** two files: Playfair Display variable `wght` (the hero headline) and Poppins 400. Everything else loads normally.
- Define metric-matched fallbacks to prevent CLS:

```css
@font-face { font-family: "Playfair Display Fallback"; src: local("Times New Roman"); size-adjust: 111%; ascent-override: 92%; descent-override: 22%; line-gap-override: 0%; }
@font-face { font-family: "Poppins Fallback"; src: local("Arial"); size-adjust: 112%; ascent-override: 94%; descent-override: 31%; line-gap-override: 0%; }
```

### 3.2 Type scale

Fluid between **390 px** and **1440 px** viewport; clamped flat outside that range. Root font-size is the browser default (16 px = 1 rem) — never set `html { font-size: 62.5% }`.

| Token | Role | Family | Min (390) | Max (1440) | `clamp()` | Weight | Line-height | Tracking |
|---|---|---|---|---|---|---|---|---|
| `--text-display` | Hero headline | display | 40 px | 76 px | `clamp(2.5rem, 1.664rem + 3.429vw, 4.75rem)` | 700 | 1.06 | `-0.02em` |
| `--text-display-sm` | Secondary full-bleed headline | display | 32 px | 56 px | `clamp(2rem, 1.443rem + 2.286vw, 3.5rem)` | 700 | 1.10 | `-0.018em` |
| `--text-h1` | Page title | display | 32 px | 56 px | `clamp(2rem, 1.443rem + 2.286vw, 3.5rem)` | 600 | 1.12 | `-0.015em` |
| `--text-h2` | Section heading | display | 26 px | 40 px | `clamp(1.625rem, 1.3rem + 1.333vw, 2.5rem)` | 600 | 1.18 | `-0.012em` |
| `--text-h3` | Rail / card-group heading | sans | 20 px | 28 px | `clamp(1.25rem, 1.064rem + 0.762vw, 1.75rem)` | 600 | 1.25 | `-0.01em` |
| `--text-h4` | Card title, form section | sans | 17 px | 20 px | `clamp(1.0625rem, 0.993rem + 0.286vw, 1.25rem)` | 600 | 1.35 | `-0.005em` |
| `--text-h5` | Sub-label, itinerary item title | sans | 16 px | 16 px | `1rem` | 600 | 1.4 | `0` |
| `--text-lead` | Lead paragraph, hero subcopy | sans | 17 px | 19 px | `clamp(1.0625rem, 1.016rem + 0.19vw, 1.1875rem)` | 400 | 1.55 | `0.002em` |
| `--text-body` | Body copy | sans | 16 px | 16 px | `1rem` | 400 | 1.625 | `0.003em` |
| `--text-body-sm` | Dense body, card description | sans | 14 px | 14 px | `0.875rem` | 400 | 1.55 | `0.005em` |
| `--text-small` | Meta, captions, helper text | sans | 13 px | 13 px | `0.8125rem` | 400 | 1.5 | `0.01em` |
| `--text-overline` | Section eyebrow (uppercase) | sans | 12 px | 13 px | `clamp(0.75rem, 0.727rem + 0.095vw, 0.8125rem)` | 600 | 1.3 | `0.14em` |
| `--text-kicker` | Hero eyebrow (sentence case) | sans | 16 px | 18 px | `clamp(1rem, 0.954rem + 0.19vw, 1.125rem)` | 400 | 1.4 | `0.012em` |
| `--text-button` | Button label | sans | 15 px | 16 px | `clamp(0.9375rem, 0.914rem + 0.095vw, 1rem)` | 600 | 1 | `0.01em` |
| `--text-button-serif` | Hero CTA label only | display | 17 px | 18 px | `clamp(1.0625rem, 1.039rem + 0.095vw, 1.125rem)` | 600 | 1 | `0.005em` |
| `--text-nav` | Top nav link | sans | 15 px | 17 px | `clamp(0.9375rem, 0.891rem + 0.19vw, 1.0625rem)` | 400 | 1 | `0.005em` |
| `--text-wordmark` | `NOBLE PATH` | sans | 18 px | 21 px | `clamp(1.125rem, 1.055rem + 0.286vw, 1.3125rem)` | 700 | 1 | `0em` |

> **How these were derived** (so a new token can be added correctly): for a min `m` rem at 390 px (24.375 rem) and a max `M` rem at 1440 px (90 rem), `slope = (M − m) / 65.625`, `vw-coefficient = slope × 100`, `intercept = m − slope × 24.375`. Every row above satisfies this; if you add a token, show your working in the PR.

**Wordmark tracking.** `0em` — deliberately tight *for uppercase* (compare `--text-overline` at `0.14em`, the normal treatment for caps in this system). It reproduces the mockup's compact `NOBLE PATH` lockup. Always `text-transform: uppercase`, always `--color-on-image` over the hero, `--color-ink-900` on light surfaces.

**Minimum sizes.** Poppins' high x-height reads well small, but **13 px is the floor** for any text a user must read. Nothing ships below `--text-small`. Legal text is `--text-small`, not smaller.

**Serif size floor.** Playfair Display is used at **≥ 24 px only**, with two exceptions, both of which sit on an opaque light surface where the hairlines survive: `--text-button-serif` (the hero CTA label, dark serif on a solid white pill) and pull-quotes on light sections. Playfair is **never** used below 24 px over photography — see §13, D-02.

### 3.3 Paragraph rules

- `max-width` for body copy: `68ch` (`--measure-body`); lead paragraphs `52ch` (`--measure-lead`); hero subcopy `38ch` (`--measure-hero`).
- `text-wrap: balance` on all headings `--text-h2` and larger. `text-wrap: pretty` on paragraphs.
- No hyphenation (`hyphens: none`) — Sri Lankan place names hyphenate badly.
- Headings use `font-optical-sizing: auto`.

---

## 4. Spacing

8 pt base, expressed on a 4 px step so it maps 1:1 onto Tailwind's default numeric spacing utilities (`p-6` = 24 px). All primary layout rhythm uses even (8 px multiple) steps; odd steps exist for optical correction only.

| Token | px | rem | Typical use |
|---|---|---|---|
| `--space-0` | 0 | 0 | reset |
| `--space-px` | 1 | — | hairline |
| `--space-1` | 4 | 0.25 | icon↔label nudge |
| `--space-2` | 8 | 0.5 | chip padding-y, tight stack |
| `--space-3` | 12 | 0.75 | input padding-y, list gap |
| `--space-4` | 16 | 1 | card inner gap, mobile gutter base |
| `--space-5` | 20 | 1.25 | mobile page gutter |
| `--space-6` | 24 | 1.5 | **card padding**, grid gutter (lg) |
| `--space-8` | 32 | 2 | card padding (lg), tablet gutter |
| `--space-10` | 40 | 2.5 | block gap, desktop gutter (lg) |
| `--space-12` | 48 | 3 | sub-section gap, desktop gutter (xl) |
| `--space-16` | 64 | 4 | **section padding-y (mobile)** |
| `--space-20` | 80 | 5 | section padding-y (tablet) |
| `--space-24` | 96 | 6 | **section padding-y (desktop)** |
| `--space-32` | 128 | 8 | major section break (desktop) |
| `--space-40` | 160 | 10 | hero-to-content break (wide) |

### 4.1 Semantic spacing

| Token | 390 | 768 | 1024 | 1440 | 1920 |
|---|---|---|---|---|---|
| `--gutter` (page side padding) | 20 px | 32 px | 40 px | 48 px | 48 px |
| `--grid-gap` | 16 px | 20 px | 24 px | 24 px | 24 px |
| `--section-y` | 64 px | 80 px | 96 px | 96 px | 112 px |
| `--section-y-tight` | 40 px | 48 px | 56 px | 64 px | 64 px |
| `--card-pad` | 16 px | 20 px | 24 px | 24 px | 24 px |
| `--stack-heading-to-body` | 12 px | 12 px | 16 px | 16 px | 16 px |
| `--stack-body-to-cta` | 24 px | 24 px | 32 px | 32 px | 32 px |

### 4.2 Containers

| Token | Value | Use |
|---|---|---|
| `--container-prose` | `760px` | About page body, policy pages |
| `--container-form` | `640px` | Booking form column |
| `--container-max` | `1280px` | Default content container |
| `--container-wide` | `1440px` | Card grids, gallery sections |
| `--container-bleed` | `100%` | Hero, full-bleed imagery |

Above 1920 px the container is centred with `margin-inline: auto`; background photography continues to full bleed. Content never exceeds `--container-wide`.

---

## 5. Radii

| Token | Value | Use |
|---|---|---|
| `--radius-xs` | `6px` | Tag, badge, small chip |
| `--radius-sm` | `10px` | Input, select, textarea |
| `--radius-md` | `14px` | Small media thumbnail, toast |
| `--radius-lg` | `20px` | Inner media inside a card, hero rail thumbnail |
| `--radius-xl` | `24px` | **Card radius** — matches the mockup's destination thumbnails and trust bar |
| `--radius-2xl` | `32px` | Large feature panel, modal |
| `--radius-3xl` | `40px` | Full-bleed panel corner on wide viewports |
| `--radius-pill` | `9999px` | **All buttons**, filter chips, nav pill, avatar |

**Nesting rule:** an inner radius equals the outer radius minus the padding between them, floored at `--radius-md`. A `--radius-xl` (24) card with `--space-6` (24) padding has a flush inner media radius of `--radius-md` (14) — not 24 — so the corners stay optically concentric.

**Pill rule:** every button in this product is a pill (`--radius-pill`). There are no square buttons. This is the mockup's single strongest shape signal and it is non-negotiable.

---

## 6. Elevation

Shadows are tinted with ink, never neutral black, so they sit correctly on warm sand.

| Token | Value | Use |
|---|---|---|
| `--shadow-xs` | `0 1px 2px rgba(10,15,13,0.06)` | Input, chip |
| `--shadow-sm` | `0 2px 6px rgba(10,15,13,0.08)` | Card at rest on sand |
| `--shadow-md` | `0 8px 24px -8px rgba(10,15,13,0.16), 0 2px 6px -2px rgba(10,15,13,0.08)` | Card hover, sticky summary panel |
| `--shadow-lg` | `0 20px 48px -16px rgba(10,15,13,0.24), 0 4px 12px -4px rgba(10,15,13,0.10)` | Dropdown, popover, solid nav on scroll |
| `--shadow-xl` | `0 40px 80px -24px rgba(10,15,13,0.32)` | Modal, drawer |
| `--shadow-glass` | `0 16px 40px -12px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.18)` | Any glass surface over photography |
| `--shadow-media` | `0 12px 32px -12px rgba(6,10,9,0.45)` | Hero rail thumbnails sitting on photography |

**Elevation on dark surfaces.** Shadows are nearly invisible on `--color-ink-800`. Depth on dark is expressed with a **1 px top highlight** (`inset 0 1px 0 rgba(255,255,255,0.10)`) plus a lighter surface value, not with a drop shadow.

---

## 7. Glass (frosted surfaces)

| Token | Value |
|---|---|
| `--glass-bg` | `rgba(12,18,16,0.38)` |
| `--glass-bg-text` | `rgba(10,15,13,0.55)` |
| `--glass-bg-strong` | `rgba(10,15,13,0.68)` |
| `--glass-bg-light` | `rgba(255,255,255,0.72)` |
| `--glass-border` | `rgba(255,255,255,0.22)` |
| `--glass-border-light` | `rgba(10,15,13,0.08)` |
| `--glass-divider` | `rgba(255,255,255,0.28)` |
| `--blur-sm` | `10px` |
| `--blur-md` | `18px` |
| `--blur-lg` | `28px` |
| `--glass-saturate` | `140%` |
| `--glass-filter` | `blur(var(--blur-md)) saturate(var(--glass-saturate))` |

**Rules**
1. Any glass surface that **carries text** uses `--glass-bg-text` (0.55) as its floor. `--glass-bg` (0.38) is for decorative/non-text glass only. Derivation in §10.2.
2. Always pair `backdrop-filter` with a matching `-webkit-backdrop-filter`.
3. Always provide a no-backdrop-filter fallback — Firefox with the feature disabled, and any print/screenshot path, must not drop to unreadable:
   ```css
   .glass { background: var(--glass-bg-strong); }
   @supports ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
     .glass { background: var(--glass-bg-text); backdrop-filter: var(--glass-filter); -webkit-backdrop-filter: var(--glass-filter); }
   }
   ```
4. Maximum **three** glass surfaces visible in one viewport. Beyond that the effect stops reading as premium and starts reading as a filter.
5. `backdrop-filter` on a large, animating surface is expensive. Glass surfaces must not be animated on scroll; they may cross-fade their background colour only.

---

## 8. Motion

| Token | Value | Use |
|---|---|---|
| `--dur-1` | `120ms` | Colour/opacity micro-change (chip toggle) |
| `--dur-2` | `180ms` | Button hover, focus ring |
| `--dur-3` | `240ms` | Card hover lift, chip select |
| `--dur-4` | `360ms` | Dropdown/popover, nav state change |
| `--dur-5` | `560ms` | Drawer, modal, page section reveal |
| `--dur-6` | `900ms` | Cinematic reveal (hero text stagger) |
| `--dur-route` | `2400ms` | Route-line draw-on |
| `--dur-ken` | `18000ms` | Ken Burns cycle |
| `--ease-standard` | `cubic-bezier(0.2, 0, 0, 1)` | Default for UI |
| `--ease-out` | `cubic-bezier(0.16, 1, 0.3, 1)` | Entrances |
| `--ease-in` | `cubic-bezier(0.7, 0, 0.84, 0)` | Exits |
| `--ease-cinematic` | `cubic-bezier(0.22, 1, 0.36, 1)` | Hero reveal, route draw |
| `--ease-linear` | `linear` | Ken Burns, marquee |

**Rules**
- Animate `transform` and `opacity` only. `filter` and `backdrop-filter` are not animated. Never animate `width`, `height`, `top`, `left`.
- No spring/bounce easing anywhere. Overshoot reads playful; the brand is composed.
- Hero text reveal: stagger of `80ms` per line, `translateY(16px) → 0` + `opacity 0 → 1` over `--dur-6` with `--ease-cinematic`.
- Every motion token must degrade under `prefers-reduced-motion: reduce` — see `accessibility.md` §6 for the exact per-effect behaviour. The blanket rule is:
  ```css
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }
  ```
  This blanket rule is a safety net, **not** the design. Each cinematic effect has a specified reduced-motion *replacement* (e.g. Ken Burns → static image at the animation's mid-point crop), documented in `accessibility.md`.

---

## 9. Z-index

| Token | Value | Layer |
|---|---|---|
| `--z-base` | `0` | Page content |
| `--z-media-scrim` | `1` | Scrim over a photo, inside its own stacking context |
| `--z-media-content` | `2` | Text over that photo |
| `--z-raised` | `10` | Hovered card, route-line pin |
| `--z-sticky` | `20` | Sticky filter bar, sticky booking summary |
| `--z-nav` | `50` | Top navigation |
| `--z-dropdown` | `60` | Nav menu, select listbox, autocomplete |
| `--z-overlay` | `70` | Modal/drawer backdrop |
| `--z-drawer` | `80` | Mobile nav drawer, filter drawer |
| `--z-modal` | `90` | Dialog |
| `--z-toast` | `100` | Toast/snackbar |
| `--z-tooltip` | `110` | Tooltip |
| `--z-skip-link` | `120` | Skip-to-content link (must beat everything) |

Nothing may use an ad-hoc z-index. If a new layer is needed, it is added to this table first.

---

## 10. Imagery treatment

### 10.1 Photography direction

| Attribute | Rule |
|---|---|
| Subject | Real Sri Lankan places and people. Sunrise/golden-hour or blue-hour light preferred (matches the approved hero). |
| Mood | Wide, atmospheric, depth-of-field or aerial. Avoid flat midday light and avoid stock-model staging. |
| Aspect ratios | Hero `21:9` desktop / `4:5` mobile · Destination card `4:3` · Experience card `3:2` · Trip card `16:9` · Hero rail thumbnail `2:1` · Detail gallery `3:2` |
| Formats | AVIF primary, WebP fallback, JPEG last resort. `<picture>` with `srcset` at 1×/2×. |
| Widths | 390, 640, 828, 1080, 1440, 1920, 2560 |
| Budget | Hero ≤ 220 KB at 1440 (AVIF). Cards ≤ 60 KB each. LCP image `fetchpriority="high"`, `loading="eager"`, everything else `loading="lazy"` + `decoding="async"`. |
| Art direction | Every hero image must contain a **quiet zone** — a low-detail region where the text column lands (bottom-left on desktop, bottom-centre on mobile). The approved Sigiriya image has this in the lower-left jungle canopy. |
| Attribution | Where a source requires credit, it appears in the footer credits list at `--text-small`, not over the image. |

Approved launch set (files under `NobalPath/untitled folder/`, to be renamed and processed on import — do not reference these paths from application code):

| File | Role |
|---|---|
| `Sunrise at Sigiriya Rock …kingshraga].jpeg` | **Hero** (Home). Matches the approved mockup exactly. |
| `Ella srilankan.jpeg` | Experiences — "Tuk-tuk & road trips" / Ella region |
| `Sunset surf with friends.jpeg` | Experiences — "Surf the south coast" |
| `images.jpeg` | Trips / Bookings — "Jungle villa stays" |
| `Hey im coming…🇱🇰.jpeg` | Experiences — culture/street life |
| `white-directions-icon-location-flat-icon-white-…png` | Route-line map pin (see §10.5) |

### 10.2 The scrim recipe (normative)

White text over photography is only legible if the scrim guarantees a worst case. The worst case is a **blown-out highlight (`#FFFFFF`) directly under the text**. A sunrise sky contains exactly that.

Required background luminance under white text:
- Normal text (< 24 px, or < 18.66 px bold) needs 4.5:1 → `L_bg ≤ 0.1833`
- Large text (≥ 24 px, or ≥ 18.66 px bold) and graphics need 3:1 → `L_bg ≤ 0.3000`

Compositing `--color-ink-950` (`#060A09`) at opacity α over `#FFFFFF`:

| α | Composite | Worst-case ratio vs white text | Verdict |
|---|---|---|---|
| 0.36 | `#A3A3A3` | 3.00:1 | large text — exact minimum |
| 0.45 | `#8C8C8C` | 3.67:1 | **large-text floor (with margin)** |
| 0.55 | `#737373` | 4.76:1 | **normal-text floor** |
| 0.62 | `#616161` | 6.20:1 | comfortable |
| 0.68 | `#525252` | 7.62:1 | dense UI over photo |

**Tokens**

```css
--scrim-min-large: 0.45;   /* never go below this under display text */
--scrim-min-body:  0.55;   /* never go below this under body text   */
--scrim-color: 6 10 9;     /* --color-ink-950 as an rgb triple      */
```

**Hero scrim — three stacked layers, in this order, all inside the hero's stacking context at `--z-media-scrim`:**

```css
/* 1. Global cooling wash — unifies varied photography */
--scrim-wash: rgba(6,10,9,0.14);

/* 2. Vertical: protects the rail, trust bar, and lower copy */
--scrim-vertical: linear-gradient(
  to top,
  rgba(6,10,9,0.80) 0%,
  rgba(6,10,9,0.62) 26%,
  rgba(6,10,9,0.30) 52%,
  rgba(6,10,9,0.06) 76%,
  rgba(6,10,9,0.00) 100%
);

/* 3. Horizontal: protects the left-aligned text column (desktop only) */
--scrim-horizontal: linear-gradient(
  to right,
  rgba(6,10,9,0.55) 0%,
  rgba(6,10,9,0.34) 34%,
  rgba(6,10,9,0.10) 60%,
  rgba(6,10,9,0.00) 78%
);

/* 4. Top: protects the transparent nav */
--scrim-top: linear-gradient(to bottom, rgba(6,10,9,0.48) 0%, rgba(6,10,9,0.00) 100%); /* height: 160px */
```

Combined opacity where the hero headline sits (≈ 30–55 % from the bottom, 0–40 % from the left) is `1 − (1−0.14)(1−0.62)(1−0.44) ≈ 0.817` — far above the 0.55 body floor. Combined opacity under the hero **lead paragraph** (lower, still left) is ≈ 0.86. Combined opacity under the **nav** is `1 − (1−0.14)(1−0.48) ≈ 0.553` — exactly at the body floor. ✅

On mobile (< 768 px) the horizontal layer is removed (text is centred/full-width) and the vertical layer is strengthened:
```css
--scrim-vertical-sm: linear-gradient(to top, rgba(6,10,9,0.86) 0%, rgba(6,10,9,0.70) 34%, rgba(6,10,9,0.40) 62%, rgba(6,10,9,0.10) 86%, rgba(6,10,9,0.00) 100%);
```

**Card scrim** (text over a card's own photo, e.g. destination card title):
```css
--scrim-card: linear-gradient(to top, rgba(6,10,9,0.82) 0%, rgba(6,10,9,0.58) 38%, rgba(6,10,9,0.14) 70%, rgba(6,10,9,0.00) 100%);
```

**Text shadow** is permitted as belt-and-braces on hero copy only, and **does not count toward the contrast budget**:
```css
--text-shadow-on-image: 0 1px 2px rgba(0,0,0,0.35), 0 2px 12px rgba(0,0,0,0.22);
```

**QA gate (required before any new hero image ships):** sample the composited hero at 1440×900 and at 390×780; the **maximum pixel luminance** inside the bounding box of every text run must be ≤ 0.1833 (body) / ≤ 0.30 (display). Procedure and tooling note in `accessibility.md` §2.

### 10.3 Text inside glass

Glass blurs the backdrop, which averages highlights but does not eliminate them. Treat glass exactly like a scrim: the colour layer alone must carry the contrast.
- Glass carrying text → `--glass-bg-text` (0.55) minimum → 4.76:1 worst case for `#FFFFFF`. ✅
- Secondary text inside glass is `rgba(255,255,255,0.86)` minimum (worst case **4.0:1** — **large text or non-essential meta only**, since 4.0 < 4.5). Essential secondary text inside glass is full `#FFFFFF` at `--text-small` weight 500.
- `--color-on-image-secondary` (0.88) inside 0.55 glass is 4.1:1 — same restriction. To use it for normal-size text, the surface beneath must be ≥0.62 (which yields 5.3:1).
- Never place `--color-text-meta` (`rgba(255,255,255,0.72)`) inside glass.

### 10.4 Image placeholders

- LQIP: 20 px-wide AVIF blurred up, or a flat `--color-ink-700` fill. No shimmer over photography.
- Every `<img>` carries explicit `width`/`height` **or** a wrapper with `aspect-ratio` to prevent CLS.
- Broken-image fallback: `--color-sand-100` fill with a centred `--color-sand-400` mountain glyph at 32 px and the alt text visible at `--text-small`.

### 10.5 The route-line + pin motif

The dotted hand-drawn path and its white map pin are the one piece of illustration in the system.

| Property | Value |
|---|---|
| Stroke | `#FFFFFF`, `opacity: 0.92` |
| Stroke width | `3px` @ ≥1024; `2.5px` @ 768–1023; `2px` @ <768 |
| Dash | `stroke-dasharray: 0.5 11; stroke-linecap: round` (round dots, not dashes) |
| Join | `stroke-linejoin: round` |
| Filter | `drop-shadow(0 1px 3px rgba(0,0,0,0.45))` |
| Geometry | Hand-drawn cubic Bézier; irregular, never a perfect arc. Authored once as an SVG path in the repo; not generated. |
| Pin size | 36 × 48 CSS px @ ≥1024; 28 × 37 @ <1024 |
| Pin asset | `white-directions-icon-location-flat-icon-white-…png` — **must be traced to SVG on import.** It is a flat single-colour raster; keeping it as PNG forces a 3× export and still softens on high-DPI. Filename in the repo: `route-pin.svg`. |
| Pin shadow | `drop-shadow(0 2px 6px rgba(0,0,0,0.5))` |
| Accent state | The "travelled" segment of an active route (Plan page) switches to `--color-amber-500` at the same stroke width (9.0:1 on dark — graphics threshold cleared with margin). |
| Semantics | `role="presentation"` / `aria-hidden="true"`. It is decoration and must never be the only carrier of meaning. |
| Animation | `stroke-dashoffset` draw-on over `--dur-route` with `--ease-cinematic`, triggered once at 25 % intersection. Under reduced motion the path renders fully drawn with no animation. |

### 10.6 Iconography

- **Lucide** (ISC-licensed, tree-shakeable). No other icon set.
- Sizes: `16` (inline with `--text-small`), `20` (default UI), `24` (nav, card affordance), `32` (empty-state).
- Stroke `1.5px` at 20/24, `1.75px` at 16, `2px` at 32. Never scale an icon with CSS `transform`.
- Icons are `aria-hidden="true"` when a text label is present; icon-only controls require `aria-label` **and** a tooltip.
- Icon colour inherits `currentColor`. Never colour an icon independently of its label.

---

## 11. Focus treatment

A single ring fails on photography (a white ring vanishes on sky; a dark ring vanishes on jungle). Noble Path uses a **dual ring** everywhere.

```css
--focus-ring: 0 0 0 var(--focus-ring-width) var(--color-focus),
              0 0 0 calc(var(--focus-ring-width) + 2px) var(--color-focus-contrast);
--focus-ring-on-dark: 0 0 0 var(--focus-ring-width) var(--color-focus-on-dark),
                      0 0 0 calc(var(--focus-ring-width) + 2px) rgba(6,10,9,0.9);
```

- Applied on `:focus-visible` only, never on `:focus` for pointer interactions.
- Light context: jungle inner ring + white outer ring.
- Dark/photographic context: amber-400 inner ring + near-black outer ring.
- Ring offset `2px` from the control edge; on pill controls the ring follows the pill radius.
- `outline: 2px solid transparent; outline-offset: 2px` is set alongside the box-shadow so Windows High Contrast Mode still shows a ring.
- Focus is **never** removed. `outline: none` without a replacement is a build-blocking defect.

Full keyboard requirements are in `accessibility.md`.

---

## 12. Tailwind v4 `@theme` handoff

The engineer copies this verbatim into `app/globals.css` (or equivalent). Names match the tables above exactly.

```css
@import "tailwindcss";

@theme {
  /* ---- breakpoints: replace Tailwind defaults entirely ---- */
  --breakpoint-*: initial;
  --breakpoint-xs: 390px;
  --breakpoint-md: 768px;
  --breakpoint-lg: 1024px;
  --breakpoint-xl: 1440px;
  --breakpoint-2xl: 1920px;

  /* ---- colour: ink ---- */
  --color-ink-950: #060A09;
  --color-ink-900: #0A0F0D;
  --color-ink-800: #16211E;
  --color-ink-700: #24322E;
  --color-ink-600: #33433E;
  --color-ink-500: #4E605A;
  --color-ink-400: #72827C;
  --color-ink-300: #A3AFAA;

  /* ---- colour: sand ---- */
  --color-sand-50:  #FBF8F3;
  --color-sand-100: #F3EDE3;
  --color-sand-200: #E6DBC9;
  --color-sand-300: #C9B99B;
  --color-sand-400: #A08D6D;

  /* ---- colour: jungle ---- */
  --color-jungle-900: #0E3B34;
  --color-jungle-800: #11473E;
  --color-jungle-700: #15544A;
  --color-jungle-600: #1A6659;
  --color-jungle-500: #1E7A6A;
  --color-jungle-400: #3FA08D;
  --color-jungle-200: #BFE0D8;
  --color-jungle-50:  #EAF5F2;

  /* ---- colour: amber ---- */
  --color-amber-700: #8A5416;
  --color-amber-600: #C9812A;
  --color-amber-500: #E9A23B;
  --color-amber-400: #F4BF63;
  --color-amber-100: #FCEFD8;

  /* ---- colour: clay ---- */
  --color-clay-600: #8E4C2C;
  --color-clay-500: #B4643C;
  --color-clay-100: #F6E5DB;

  /* ---- colour: feedback ---- */
  --color-success-600: #1E7A4A;
  --color-success-200: #A8D8BC;
  --color-success-50:  #E8F5ED;
  --color-warning-700: #8A5A0E;
  --color-warning-200: #EFD29A;
  --color-warning-50:  #FCF2DF;
  --color-error-600:   #B3261E;
  --color-error-200:   #F1B5B0;
  --color-error-50:    #FDECEA;

  /* ---- fonts ---- */
  --font-display: "Playfair Display", "Playfair Display Fallback", "Iowan Old Style", "Times New Roman", Times, serif;
  --font-sans: "Poppins", "Poppins Fallback", "Century Gothic", "Avenir Next", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;

  /* ---- type scale ---- */
  --text-display: clamp(2.5rem, 1.664rem + 3.429vw, 4.75rem);
  --text-display--line-height: 1.06;
  --text-display--letter-spacing: -0.02em;
  --text-display--font-weight: 700;

  --text-display-sm: clamp(2rem, 1.443rem + 2.286vw, 3.5rem);
  --text-display-sm--line-height: 1.10;
  --text-display-sm--letter-spacing: -0.018em;

  --text-h1: clamp(2rem, 1.443rem + 2.286vw, 3.5rem);
  --text-h1--line-height: 1.12;
  --text-h1--letter-spacing: -0.015em;

  --text-h2: clamp(1.625rem, 1.3rem + 1.333vw, 2.5rem);
  --text-h2--line-height: 1.18;
  --text-h2--letter-spacing: -0.012em;

  --text-h3: clamp(1.25rem, 1.064rem + 0.762vw, 1.75rem);
  --text-h3--line-height: 1.25;
  --text-h3--letter-spacing: -0.01em;

  --text-h4: clamp(1.0625rem, 0.993rem + 0.286vw, 1.25rem);
  --text-h4--line-height: 1.35;
  --text-h4--letter-spacing: -0.005em;

  --text-h5: 1rem;
  --text-h5--line-height: 1.4;

  --text-lead: clamp(1.0625rem, 1.016rem + 0.19vw, 1.1875rem);
  --text-lead--line-height: 1.55;

  --text-body: 1rem;
  --text-body--line-height: 1.625;

  --text-body-sm: 0.875rem;
  --text-body-sm--line-height: 1.55;

  --text-small: 0.8125rem;
  --text-small--line-height: 1.5;

  --text-overline: clamp(0.75rem, 0.727rem + 0.095vw, 0.8125rem);
  --text-overline--line-height: 1.3;
  --text-overline--letter-spacing: 0.14em;
  --text-overline--font-weight: 600;

  --text-kicker: clamp(1rem, 0.954rem + 0.19vw, 1.125rem);
  --text-kicker--line-height: 1.4;
  --text-kicker--letter-spacing: 0.012em;

  --text-button: clamp(0.9375rem, 0.914rem + 0.095vw, 1rem);
  --text-button--line-height: 1;
  --text-button--letter-spacing: 0.01em;
  --text-button--font-weight: 600;

  --text-button-serif: clamp(1.0625rem, 1.039rem + 0.095vw, 1.125rem);
  --text-button-serif--line-height: 1;
  --text-button-serif--letter-spacing: 0.005em;

  --text-nav: clamp(0.9375rem, 0.891rem + 0.19vw, 1.0625rem);
  --text-nav--line-height: 1;

  --text-wordmark: clamp(1.125rem, 1.055rem + 0.286vw, 1.3125rem);
  --text-wordmark--line-height: 1;
  --text-wordmark--letter-spacing: 0em;
  --text-wordmark--font-weight: 700;

  /* ---- radii ---- */
  --radius-xs: 6px;
  --radius-sm: 10px;
  --radius-md: 14px;
  --radius-lg: 20px;
  --radius-xl: 24px;
  --radius-2xl: 32px;
  --radius-3xl: 40px;
  --radius-pill: 9999px;

  /* ---- shadows ---- */
  --shadow-xs: 0 1px 2px rgba(10,15,13,0.06);
  --shadow-sm: 0 2px 6px rgba(10,15,13,0.08);
  --shadow-md: 0 8px 24px -8px rgba(10,15,13,0.16), 0 2px 6px -2px rgba(10,15,13,0.08);
  --shadow-lg: 0 20px 48px -16px rgba(10,15,13,0.24), 0 4px 12px -4px rgba(10,15,13,0.10);
  --shadow-xl: 0 40px 80px -24px rgba(10,15,13,0.32);
  --shadow-glass: 0 16px 40px -12px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.18);
  --shadow-media: 0 12px 32px -12px rgba(6,10,9,0.45);

  /* ---- blur ---- */
  --blur-sm: 10px;
  --blur-md: 18px;
  --blur-lg: 28px;

  /* ---- motion ---- */
  --ease-standard: cubic-bezier(0.2, 0, 0, 1);
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-in: cubic-bezier(0.7, 0, 0.84, 0);
  --ease-cinematic: cubic-bezier(0.22, 1, 0.36, 1);

  /* ---- containers ---- */
  --container-prose: 760px;
  --container-form: 640px;
  --container-max: 1280px;
  --container-wide: 1440px;
}

/* Non-@theme tokens: glass, scrims, durations, z-index, semantic aliases.
   These are plain custom properties (they do not need to generate utilities). */
:root {
  --glass-bg: rgba(12,18,16,0.38);
  --glass-bg-text: rgba(10,15,13,0.55);
  --glass-bg-strong: rgba(10,15,13,0.68);
  --glass-bg-light: rgba(255,255,255,0.72);
  --glass-border: rgba(255,255,255,0.22);
  --glass-border-light: rgba(10,15,13,0.08);
  --glass-divider: rgba(255,255,255,0.28);
  --glass-saturate: 140%;
  --glass-filter: blur(var(--blur-md)) saturate(var(--glass-saturate));

  --color-on-image: #FFFFFF;
  --color-on-image-secondary: rgba(255,255,255,0.88);
  --color-on-image-muted: rgba(255,255,255,0.74);
  --color-on-image-rule: rgba(255,255,255,0.28);
  --text-shadow-on-image: 0 1px 2px rgba(0,0,0,0.35), 0 2px 12px rgba(0,0,0,0.22);

  --scrim-min-large: 0.45;
  --scrim-min-body: 0.55;

  --dur-1: 120ms; --dur-2: 180ms; --dur-3: 240ms;
  --dur-4: 360ms; --dur-5: 560ms; --dur-6: 900ms;
  --dur-route: 2400ms; --dur-ken: 18000ms;

  --z-base: 0; --z-media-scrim: 1; --z-media-content: 2; --z-raised: 10;
  --z-sticky: 20; --z-nav: 50; --z-dropdown: 60; --z-overlay: 70;
  --z-drawer: 80; --z-modal: 90; --z-toast: 100; --z-tooltip: 110; --z-skip-link: 120;

  --color-focus: var(--color-jungle-600);
  --color-focus-on-dark: var(--color-amber-400);
  --color-focus-contrast: #FFFFFF;
  --focus-ring-width: 3px;
  --focus-ring-offset: 2px;

  --measure-body: 68ch;
  --measure-lead: 52ch;
  --measure-hero: 38ch;

  /* responsive semantic spacing */
  --gutter: 20px;
  --grid-gap: 16px;
  --section-y: 64px;
  --section-y-tight: 40px;
  --card-pad: 16px;
}
@media (min-width: 768px)  { :root { --gutter: 32px; --grid-gap: 20px; --section-y: 80px;  --section-y-tight: 48px; --card-pad: 20px; } }
@media (min-width: 1024px) { :root { --gutter: 40px; --grid-gap: 24px; --section-y: 96px;  --section-y-tight: 56px; --card-pad: 24px; } }
@media (min-width: 1440px) { :root { --gutter: 48px; --section-y: 96px;  --section-y-tight: 64px; } }
@media (min-width: 1920px) { :root { --section-y: 112px; } }
```

**Note for the implementer:** `--breakpoint-*: initial;` wipes Tailwind's `sm/md/lg/xl/2xl` defaults. After this block, `md:` means 768, `lg:` means 1024, `xl:` means 1440, `2xl:` means 1920, and `xs:` means 390. Base (unprefixed) styles are the 390 mobile layer. Do not reintroduce `sm:`.

---

## 13. Approved deviations from the mockup

These are the only places where the shipped design intentionally differs from `Screenshot 2026-09-19 at 19.31.59.png`. All are recorded in `docs/decisions/architecture-decisions.md`.

| ID | Mockup | Shipped | Rationale |
|---|---|---|---|
| **D-01** | "View all" link rendered in a bright sky blue (≈ `#3FA9F5`) | `--color-on-image` white label + a 2 px `--color-amber-500` underline that grows on hover | `#3FA9F5` over the hero's mid-tone canopy measures ≈ 2.9:1 — below AA — and blue belongs to no brand ramp. It reads as an unstyled default link. |
| **D-02** | Hero lead paragraph (`Discover breathtaking destinations…`) set in the display serif at ~16 px | Same copy set in Poppins 400 at `--text-lead` | Playfair's hairlines disintegrate at 16–19 px over photography even at scrim 0.86; anti-aliasing eats the thin strokes on non-Retina displays. The serif voice is preserved by the headline and the CTA label directly above/below it. |
| **D-03** | Hero CTA label in serif | **Kept** in serif (`--text-button-serif`) | It sits on a solid white pill at 19:1, where the hairlines survive. This retains the editorial character D-02 gives up. |
| **D-04** | Trust bar sits flush with the hero rail at the same baseline | Trust bar moves **below** the rail as a full-width glass strip at < 1024 px | At 768–1023 px the four labels and four thumbnails cannot share a row without the labels dropping to 3 lines. |
| **D-05** | Nav has 5 links and no account/booking affordance | Nav gains a primary **Book** pill and an account entry point at ≥ 1024 px; `About Us` moves into an overflow group at 1024–1199 px | Bookings is a required product section; it needs a persistent entry point. |

---

## 14. Governance

- This file is the sole source of truth for tokens. A component that needs a value not in this file requires a token to be added **here first**.
- Hard-coded hex values, px font sizes, or ad-hoc shadows in application code are review-blocking.
- Any change to §2 (colour), §3.1 (families) or §10.2 (scrim) is a breaking design change: it requires a new ADR entry and re-verification of the contrast tables.
- Contrast figures in this document were computed with the WCAG 2.x relative-luminance formula. If a token value changes, the ratio must be recomputed, not assumed.

**Related documents:** `user-flows.md` · `components.md` · `page-specs.md` · `accessibility.md` · `../decisions/architecture-decisions.md`
