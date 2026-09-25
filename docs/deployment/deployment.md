# Noble Path — Deployment

**Project:** Noble Path
**Owner:** Fortechz — DevOps Engineer
**Status:** Proposed and approved for v1 build
**Last updated:** 2026-09-19

---

> ## Current status — read this first
>
> **Nothing described here is live yet.** At the time of writing:
>
> - This project is **not yet a Git repository** and has no GitHub remote.
> - **No Vercel project exists.** No GitHub Environments exist. No secrets are set.
> - **No DNS records exist** for `noblepath.lk` or any other domain.
> - `app/api/health/route.ts` **does not exist yet** — the smoke check and the
>   container `HEALTHCHECK` both depend on it (see §11 Required actions).
>
> This document is the **approved v1 design and the procedure to follow once the
> infrastructure is created**. It is not a record of running systems. When the
> infrastructure is created, update this banner to say so and record the actual
> project/account identifiers here.

---

## 1. Platform recommendation

### Recommendation: **Vercel**, with the `Dockerfile` maintained as a portability escape hatch.

Deploy Noble Path v1 to Vercel. Keep the container image in the repository and keep
it building in CI, so that the hosting decision is reversible, but do not run the
container in production for v1.

### Why

Noble Path v1 is a Next.js 16 App Router site with **no database**, editorial content
compiled into the bundle as typed TypeScript, one public write endpoint
(`/api/bookings`), and an explicit performance budget (NFR-1 LCP ≤ 2.5s on 4G mobile,
NFR-9 hero payload ≤ 300KB). That shape makes the decision unusually clear-cut.

| Factor | Why it favours Vercel |
| --- | --- |
| **No database** | The single strongest argument for a container platform — running your app next to your data in one VPC, with connection pooling you control — does not apply. There is no data tier to be near. |
| **Next.js 16 fidelity** | App Router streaming, Partial Prerendering, Server Actions and route-segment caching are developed against Vercel's runtime. On a self-managed container you own the gap between `next start` semantics and the framework's assumptions on every minor release. |
| **`next/image` optimisation** | Vercel provides image optimisation and an image CDN as managed infrastructure. Self-hosted, `next/image` optimisation runs `sharp` **in your app process** — it is CPU- and memory-hungry, it is the thing most likely to OOM a small container, and it means sizing the app tier for image transcoding rather than for HTML. Noble Path is photography-led; this is the dominant workload. |
| **NFR-1 / global audience** | Inbound tourists browse from Europe, India, Australia and East Asia. Vercel gives a global edge PoP network and a static asset CDN with no work. Matching that on a container platform means a separate CDN (CloudFront/Cloudflare), its own cache-invalidation logic, and its own failure mode. |
| **Team size** | Fortechz has no dedicated platform on-call for this project. Vercel removes patching, TLS renewal, autoscaling and node management from scope entirely. |
| **Preview deployments** | Every PR gets a real URL. The UI/UX Designer can review the cinematic hero against the approved spec on a real device, on real bandwidth, before merge. This is a genuine quality control for a design-led site, not a convenience. |
| **Cost at v1 traffic** | A marketing/planning site with enquiry-based bookings sits comfortably in Vercel's low tiers. A container platform costs an always-on app tier plus CDN plus load balancer plus monitoring before the first visitor arrives. |

### Why not a container platform (AWS ECS / Fly.io / Cloud Run / Kubernetes) for v1

Not because it would not work — it would. Because for **this** application it buys
control the project does not currently need and charges for it in operational surface
area: base-image CVE patching, image optimisation capacity planning, a separately
managed CDN, TLS certificate lifecycle, autoscaling policy, and a deployment/rollback
mechanism the team has to build rather than click.

The one real cost of choosing Vercel is **vendor lock-in**, and it is mitigated
directly: the application uses no Vercel-proprietary API, and the committed
`Dockerfile` produces a standalone image that runs anywhere. Migration is a deployment
change, not a rewrite.

### When to revisit this decision

Move to a container platform if **any** of these become true:

1. Bookings gain a datastore that must live in a private network (see
   `docs/architecture/infrastructure-architecture.md` §8).
2. Data-residency or procurement rules require Sri Lankan or EU-only hosting.
3. Image optimisation or function invocation cost overtakes the cost of running a
   container tier.
4. The project needs long-running work (batch itinerary generation, scheduled
   supplier syncs) that does not fit a request-scoped serverless model.

This decision is recorded in `docs/decisions/architecture-decisions.md` (ADR to be
added by whoever owns that file — see §11).

---

## 2. Environments

Three environments. Two of them are real deployments; the third is a laptop.

| Environment | Purpose | URL (planned) | Deploy trigger | Approval | Data |
| --- | --- | --- | --- | --- | --- |
| **Local** | Development | `http://localhost:3000` | `npm run dev` | None | None |
| **Staging** | Integration, design review, pre-production verification | `https://staging.noblepath.lk` | Automatic on push to `main`; manual dispatch | None | None |
| **Production** | Public site | `https://noblepath.lk` (+ `www` redirect) | **Manual dispatch only** | **Required human reviewer** | None |
| _Preview_ | Per-PR review builds | `https://<hash>-noble-path.vercel.app` | Automatic per PR (Vercel Git integration) | None | None |

### Environment parity

All four run the **same build command and the same Node 24 runtime**. They differ only
in the values of the environment variables listed in
`docs/deployment/environment.md`. There is deliberately no `NODE_ENV=staging` — Next.js
recognises only `development`, `production` and `test`; staging runs a **production**
build so that what is verified is what ships.

The one parity gap you must know about: **staging and preview are not behind the same
robots policy as production**. Staging must be `noindex` (see §9) or it will compete
with production in search results.

The second parity gap: **the booking rate limiter is in-memory and per-instance**
(NFR-8). It is shared by `/api/bookings` and `/api/rides` (one budget per client) only
within a single process — see infrastructure architecture §7. On serverless, each concurrent instance has its own counter, so the effective
limit is `BOOKING_RATE_LIMIT_MAX × active instances`, not `BOOKING_RATE_LIMIT_MAX`.
This is a known v1 limitation, documented in
`docs/troubleshooting/troubleshooting.md` §6 and in the infrastructure architecture.

---

## 3. One-time setup (must be done before the first deploy)

These steps create the infrastructure this document assumes. They have **not** been
performed. They require a human with access to the Fortechz GitHub organisation, the
Vercel team account and the domain registrar.

### 3.1 Repository

1. `git init`, commit the current tree, push to the Fortechz GitHub organisation.
2. Set the default branch to `main`.
3. Branch protection on `main`:
   - Require a pull request before merging, 1 approval minimum.
   - Require status checks to pass: `Typecheck, lint, build` and `Dependency audit`.
   - Require branches to be up to date before merging.
   - Do not allow force pushes or deletions.
4. Confirm `.gitignore` excludes `.env*.local` (it does) and that **no `.env.local`,
   no `.env`, and no `untitled folder/` content was committed**. Verify with
   `git ls-files | grep -Ei '\.env|untitled'` — expect no output.

### 3.2 Vercel project

1. Create the Vercel project in the Fortechz team, linked to the GitHub repository.
2. Framework preset: **Next.js**. Do not override the build command; leave it as
   `npm run build`. Install command `npm ci`.
3. Node.js version: **24.x**.
4. Set environment variables per environment exactly as specified in
   `docs/deployment/environment.md` §3.
5. **Disable Vercel's automatic production deployment from Git.** In
   Settings → Git, set *Production Branch* to a branch that is never pushed
   (e.g. `production-disabled`), or disable the Git integration for production.
   Production must deploy **only** through `.github/workflows/deploy.yml`, because
   that is where the approval gate lives. If Vercel also auto-deploys `main` to
   production, the approval gate is bypassable and therefore worthless.
6. Leave preview deployments enabled for pull requests.

### 3.3 GitHub Environments — the approval gate

This is the control that implements Fortechz principle 3 (*never modify production
without approval*). Configure it carefully; the workflow depends on it.

**Settings → Environments → New environment → `staging`**

- Deployment branches: `main` only (*Selected branches and tags*).
- No required reviewers.
- Environment **secrets**: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` —
  the staging-scoped values.
- Environment **variable**: `DEPLOY_BASE_URL = https://staging.noblepath.lk`.

**Settings → Environments → New environment → `production`**

- Deployment branches: `main` only.
- **Required reviewers: ON.** Add at least two named individuals or a team
  (the Noble Path release approvers). Two so that one person's absence does not
  block an emergency release.
- **"Prevent self-review": ON** where available — the person who triggered the
  deploy should not be the person who approves it.
- Wait timer: 0 minutes (the human reviewer *is* the delay).
- Environment **secrets**: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` —
  the production-scoped values.
- Environment **variable**: `DEPLOY_BASE_URL = https://noblepath.lk`.

Secrets are set **at the environment level, never at the repository level**. This is
what guarantees that a staging deploy cannot pick up a production token: the
`deploy-staging` job only ever resolves `secrets.*` against the `staging` environment.

**How the gate behaves at runtime:** when someone dispatches `Deploy` with
`target=production`, the `verify` job runs, then `deploy-production` enters
*Waiting* state. GitHub notifies the required reviewers. No checkout happens, no
secret is decrypted, nothing touches Vercel until a reviewer clicks **Approve and
deploy**. The approval, the approver and the timestamp are recorded in the run's
deployment history and are auditable afterwards.

**Verifying the gate works (do this once, before the first real production deploy):**
dispatch `target=production` from `main` and confirm the run pauses at *Waiting*
without performing a checkout. Then reject it. Record the result in
`docs/testing/test-results.md`.

### 3.4 Vercel token scope

`VERCEL_TOKEN` must be a team token scoped to the Noble Path project only, not a
personal account-wide token. Set an expiry (recommended: 90 days) and put the
rotation date in the team calendar. Rotation procedure:
`docs/deployment/environment.md` §5.

---

## 4. Local deployment (development)

```bash
# Node 24 required — check with `node -v`.
npm ci                       # never `npm install`; the lockfile is authoritative
cp .env.example .env.local   # then fill in the values
npm run dev                  # http://localhost:3000
```

To reproduce a production build locally — **always do this before opening a release PR**:

```bash
npm run typecheck
npm run lint
npm run build
npm start                    # serves the production build on :3000
```

To exercise the container path (requires Docker, and requires the
`output: "standalone"` change described in §11):

```bash
docker build -t noble-path:local .
docker run --rm -p 3000:3000 \
  -e NEXT_PUBLIC_SITE_URL=http://localhost:3000 \
  -e BOOKINGS_NOTIFICATION_EMAIL=dev@example.com \
  noble-path:local
curl -i http://localhost:3000/api/health     # expect 200
docker inspect --format '{{.State.Health.Status}}' <container-id>   # expect "healthy"
```

---

## 5. Staging deployment

**Trigger:** merge to `main`, or Actions → Deploy → Run workflow → `target=staging`.

**What runs:**

1. `verify` — typecheck, lint, production build, `npm audit --audit-level=high`.
   Any failure stops here; nothing is deployed.
2. `deploy-staging` — installs the Vercel CLI and runs `vercel deploy`.
3. Smoke check — polls `https://staging.noblepath.lk/api/health` up to six times
   over ~60s and fails the job on any non-200.

**Expected duration:** 4–7 minutes.

**After deploy, manually verify** (staging is where design and accessibility review
happens — the pipeline cannot check these):

- Home page hero renders and LCP is acceptable on a throttled 4G profile (NFR-1).
- Destination, experience and trip listing pages load and filters work.
- The itinerary builder persists a plan across a page reload (FR-4.4).
- A booking enquiry submits and returns a reference code (FR-5.4); an invalid one
  returns field-level errors (FR-5.3).
- No CSP violations in the browser console (fonts and Unsplash images in particular).
- Keyboard-only navigation works across the primary flows (FR-7.3).

---

## 6. Production deployment

> **Production deploys are manual, approved and auditable. There is no automatic
> path from a commit to production.**

### 6.1 Pre-deploy checklist

Complete every line before dispatching. If any line cannot be ticked, do not deploy.

```text
[ ] Change is merged to `main` and CI is green on that exact commit
[ ] The same commit is deployed to staging and has been verified there (§5)
[ ] `npm audit --audit-level=high` is clean, or every finding is recorded and
    accepted in docs/security/vulnerabilities.md
[ ] No new environment variable is required, OR it is already set in the Vercel
    production environment AND documented in docs/deployment/environment.md
[ ] No secret appears in the diff (`git diff` reviewed for keys, tokens, .env files)
[ ] Security-sensitive changes have been reviewed by the Cybersecurity Engineer
[ ] Infrastructure-affecting changes have been reviewed by the DevOps Engineer
[ ] UI changes match the approved UI/UX specification
[ ] docs/ is updated to match the implementation (Fortechz documentation policy)
[ ] Rollback path is understood and docs/deployment/rollback.md is current
[ ] A named approver is available for the next 30 minutes
[ ] Not deploying into a high-traffic window or immediately before the team goes offline
```

### 6.2 Procedure

1. Confirm `main` is at the commit you intend to ship: `git log --oneline -1`.
2. GitHub → **Actions** → **Deploy** → **Run workflow**.
   - Branch: `main` (the workflow refuses anything else for production).
   - `target`: `production`.
3. `verify` runs. If it fails, stop — the problem is in the code, not the deploy.
4. The run pauses at **Waiting** on `Deploy to production (requires approval)`.
5. The approver reviews the diff and this checklist, then clicks
   **Approve and deploy**. *The approver is accepting responsibility for the
   change reaching the public site — this is the Fortechz human-approval step.*
6. `vercel deploy --prod` runs; the smoke check confirms `/api/health` returns 200.
7. Post-deploy verification, within 10 minutes:
   - Load `https://noblepath.lk` — hero renders, no console errors.
   - Submit a test booking enquiry end to end and confirm the notification arrives
     at `BOOKINGS_NOTIFICATION_EMAIL`.
   - Check the Vercel dashboard for a 5xx spike or a function error spike.
   - Confirm `https://www.noblepath.lk` redirects to the apex.
8. Announce in the team channel: what shipped, the commit SHA, who approved.
9. If anything is wrong → **`docs/deployment/rollback.md`**. Roll back first,
   diagnose afterwards.

### 6.3 Emergency deploys

There is no bypass. An urgent fix still goes: branch → PR → CI green → merge to
`main` → staging → dispatch production → approval. If the site is *down*, the correct
first action is **rollback, not a forward fix** — rollback on Vercel is near-instant
and needs no build.

---

## 7. DNS and TLS

**Planned, not yet configured.** Domain: `noblepath.lk` (registrar TBC — record it
here once purchased).

| Record | Type | Value | Purpose |
| --- | --- | --- | --- |
| `noblepath.lk` | A | `76.76.21.21` (Vercel apex; **confirm the current value in the Vercel dashboard at the time of configuration — do not copy it from this document**) | Apex → production |
| `www.noblepath.lk` | CNAME | `cname.vercel-dns.com` | Redirects to apex |
| `staging.noblepath.lk` | CNAME | `cname.vercel-dns.com` | Staging |
| `noblepath.lk` | CAA | `0 issue "letsencrypt.org"` | Restricts who may issue certificates |

Rules:

- **DNS changes are destructive and require explicit human approval.** A wrong apex
  record takes the site down globally and the fix is gated by TTL. Never change DNS
  as a side effect of another task.
- Set TTL to **300s while making changes**, then raise to 3600s once stable. Do this
  *before* the change, and allow the old TTL to expire first.
- **TLS is managed by Vercel** (automatic Let's Encrypt issuance and renewal). There
  is no manual certificate process and no renewal to diarise.
- HSTS is already set by the application with `max-age=63072000; includeSubDomains;
  preload` (`next.config.ts`). **Consequence:** every current and future subdomain of
  `noblepath.lk` must serve valid HTTPS. Do not point a subdomain at anything
  HTTP-only. Preload submission is effectively irreversible on a two-year horizon —
  treat it as a one-way door and get approval before submitting to the preload list.
- Redirect `www` → apex (not the reverse) so canonical URLs, `NEXT_PUBLIC_SITE_URL`
  and Open Graph tags all agree (FR-7.2).

---

## 8. CDN and caching behaviour

Noble Path is photography-led (NFR-9: hero ≤ 300KB delivered), so cache behaviour is
a performance requirement, not a detail.

| Asset class | Served from | Cache policy | Notes |
| --- | --- | --- | --- |
| Build output `/_next/static/*` | Edge CDN | `public, max-age=31536000, immutable` | Content-hashed filenames; safe to cache forever. Set by Next.js, do not override. |
| Optimised images `/_next/image?...` | Vercel image optimisation + CDN | Long-lived, keyed on source URL + width + quality + format | First request per variant transcodes (slow); subsequent requests are cache hits. |
| Files in `public/` | Edge CDN | `public, max-age=0, must-revalidate` by default | **Not content-hashed.** Replacing `public/images/hero/sigiriya-sunrise.jpg` in place with the same filename risks stale intermediary caches. Prefer a new filename on change. |
| Static/prerendered pages | Edge CDN | Cached, revalidated per route segment config | Destinations, experiences, trips and About are static content (ADR-002) and should be statically rendered. |
| `/bookings` page | App runtime (dynamic) | Not prerendered; rendered per request | Since D-24 the page reads `searchParams` (`?service=ride` preselects the ride form), which opts it out of static rendering. Every visit invokes the app runtime. Acceptable at v1 traffic (the page does no I/O beyond bundled content), but it is the conversion page, so watch its p95/LCP after deploy. |
| `/api/bookings`, `/api/rides` | App runtime | `no-store` — must never be cached | A cached write endpoint is a correctness *and* security bug. Applied to every `/api/:path*` route by `next.config.ts`, so both endpoints are covered. |
| `/api/health` | App runtime | `no-store` | A cached health check reports the health of the past. |

Guidance for whoever implements the image components:

- Always use `next/image`, never a bare `<img>`, for photography. `formats:
  ["image/avif", "image/webp"]` is already configured, and AVIF is what gets NFR-9
  under 300KB.
- The hero image must be `priority` (preloaded) — it is the LCP element. Everything
  below the fold must not be.
- Always give explicit `width`/`height` or `fill` with a sized container, or CLS
  (NFR-2 ≤ 0.1) will fail.
- Remote images are restricted to `images.unsplash.com` by `next.config.ts`
  `remotePatterns`. Adding a host is a security-relevant change (it widens both
  the optimiser's SSRF surface and the CSP `img-src`): it needs a Cybersecurity
  Engineer review and a matching CSP update in the same change.

### Cache invalidation

A Vercel deployment produces a new immutable build with new asset hashes; there is no
manual purge step for build output. `public/` files keep their paths across deploys —
if you replace one in place and clients still see the old version, change the filename.

---

## 9. Keeping staging out of search results

Staging serves the same content as production. Without a robots policy it will be
indexed and will cannibalise production's search results.

Required (Full-Stack Engineer — see §11): the app must emit `X-Robots-Tag: noindex,
nofollow` (or a `noindex` robots response) on every environment where
`NEXT_PUBLIC_SITE_URL` is not the production URL. Do **not** rely on committing a
`robots.txt` that blocks everything, because that file would then also ship to
production.

---

## 10. Monitoring after deploy

Detailed alert thresholds live in
`docs/architecture/infrastructure-architecture.md` §6. In short, after any deploy watch:

- 5xx rate on the app runtime
- p95 response time
- function error rate on `/api/bookings` and `/api/rides`
- 429 rate on `/api/bookings` + `/api/rides` combined (one shared limit; a spike means
  either an attack or a misconfigured limit)
- p95 / LCP of `/bookings`, now dynamically rendered (D-24)
- Core Web Vitals for the home page (NFR-1, NFR-2, NFR-3)

---

## 11. Required actions owned by other agents

These are prerequisites for the pipeline and the container image. The DevOps Engineer
does not own these files and has not modified them.

| # | Action | File | Owner | Blocking |
| --- | --- | --- | --- | --- |
| 1 | Add `output: "standalone"` to `nextConfig` | `next.config.ts` | Full-Stack Engineer | **Done** — `next.config.ts` now sets it. (The precondition comment at the top of `Dockerfile` is stale and should be trimmed.) |
| 2 | Implement a health route returning 200 with a small JSON body, `no-store`, no secrets and no internal version detail | `app/api/health/route.ts` | Full-Stack Engineer | **Deploy smoke check and container HEALTHCHECK — blocking for both** |
| 3 | Emit `noindex` on non-production environments (§9) | app layer | Full-Stack Engineer | Blocking for production launch |
| 4 | Record the hosting decision as an ADR (Vercel over containers, §1) | `docs/decisions/architecture-decisions.md` | Orchestrator / owning agent | Fortechz policy |
| 5 | Set `Cache-Control: no-store` on `/api/bookings` and `/api/health` | app layer | Full-Stack Engineer | Correctness — **`/api/bookings` done (D-23)**, via a `/api/:path*` header rule in `next.config.ts` rather than a route-specific one, so `/api/health` will inherit it for free once item 2 builds that route. Item 2 itself is still open. |
| 6 | Remove or relocate `untitled folder/` before the repository is pushed | repo root | Human | Hygiene — it is git-ignored and docker-ignored, but it is unlicensed photography sitting in the project root |

---

## 12. Change log

| Date | Change | By |
| --- | --- | --- |
| 2026-09-19 | Initial deployment design: Vercel recommendation, CI/CD pipelines, GitHub Environment approval gate, container escape hatch, DNS/TLS and caching plan. Nothing provisioned. | DevOps Engineer |
| 2026-09-23 | `POST /api/bookings` built and delivery connected (D-23). Closed §11 item 5 for `/api/bookings` (the `/api/health` half stays open with item 2). Production `next build` now requires `RESEND_API_KEY` and `BOOKINGS_NOTIFICATION_EMAIL` to be set — this was already the documented intent but had never actually been enforced before this change (see `docs/deployment/environment.md` §7 item 1). | Full-Stack Engineer |
| 2026-09-25 | D-24: `POST /api/rides` added alongside `/api/bookings` (shared pipeline, env vars, rate limit; `no-store` via the existing `/api/:path*` rule — no config change needed). `/bookings` is now dynamically rendered. Updated §2, §8, §10; marked §11 item 1 done. No CI, Dockerfile or env change required. | DevOps Engineer |
