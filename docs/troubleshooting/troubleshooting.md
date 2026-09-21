# Noble Path — Troubleshooting Runbook

**Project:** Noble Path
**Owner:** Fortechz — DevOps Engineer
**Status:** Living document — add an entry whenever a new failure mode is found
**Last updated:** 2026-09-19

Each entry: **symptom → likely cause → diagnosis → fix**.

> If production is currently broken, stop reading and go to
> `docs/deployment/rollback.md`. **Roll back first, diagnose second.**

**Stack reference:** Next.js 16.3.5 (App Router) · React 19.3 · TypeScript 5.9 strict
(`noUncheckedIndexedAccess`) · Tailwind CSS v4.3 via `@tailwindcss/postcss` · Zod 4.6 ·
Node 24 · no database.

---

## Quick index

| # | Area | Jump |
| --- | --- | --- |
| 1 | Build fails in CI but works locally | [§1](#1-build-fails-in-ci-but-works-locally) |
| 2 | `npm audit` fails the build | [§2](#2-npm-audit-fails-the-build) |
| 3 | Tailwind v4 / PostCSS — styles missing or wrong | [§3](#3-tailwind-v4--postcss--styles-missing-or-wrong) |
| 4 | `next/image` rejects a remote image | [§4](#4-nextimage-rejects-a-remote-image) |
| 5 | CSP blocks fonts, images or scripts | [§5](#5-csp-blocks-fonts-images-or-scripts) |
| 6 | Rate limiter behaves inconsistently | [§6](#6-rate-limiter-behaves-inconsistently-across-instances) |
| 7 | Hydration mismatch | [§7](#7-hydration-mismatch) |
| 8 | Slow LCP on the hero image | [§8](#8-slow-lcp-on-the-hero-image) |
| 9 | Deploy smoke check fails | [§9](#9-deploy-smoke-check-fails-on-apihealth) |
| 10 | Docker build fails on `.next/standalone` | [§10](#10-docker-build-fails-copying-nextstandalone) |
| 11 | Booking enquiries submit but nobody receives them | [§11](#11-booking-enquiries-succeed-but-nobody-receives-them) |
| 12 | Production deploy job never starts | [§12](#12-production-deploy-job-sits-in-waiting-forever) |

---

## 1. Build fails in CI but works locally

**Symptom.** `npm run build` succeeds on a laptop; the `Production build` step in
GitHub Actions fails — often with a type error, an unresolved module, or a casing
error on an import path.

**Likely causes, in order of how often they are actually it:**

1. **Filename casing.** macOS is case-insensitive; the Ubuntu runner is not.
   `import Hero from "@/components/hero"` resolves locally to `Hero.tsx` and fails in
   CI. This is the most common cause on this project because the team is on macOS.
2. **Stale local `.next/` or `*.tsbuildinfo`.** TypeScript's incremental cache hides a
   type error that a clean build exposes. CI always builds clean.
3. **Dependency drift.** Someone ran `npm install` and did not commit the updated
   `package-lock.json`. CI runs `npm ci`, which installs exactly the lockfile.
4. **A missing environment variable at build time.** CI sets
   `NEXT_PUBLIC_SITE_URL=https://ci.invalid` and nothing else. Code that reads a
   server-only variable at module scope during the build will fail there.
5. **A file that is git-ignored locally but imported.** e.g. anything under
   `untitled folder/` or `data/*.json`.

**Diagnosis.**

```bash
cd /Users/kethnulasiriwardana/Documents/Fortechz/NobalPath

# Reproduce CI exactly: clean install, clean build, CI's environment.
rm -rf .next node_modules tsconfig.tsbuildinfo
npm ci
NODE_ENV=production NEXT_PUBLIC_SITE_URL=https://ci.invalid npm run build

# Casing check — compare imports against files actually tracked by Git.
git ls-files | grep -iE '\.(ts|tsx)$'

# Lockfile drift — this must produce no diff.
git status --porcelain package-lock.json

# Confirm the failing module really exists with that exact casing.
ls -la components/ lib/ content/
```

**Fix.**

- Casing: rename with `git mv OldName.tsx TempName.tsx && git mv TempName.tsx
  NewName.tsx` (the two-step is required — a single `git mv` differing only in case is
  a no-op on macOS). Commit both renames.
- Stale cache: delete `.next` and `*.tsbuildinfo`; commit nothing.
- Lockfile: commit `package-lock.json`. Use `npm ci` locally as a habit.
- Build-time env access: move the read inside a request-scoped function, or give it a
  safe default. Never add a secret to `ci.yml` to make a build pass — see
  `docs/deployment/environment.md` §3.

---

## 2. `npm audit` fails the build

**Symptom.** The `Dependency audit` job fails with `found N high severity
vulnerabilities`. Every other check is green.

**Likely cause.** A new advisory was published against a transitive dependency. This
can start failing with **no code change at all** — the advisory database moved, not
your repository.

**Diagnosis.**

```bash
npm audit --audit-level=high
npm audit --json | head -100           # full detail including paths

# Which top-level dependency pulls in the vulnerable package?
npm ls <vulnerable-package>
```

**Fix, in order of preference.**

1. `npm audit fix` — resolves it within the existing semver ranges. Re-run
   `npm run build` and `npm run typecheck`, then commit the lockfile.
2. Bump the parent dependency to a version with a patched transitive.
3. If it is a dev-only dependency that never reaches the runtime, it is **still not
   automatically acceptable** — a compromised build tool is a supply-chain risk. Get a
   Cybersecurity Engineer decision.
4. If no fix exists: **do not add `|| true` and do not lower `--audit-level`.** Record
   the advisory, the reasoning and the compensating controls in
   `docs/security/vulnerabilities.md`, have the Cybersecurity Engineer accept the
   risk, and suppress that specific advisory explicitly with a dated review reminder.

Weakening the gate silently is the failure mode this project must avoid — it converts
a one-off decision into a permanently blind check.

---

## 3. Tailwind v4 / PostCSS — styles missing or wrong

Tailwind v4 is **not** Tailwind v3 with a new version number. Most problems here are
v3 habits applied to a v4 project.

### 3.1 No styles at all — the page renders unstyled HTML

**Likely cause.** The stylesheet is not imported, or it uses v3 directives.

Tailwind v4 uses a **single CSS import**, not the three `@tailwind` directives:

```css
/* app/globals.css — v4 */
@import "tailwindcss";
```

```css
/* v3 — DOES NOT WORK in v4 */
@tailwind base;
@tailwind components;
@tailwind utilities;
```

**Diagnosis.**

```bash
grep -rn "@tailwind\|@import \"tailwindcss\"" app/ components/ 2>/dev/null
grep -rn "globals.css" app/layout.tsx
cat postcss.config.mjs        # must reference @tailwindcss/postcss
```

**Fix.** Use `@import "tailwindcss";` and ensure `app/layout.tsx` imports the
stylesheet. `postcss.config.mjs` is already correct for v4:

```js
const config = { plugins: { "@tailwindcss/postcss": {} } };
```

Using the v3 plugin name (`tailwindcss: {}`) in `postcss.config.mjs` produces a
confusing "It looks like you're trying to use `tailwindcss` directly as a PostCSS
plugin" error.

### 3.2 Custom colours / fonts from the design system do not apply

**Likely cause.** A `tailwind.config.js` `theme.extend` block. **Tailwind v4 is
CSS-first** — there is no `tailwind.config.js` in this project and there should not be
one. Design tokens are declared in CSS:

```css
@import "tailwindcss";

@theme {
  --color-noble-ink: #0f1419;
  --font-display: "…", serif;
  --font-sans: "…", sans-serif;
}
```

`--color-noble-ink` then generates `bg-noble-ink`, `text-noble-ink`, etc.

**Diagnosis.**

```bash
ls tailwind.config.*                     # expect: no such file
grep -rn "@theme" app/                   # where tokens are declared
```

**Fix.** Move tokens into an `@theme` block. Token names must follow the v4
namespaces (`--color-*`, `--font-*`, `--spacing-*`, `--radius-*`) or no utility is
generated. Coordinate with the UI/UX Designer's `docs/design/design-system.md` so the
token names match the approved specification.

### 3.3 A class works in dev but disappears in the production build

**Likely cause.** The class name is constructed dynamically. Tailwind scans source
text; it cannot evaluate expressions.

```tsx
// BROKEN — "bg-blue-500" never appears literally in the source
<div className={`bg-${colour}-500`} />

// CORRECT — full class names present as literal strings
const TONE = { blue: "bg-blue-500", amber: "bg-amber-500" } as const;
<div className={TONE[colour]} />
```

**Diagnosis.** `grep -rn 'className={`' app/ components/` and inspect each template
literal for interpolated class fragments.

### 3.4 Styles change after a deploy for no reason

**Likely cause.** Tailwind v4 uses modern CSS (`@property`, `color-mix()`, cascade
layers). Safari 16 (NFR-5 requires iOS Safari 16+) supports these less completely than
current Chrome. **Test on a real iOS 16 Safari**, not only a desktop responsive view.

---

## 4. `next/image` rejects a remote image

**Symptom.** Build or runtime error:

```text
Invalid src prop (https://example.com/photo.jpg) on `next/image`,
hostname "example.com" is not configured under images in your next.config.js
```

Or: the image element renders but the request to `/_next/image?url=...` returns 400.

**Likely cause.** `next.config.ts` allows exactly one remote host:

```ts
images: {
  remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com" }],
  formats: ["image/avif", "image/webp"],
}
```

Anything else is rejected. Common triggers: a `plus.unsplash.com` URL, an
`unsplash.com/photos/...` page URL rather than the CDN URL, a Pexels/Pixabay URL, or
an `http://` URL.

**Diagnosis.**

```bash
# Every remote image URL referenced in content and components.
grep -rnoE 'https?://[a-zA-Z0-9.-]+/[^"'"'"' ]*' content/ components/ app/ \
  | grep -iE '\.(jpg|jpeg|png|webp|avif)' | sort -u

# What the config currently permits.
grep -A4 remotePatterns next.config.ts

# Reproduce the optimiser response directly.
curl -sI "http://localhost:3000/_next/image?url=$(python3 -c \
  'import urllib.parse,sys;print(urllib.parse.quote(sys.argv[1],safe=""))' \
  'https://images.unsplash.com/photo-xxxx')&w=1920&q=75" | head -1
```

**Fix — preferred.** Change the content to use an `images.unsplash.com` URL. Unsplash
photo *page* URLs are not image URLs; use the direct CDN URL.

**Fix — adding a host (do not do this casually).** Widening `remotePatterns` widens
the optimiser's fetch surface: an over-broad pattern (a wildcard hostname, or
`pathname: "/**"` on a user-content host) turns Noble Path's optimiser into an open
image proxy and an SSRF aid. Therefore:

1. Confirm the licence permits use (requirements §7.3).
2. Add a **narrow** pattern — exact hostname, `protocol: "https"`, and a `pathname`
   prefix where possible.
3. **Add the same host to the CSP `img-src` in the same change.** If you add it to
   `remotePatterns` only, the optimiser will fetch it and the browser will still
   block it — see §5.
4. Route it past the **Cybersecurity Engineer**; `next.config.ts` is owned by the
   Full-Stack Engineer, not DevOps.

**Fix — self-host instead.** Put the image in `public/images/...` and reference it by
path. No remote pattern, no CSP change, better caching. Preferred for anything Noble
Path owns.

---

## 5. CSP blocks fonts, images or scripts

**Symptom.** Console errors such as:

```text
Refused to load the font 'https://fonts.gstatic.com/...' because it violates the
following Content Security Policy directive: "font-src 'self' https://fonts.gstatic.com data:"

Refused to load the image 'https://cdn.example.com/x.jpg' because it violates ...
"img-src 'self' data: blob: https://images.unsplash.com"

Refused to execute inline script because it violates ... "script-src 'self'"
```

Visually: the display serif falls back to a system font (and the whole editorial look
collapses), images are blank, or an embedded widget silently does nothing.

**Likely cause.** The policy in `next.config.ts` is deliberately strict. Current
allow-list:

| Directive | Allows |
| --- | --- |
| `script-src` | `'self' 'unsafe-inline'` (+ `'unsafe-eval'` in dev only) |
| `style-src` | `'self' 'unsafe-inline' https://fonts.googleapis.com` |
| `font-src` | `'self' https://fonts.gstatic.com data:` |
| `img-src` | `'self' data: blob: https://images.unsplash.com` |
| `connect-src` | `'self'` (+ `ws: wss:` in dev) |
| `frame-ancestors` | `'none'` — the site cannot be iframed anywhere |
| `object-src` | `'none'` |

So: Google Fonts works, Unsplash images work, and **anything else is blocked** —
including a self-hosted font served from a different origin, an analytics script, a
YouTube embed, a map iframe, or an API call to a third-party host.

**Diagnosis.**

```bash
# Read the policy actually being served (not the one you think is being served).
curl -sI https://staging.noblepath.lk | grep -i content-security-policy

# Locally:
curl -sI http://localhost:3000 | grep -i content-security-policy

# Find third-party origins referenced in the app.
grep -rnoE 'https://[a-zA-Z0-9.-]+' app/ components/ content/ | \
  grep -v 'images.unsplash.com\|fonts.googleapis.com\|fonts.gstatic.com\|noblepath' | sort -u
```

In the browser: DevTools → Console shows the exact directive violated, and the
Network tab shows the blocked request with status `(blocked:csp)`.

**Fix.**

- **Fonts — preferred:** use `next/font` with self-hosted font files. They are served
  from `'self'`, so no CSP change is needed, there is no third-party round trip (good
  for NFR-1), and it eliminates the `fonts.googleapis.com` / `fonts.gstatic.com`
  dependency entirely. This is the recommended end state for Noble Path.
- **Fonts — if staying on Google Fonts:** the current policy already permits it. If it
  is still blocked, the stylesheet is probably being loaded from a different Google
  origin, or `style-src` is being overridden somewhere.
- **A blocked image:** see §4 — `remotePatterns` and `img-src` must be changed
  *together*.
- **A blocked third-party script:** **treat as a security decision, not a config
  tweak.** Every origin added to `script-src` gains the ability to execute code in
  the context of Noble Path's pages. Requires Cybersecurity Engineer review.
- **A blocked iframe (maps, video):** requires `frame-src`, which the policy does not
  currently include at all. Same review requirement.
- **Never "fix" CSP by adding `'unsafe-eval'` to production `script-src`,
  broadening to `*`, or removing the header.** If a library requires `'unsafe-eval'`
  in production, the correct answer is usually a different library.

**Note on `style-src 'unsafe-inline'`:** it is present deliberately and documented in
`next.config.ts` — Next.js injects critical CSS inline during streaming, and the
hero's parallax uses inline `style` props. It cannot be removed without breaking
rendering. `script-src` is the directive that matters most here, and it stays free of
`'unsafe-eval'` in production.

---

## 6. Rate limiter behaves inconsistently across instances

**Symptom.** Any of:

- A visitor submits 12 enquiries in a row and is never blocked, despite
  `BOOKING_RATE_LIMIT_MAX=5`.
- A visitor gets `429` on their **first** submission.
- A limit that works locally does nothing on staging or production.
- The 429 count is erratic between deploys.

**Likely cause.** The limiter is **in-memory, per process**. The app runtime is
stateless and horizontally scaled, and instances are created and recycled on demand.
Consequences:

- Each instance keeps its own counter → effective limit ≈
  `BOOKING_RATE_LIMIT_MAX × live instances`.
- Successive requests from one visitor land on different instances → nobody's counter
  reaches the threshold.
- An instance recycles → its counters vanish mid-window.
- Locally there is exactly one process, so the limiter looks like it works perfectly.
  **Local behaviour is not evidence.**

If instead a *first* request is blocked, the cause is different: the client key is
too coarse. If the key is derived from a header like `x-forwarded-for` and the code
takes the whole header rather than the first address, or falls back to a constant when
the header is absent, then **every visitor shares one bucket** — the sixth visitor of
the window is blocked regardless of who they are. Visitors behind one hotel or airport
NAT legitimately share an IP, which produces the same symptom at a smaller scale.

**Diagnosis.**

```bash
# Configured values (never print real secrets; these are not secrets).
grep BOOKING_RATE_LIMIT .env.example

# Is the limit ever actually enforced? Send MAX+3 requests and watch the codes.
for i in $(seq 1 8); do
  curl -s -o /dev/null -w "req $i -> %{http_code}\n" \
    -X POST https://staging.noblepath.lk/api/bookings \
    -H 'content-type: application/json' \
    -d '{"name":"ratelimit probe","email":"probe@example.com","partySize":2}'
done
```

Local single-instance comparison:

```bash
npm run build && npm start     # one process
# repeat the loop against http://localhost:3000 — you SHOULD see 429 after MAX
```

If it limits locally but not on staging, it is the multi-instance problem. If it
limits at the wrong time in both, it is the keying problem.

**Fix.**

- **Accept for v1.** This is a documented limitation
  (`docs/architecture/infrastructure-architecture.md` §7). It deters casual abuse; it
  does not stop a determined attacker. Do not raise `BOOKING_RATE_LIMIT_MAX` to make
  the symptom go away — that makes it strictly weaker.
- **If the key is wrong:** fix the client identification (first address in
  `x-forwarded-for`, with a deterministic fallback that does not collapse all clients
  into one bucket). This is an application fix, owned by the Full-Stack Engineer, and
  it is security-relevant — Cybersecurity Engineer review.
- **If real abuse appears** (alert #3 firing repeatedly): move to a shared store
  (Vercel KV / Upstash Redis) or a platform WAF rate-limit rule in front of the route.
  **Infrastructure change — DevOps review and an ADR required.**
- **If legitimate visitors are blocked:** they are likely sharing a NAT. Widen the
  window keying or raise `MAX` modestly, and make the 429 response explain itself so a
  visitor knows to retry rather than abandoning the enquiry. A blocked enquiry is a
  lost lead.

---

## 7. Hydration mismatch

**Symptom.**

```text
Hydration failed because the server rendered HTML didn't match the client.
```

Or: content flashes and then changes; the itinerary builder shows an empty plan for a
moment before the saved plan appears; React logs a recoverable error and re-renders
the subtree on the client.

**Likely causes — and on this project, #1 and #2 are almost always it:**

1. **Reading `localStorage` during render.** FR-4.4 requires the plan to persist in
   the browser without an account. The server has no `localStorage`, so it renders an
   empty plan; the client renders the saved plan. Mismatch by construction.
2. **`window`, `document`, `navigator` or `matchMedia` touched during render.**
   NFR-10 (`prefers-reduced-motion`) invites exactly this mistake.
3. **`new Date()`, `Date.now()`, `Math.random()`, or a locale-dependent format**
   during render. Server and client differ in time and in timezone — real for Noble
   Path, whose visitors are in different timezones from the Asia/Colombo server
   context.
4. **Invalid HTML nesting** (a `<div>` inside a `<p>`, a `<p>` inside a `<p>`). The
   browser silently repairs the DOM, so the tree no longer matches what React
   rendered. Common in editorial content with rich descriptions.
5. **A browser extension** injecting markup — a false positive. Check in a clean
   private window before investigating further.

**Diagnosis.**

```bash
# Browser-only APIs referenced outside an effect.
grep -rn "localStorage\|sessionStorage\|window\.\|document\.\|navigator\.\|matchMedia" \
  app/ components/ lib/ | grep -v "use client" | grep -v useEffect

# Non-deterministic values in render paths.
grep -rn "new Date()\|Date.now()\|Math.random()\|toLocaleDateString\|toLocaleString" \
  app/ components/ lib/

# Which components are client components?
grep -rln '"use client"' app/ components/
```

In the browser: React's error overlay in dev prints the diverging subtree — read it
before guessing. Reproduce against a production build (`npm run build && npm start`),
because dev-mode behaviour differs.

**Fix.**

- Read persisted state in `useEffect`, not during render. Render a deterministic
  empty/skeleton state on the server, then populate after mount. Give the skeleton the
  **same dimensions** as the populated state or you will trade a hydration warning for
  a CLS failure (NFR-2).
- Gate browser APIs behind `useEffect` or `typeof window !== "undefined"` — the latter
  only in code that is genuinely client-only.
- Handle `prefers-reduced-motion` with the CSS media query wherever possible. CSS
  needs no JavaScript, no hydration and no mismatch, and it satisfies NFR-10 cleanly.
- Format dates from a fixed, explicit locale and timezone, or format on the client only.
- Fix invalid nesting — validate the rendered HTML of any page carrying rich editorial
  text.
- Use `suppressHydrationWarning` **only** on a genuinely unavoidable leaf (a timestamp
  element), never on a container. It suppresses the warning, not the mismatch.

---

## 8. Slow LCP on the hero image

**Symptom.** NFR-1 breached: home page LCP > 2.5s on throttled 4G mobile. Lighthouse
reports the hero photograph as the LCP element. Alert #9 fires.

**Likely causes, in the order worth checking:**

1. **The hero `<Image>` lacks `priority`.** Without it the image is lazy-loaded and
   discovered late, and there is no preload hint. This is the single most common cause
   and the easiest fix.
2. **The delivered image exceeds the NFR-9 300KB budget** — usually an oversized
   source, or `quality` left high.
3. **Serving JPEG instead of AVIF/WebP.** `formats: ["image/avif", "image/webp"]` is
   configured, but a bare `<img>` or a `background-image` in CSS bypasses the
   optimiser completely.
4. **Cold image-optimisation cache.** The first request for a given
   width/quality/format variant transcodes on demand. After a deploy or a new image,
   the first visitor pays that cost.
5. **Render-blocking web fonts.** The overlay display serif delays text paint; if the
   LCP element is text over the photograph rather than the photograph itself, fonts
   are the cause. Compounded if fonts come from a third-party origin (§5).
6. **A heavy client component above the fold** (the parallax) delaying paint.
7. **No `sizes` on a `fill` image**, so the browser fetches a far larger variant than
   the viewport needs — worst on mobile, which is exactly where NFR-1 is measured.

**Diagnosis.**

```bash
# Source asset sizes. The hero should not be a multi-megabyte original.
ls -lh public/images/hero/ public/images/destinations/ public/images/experiences/

# Is the hero marked priority, and does it have sizes?
grep -rn "priority" app/ components/
grep -rn "<img" app/ components/          # any bare <img> bypasses optimisation
grep -rn "background-image" app/ components/

# What is actually delivered, and in what format?
curl -sI "https://noblepath.lk/_next/image?url=%2Fimages%2Fhero%2Fsigiriya-sunrise.jpg&w=1920&q=75" \
  | grep -iE 'content-type|content-length|cache|x-vercel-cache'
# Expect: content-type: image/avif, content-length well under 300000,
#          x-vercel-cache: HIT on the second request.
```

Then: Lighthouse (mobile, 4G throttling) on the deployed URL — not on `npm run dev`,
which is never representative. Read "Largest Contentful Paint element" and the LCP
sub-phases (TTFB / load delay / load time / render delay); they tell you whether the
problem is discovery, transfer or rendering.

**Fix.**

- Add `priority` to the hero `<Image>` **and nothing else**. Marking several images
  `priority` makes them compete and can make LCP worse.
- Provide accurate `sizes` (e.g. `sizes="100vw"` for a full-bleed hero) so mobile
  fetches a mobile-sized variant.
- Reduce `quality` (try 70–75). On a large photograph, AVIF at q70 is usually
  indistinguishable and dramatically smaller.
- Downscale the source asset — there is no value in a 4000px source for a 1920px
  maximum render.
- Replace any bare `<img>` or CSS `background-image` hero with `next/image`. A CSS
  background cannot be preloaded, optimised or prioritised, and it is the usual reason
  a "properly optimised" hero is still slow.
- Self-host fonts with `next/font` and `display: swap` so text paints immediately.
- Verify `x-vercel-cache: HIT` on repeat requests. If it is always `MISS`, the URL is
  varying (changing `w`/`q` per render) and nothing caches.
- Confirm with real-user data (Vercel Speed Insights p75), not only lab Lighthouse —
  NFR-1 is a field metric.

---

## 9. Deploy smoke check fails on `/api/health`

**Symptom.** The `Smoke check /api/health` step logs six attempts and fails:

```text
Attempt 1: GET https://noblepath.lk/api/health -> 404
...
Error: Smoke check failed: /api/health did not return 200.
```

**Likely causes.**

| Observed code | Meaning |
| --- | --- |
| `404` | **The route does not exist.** `app/api/health/route.ts` has not been implemented — this is currently the expected outcome (`deployment.md` §11, action 2). |
| `000` | DNS does not resolve, TLS failed, or `DEPLOY_BASE_URL` is wrong/unset. |
| `401` / `403` | Vercel deployment protection is enabled on the environment, so the runner cannot reach it. |
| `500` | The app deployed but crashes on startup — usually a missing required environment variable. |
| `200` only after several attempts | Normal cold start; not a failure. |

**Diagnosis.**

```bash
curl -i https://staging.noblepath.lk/api/health
curl -sI https://staging.noblepath.lk | head -1
dig +short staging.noblepath.lk

# Is the route in the repository at all?
ls -la app/api/health/ 2>/dev/null || echo "health route MISSING"
```

Check the GitHub Actions run log for the `DEPLOY_BASE_URL` the step actually used, and
check the Vercel function logs for the deployment.

**Fix.**

- `404` → implement `app/api/health/route.ts` (Full-Stack Engineer). It must return
  200 with a minimal JSON body and `Cache-Control: no-store`. It must **not** expose
  build IDs, environment variable values, dependency versions or internal hostnames —
  it is a public endpoint.
- `000` → correct the `DEPLOY_BASE_URL` environment variable on the GitHub
  Environment, or wait for DNS to propagate.
- `401`/`403` → disable deployment protection for the environment, or use the
  deployment URL returned by the CLI instead of the alias.
- `500` → check the Vercel runtime logs for the missing variable; cross-reference
  `docs/deployment/environment.md` §2.

**If this fails on a production deploy, the deployment is live and unhealthy.
Roll back now** — `docs/deployment/rollback.md`.

---

## 10. Docker build fails copying `.next/standalone`

**Symptom.**

```text
failed to compute cache key: failed to calculate checksum of ref ...
"/app/.next/standalone": not found
```

**Likely cause.** `next.config.ts` does not set `output: "standalone"`, so
`next build` never emits `.next/standalone`. This is currently **expected** — the
Dockerfile documents it in its header.

**Diagnosis.**

```bash
grep -n "output" next.config.ts || echo "output: standalone NOT set"
npm run build && ls -la .next/standalone 2>/dev/null || echo "standalone output absent"
```

**Fix.** Add one line to `nextConfig` in `next.config.ts` (owned by the Full-Stack
Engineer — DevOps must not edit it):

```ts
const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  // ...
};
```

Then rebuild. Note that this has no effect on the Vercel deployment path; it only
enables the container escape hatch.

**Related container symptoms:**

- *Container starts, but every page is unstyled and 404s on `/_next/static/*`* — the
  `.next/static` COPY was skipped. Standalone output deliberately excludes
  `public/` and `.next/static`; both must be copied separately (the Dockerfile does).
- *`HEALTHCHECK` reports `unhealthy` although the site works* — `/api/health` does not
  exist yet (§9).
- *Permission errors writing at runtime* — the image runs as non-root `nextjs`
  (uid 1001) by design. The app should not write to the filesystem at runtime.

---

## 11. Booking enquiries succeed but nobody receives them

**Symptom.** The form returns a reference code (FR-5.4) and the visitor believes the
enquiry was sent. No email arrives at the bookings mailbox.

**This is the highest-impact failure on the project.** There is no database
(ADR-002): the enquiry exists only in that request and that email. If the email is not
delivered, **the lead is permanently gone** — no queue, no retry, no dead-letter store.

**Likely causes.**

1. `BOOKINGS_NOTIFICATION_EMAIL` is unset or wrong in that environment. There is no
   fallback address, and there is currently no startup validation
   (`environment.md` §7, gap 1) — so it fails silently.
2. It was changed in Vercel but the deployment was **not redeployed** — environment
   variable changes do not apply to an already-running deployment.
3. The email provider is rejecting or silently dropping the message (SPF/DKIM not
   configured for the sending domain, or the provider is in sandbox mode).
4. Messages are being delivered to the spam folder.
5. Send failures are not surfaced — the route returns 200 regardless of the send
   outcome.
6. Staging is pointed at the **real** bookings mailbox and someone changed it to stop
   test noise, without changing production back.

**Diagnosis.**

```bash
# Confirm the variable is set for the right environment (never print the value
# into a shared channel).
# Vercel dashboard → Project → Settings → Environment Variables → Production scope.

# Submit a probe and check the runtime logs for the send outcome.
curl -i -X POST https://staging.noblepath.lk/api/bookings \
  -H 'content-type: application/json' \
  -d '{"name":"probe","email":"probe@example.com","partySize":2,"notes":"smoke test"}'
```

Then check the Vercel function logs for that invocation and the email provider's
delivery log for the message. Check the spam folder before concluding it was not sent.

**Fix.**

- Set the variable correctly for the environment and **redeploy**.
- Configure SPF and DKIM for the sending domain with the provider.
- **Required improvements** (Full-Stack Engineer):
  - Validate required environment variables at startup with Zod and fail loudly in
    production when one is missing (`environment.md` §7, gap 1).
  - Log the send outcome per reference code so this failure is visible in logs rather
    than only in the absence of emails.
  - Consider persisting or queueing enquiries in v1.1 so a provider outage is
    recoverable (`infrastructure-architecture.md` §9, action 9).
- Notify the Noble Path owner with the exact outage window so lost leads can be
  reasoned about (`rollback.md` §7).

---

## 12. Production deploy job sits in "Waiting" forever

**Symptom.** `Deploy to production (requires approval)` shows *Waiting* and never
starts. No checkout, no logs.

**This is correct behaviour, not a fault.** The `production` GitHub Environment has
required reviewers; GitHub suspends the job until a reviewer approves. No secret is
decrypted and nothing touches Vercel until then
(`deployment.md` §3.3).

**Diagnosis.**

- Open the workflow run — GitHub shows who can approve it.
- Confirm a required reviewer received the notification and is available.
- If "prevent self-review" is enabled, the person who dispatched the run cannot
  approve it.

**Fix.** Ask a required reviewer to review the change against the pre-deploy checklist
(`deployment.md` §6.1) and click **Approve and deploy**.

**Do not** remove the `environment:` key from the job, remove reviewers, or add a
bypass path. That gate is the implementation of Fortechz principle 3 — *never modify
production without approval*. If it is blocking legitimate releases too often, the fix
is **more approvers**, not fewer controls.

**Related:** if the run fails immediately with *"Production deploys must run from
main"*, it was dispatched from a feature branch. Merge to `main` first.

---

## 13. Adding an entry to this runbook

Add an entry whenever an incident reveals a failure mode not described here —
**especially** if diagnosis took more than a few minutes. Use the same
symptom → likely cause → diagnosis → fix structure, with real commands rather than
descriptions of commands. A runbook entry written while the details are fresh is worth
more than a post-incident summary written a week later.

---

## 14. Change log

| Date | Change | By |
| --- | --- | --- |
| 2026-09-19 | Initial runbook: build failures, audit gate, Tailwind v4/PostCSS, `next/image` remote patterns, CSP, rate limiter, hydration, LCP, smoke check, Docker standalone, undelivered enquiries, approval gate. | DevOps Engineer |
