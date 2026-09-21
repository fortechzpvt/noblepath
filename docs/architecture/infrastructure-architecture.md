# Noble Path — Infrastructure Architecture

**Project:** Noble Path
**Owner:** Fortechz — DevOps Engineer
**Status:** Proposed and approved for v1 build
**Last updated:** 2026-09-19

---

> **Status note — this is a design, not an inventory.**
>
> No infrastructure has been provisioned. There is no Vercel project, no GitHub
> repository, no DNS zone and no monitoring. Every component described below is the
> **approved v1 target design**. Do not read this document as a record of running
> systems. Update this banner when the infrastructure exists.

---

## 1. Shape of the system

Noble Path v1 is deliberately small. Understanding *why* is more useful than the
diagram.

The application is a Next.js 16 App Router site. Its content — destinations,
experiences, packages — is **typed TypeScript in the repository**, compiled into the
build (ADR-002). There is **no database, no object store, no cache tier, no message
queue and no authentication system**, because v1 has no user accounts (out of scope
§6), no payments (assumption §7.1) and no user-generated content.

The consequences are worth stating plainly, because they shape everything else here:

- **There is no persistent state to protect, back up, or restore.** The recovery
  story is "redeploy the build".
- **The trust boundary is unusually simple:** one public write endpoint
  (`/api/bookings`), and one outbound integration (email notification).
- **The primary risk is not data loss — it is silent loss of booking enquiries.**
  An enquiry that fails has nowhere to go: no queue, no retry, no dead-letter store.
- **Most pages can be static**, which is how NFR-1 (LCP ≤ 2.5s on 4G mobile) is met
  for a global audience without a multi-region application tier.

---

## 2. Runtime topology

```text
                     Visitor (Europe / India / Australia / SE Asia)
                                      │
                                      │ HTTPS only (HSTS, 2yr, includeSubDomains)
                                      ▼
    ┌──────────────────────────────────────────────────────────────────────┐
    │  TRUST BOUNDARY 1 — the public internet ends here                    │
    │  Vercel Edge Network (global PoPs)                                   │
    │   • TLS termination (managed Let's Encrypt, auto-renewed)            │
    │   • Static asset CDN  /_next/static/*  (immutable, 1yr)              │
    │   • Cached prerendered HTML for static routes                        │
    │   • Platform-level DDoS absorption                                   │
    │   • Security response headers from next.config.ts travel with        │
    │     every response (CSP, HSTS, X-Frame-Options, COOP, ...)           │
    └───────────────┬───────────────────────────────┬──────────────────────┘
                    │ cache MISS / dynamic          │ /_next/image?...
                    ▼                               ▼
    ┌───────────────────────────────┐   ┌───────────────────────────────────┐
    │ APP RUNTIME                   │   │ IMAGE OPTIMISATION                │
    │ Next.js 16 server, Node 24    │   │ Managed by Vercel                 │
    │                               │   │  • resize + AVIF/WebP transcode   │
    │  • React Server Components    │   │  • source allow-list:             │
    │  • Static + streamed HTML     │   │    images.unsplash.com only       │
    │  • /api/bookings  (POST)      │   │    (next.config.ts remotePatterns)│
    │  • /api/health    (GET)       │   │  • result cached at the edge      │
    │  • Zod validation (NFR-7)     │   └───────────────────────────────────┘
    │  • In-memory rate limit(NFR-8)│
    │  • NO database connection     │
    └───────────────┬───────────────┘
                    │ TRUST BOUNDARY 2 — outbound to a third party
                    ▼
    ┌───────────────────────────────┐        ┌────────────────────────────┐
    │ EMAIL DELIVERY (provider TBC) │        │ ORIGIN CONTENT             │
    │  • booking enquiry → staff    │        │  • public/  (owned photos) │
    │    at BOOKINGS_NOTIFICATION_  │        │  • content/ (typed TS,     │
    │    EMAIL                      │        │    compiled into the build)│
    │  • fire-and-forget in v1      │        │  • images.unsplash.com     │
    └───────────────────────────────┘        │    (licensed stock)        │
                                             └────────────────────────────┘

    DELIVERY PIPELINE (separate control plane, not in the request path)
    ┌──────────────────────────────────────────────────────────────────────┐
    │ GitHub repo → Actions CI (typecheck/lint/build/audit)                │
    │             → Actions Deploy → staging (auto)                        │
    │             → Actions Deploy → production (HUMAN APPROVAL GATE)      │
    └──────────────────────────────────────────────────────────────────────┘
```

### Components

| Component | Technology | Managed by | Scaling | Notes |
| --- | --- | --- | --- | --- |
| Edge / CDN | Vercel Edge Network | Vercel | Automatic, global | Serves static assets and cached HTML. Most visitor requests never reach the app runtime. |
| App runtime | Next.js 16 on Node 24 | Vercel | Automatic, request-driven | Stateless. Instances are ephemeral — this is why the rate limiter is weak (§7). |
| Image optimisation | Vercel Image Optimization | Vercel | Automatic | AVIF/WebP. The workload that would dominate a self-hosted deployment. |
| Static assets | `public/` + build output | Vercel CDN | n/a | Build output is content-hashed; `public/` files are not. |
| Content | TypeScript in `content/` | Git | n/a | Deploy = content release. No CMS in v1. |
| Email | Provider TBC | TBC | n/a | **Not yet chosen — see §9 required actions.** |
| CI/CD | GitHub Actions | GitHub | n/a | `.github/workflows/ci.yml`, `.github/workflows/deploy.yml` |
| Container image | `Dockerfile`, `node:24-alpine` | Fortechz | n/a | Portability escape hatch. Not used in v1 production. |
| DNS | Registrar TBC | TBC | n/a | See `docs/deployment/deployment.md` §7 |

---

## 3. Request-path walkthroughs

### 3.1 Visitor loads the home page (the NFR-1 path)

1. DNS resolves `noblepath.lk` to the Vercel anycast address; the visitor is routed
   to their nearest PoP.
2. TLS handshake terminates at the edge. HSTS means the browser never attempts HTTP
   after the first visit.
3. The edge checks its cache for the prerendered home page HTML. **Cache hit → HTML
   is returned from the PoP. The app runtime is not invoked.** This is the common case
   and the reason a single-region application tier is acceptable for a global audience.
4. On a miss, the request reaches the app runtime, which renders the React Server
   Component tree and streams HTML back. The result is cached at the edge.
5. Response headers from `next.config.ts` are attached: CSP, HSTS, `X-Frame-Options:
   DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`,
   `Cross-Origin-Opener-Policy`. `X-Powered-By` is suppressed.
6. The browser parses the HTML and requests the hero image via `/_next/image`. First
   request for that variant transcodes to AVIF/WebP; every subsequent request is an
   edge cache hit. **This is the LCP element.** It must be `priority` so it is
   preloaded, and it must be ≤ 300KB delivered (NFR-9).
7. `/_next/static/*` chunks are fetched with `immutable` caching.
8. Hydration. The CSP blocks any script not from `'self'`.

**Where this path fails:** the first-ever request for an image variant is slow
(cold transcode). If the hero is the first thing anyone loads after a deploy, that
visitor pays the transcode cost. See troubleshooting §8.

### 3.2 Visitor submits a booking enquiry (the security path)

1. `POST /api/bookings` from the browser. CSP `form-action 'self'` and
   `connect-src 'self'` prevent the form from being posted cross-origin.
2. The request always reaches the **app runtime** — never cached, never served from
   the edge.
3. The **rate limiter** checks the caller against `BOOKING_RATE_LIMIT_MAX` per
   `BOOKING_RATE_LIMIT_WINDOW_MS` (NFR-8). Over limit → `429`.
4. **Zod validates the body server-side** (NFR-7, FR-5.3). Invalid → `400` with
   field-level errors. Client-side validation is a convenience only; this is the
   control.
5. Valid → a reference code is generated and the enquiry is emailed to
   `BOOKINGS_NOTIFICATION_EMAIL`.
6. `200` with the reference code (FR-5.4).

**Where this path fails, and why it matters most:** the enquiry exists only in that
HTTP request and that email. If step 5 fails — provider outage, wrong address, unset
variable — the visitor still sees a success code and the lead is **gone**. There is no
database, no queue and no retry. This is the single highest-value reliability gap in
v1 and it is why §6 alerts on `/api/bookings` error rate specifically rather than on
overall 5xx alone.

### 3.3 A change reaches production (the control path)

1. Branch → PR. CI runs typecheck, lint, production build, `npm audit`
   (no secrets; passes on fork PRs). Vercel builds a preview URL.
2. Review and merge to `main` (branch protection requires a green CI and an approval).
3. `deploy.yml` auto-deploys **staging**, then smoke-checks `/api/health`.
4. Production requires a **manual dispatch**. The job declares
   `environment: production`; GitHub suspends it in *Waiting* state.
   **No checkout occurs and no secret is decrypted until a required reviewer
   approves.**
5. On approval: `vercel deploy --prod`, then the smoke check.
6. The approval, approver and timestamp are recorded and auditable.

---

## 4. Network and trust boundaries

| Boundary | Between | Control |
| --- | --- | --- |
| **B1 — Internet → Edge** | Anyone → Vercel PoP | HTTPS only; HSTS preload-eligible; platform DDoS absorption; CAA record restricting certificate issuance |
| **B2 — Edge → App runtime** | Vercel internal | Vercel-managed. Noble Path has **no VPC, no private subnet, no security groups** — there is nothing private to put in one. |
| **B3 — App runtime → Email provider** | Noble Path → third party | Outbound HTTPS/API. Credentials injected as server-only environment variables. Provider not yet chosen. |
| **B4 — App runtime → Unsplash** | Image optimiser → third party | Strict allow-list: `images.unsplash.com` only, in both `next.config.ts` `remotePatterns` **and** the CSP `img-src`. The allow-list is what prevents the optimiser from being used as an SSRF/open-proxy primitive. |
| **B5 — Browser → page content** | Untrusted script execution | CSP: `default-src 'self'`, no `'unsafe-eval'` in production, `object-src 'none'`, `frame-ancestors 'none'`, `base-uri 'self'` |
| **B6 — GitHub Actions → Vercel** | Control plane | Environment-scoped secrets; production credentials only decryptable after human approval; `permissions: contents: read` at workflow level; `persist-credentials: false` on checkout |
| **B7 — Contributor → repository** | Humans → `main` | Branch protection, required CI, required review |

### What deliberately does **not** exist in v1

Stated explicitly so nobody assumes a missing control is an oversight:

- No VPC, private networking, bastion host or SSH access — there are no servers.
- No WAF beyond platform defaults. Reconsider if `/api/bookings` attracts abuse.
- No secrets manager beyond Vercel environment variables and GitHub Environment
  secrets — there are only four application variables, none of which is a credential.
- No authentication or session layer — no accounts in v1.
- No PCI scope — no payments in v1 (requirements §7.1).
- No shared cache or datastore — hence the rate-limiter caveat in §7.

---

## 5. Logging

| Source | Content | Retention | Access |
| --- | --- | --- | --- |
| Vercel runtime logs | App runtime stdout/stderr, function invocations, errors | Platform default (short on lower tiers — **confirm and record the actual retention once the project exists**) | Vercel team members |
| Vercel edge/access logs | Request path, status, cache hit/miss, latency | Platform default | Vercel team members |
| GitHub Actions run logs | Build, test and deploy output; approval records | 90 days default | Repository members |
| Browser console | Client-side errors | Not collected in v1 | n/a |

### Logging rules for application code

- **Never log a secret, a token, or the full `process.env`.**
- **Never log booking enquiry PII in full.** Name, email, phone and arrival date are
  personal data. Log a reference code and an outcome, not the payload. If a payload
  must be logged to diagnose an issue, redact email and phone.
- Log enough to answer "did this enquiry get delivered?" — reference code, timestamp,
  validation result, email-send outcome. Without this, §3.2's failure mode is invisible.
- Log rate-limit rejections (`429`) with a coarse identifier, so a spike is
  attributable.

### Gap

There is **no log aggregation, no structured log search and no retention beyond
platform defaults** in v1. For a site of this size that is a defensible trade, but it
means incident forensics depend on the Vercel dashboard and on logs still being within
the retention window. Revisit when bookings gain a datastore.

---

## 6. Monitoring and alerting

> **Not yet configured.** This is the required alerting baseline, to be implemented
> when the Vercel project is created (§9).

### Alert on

| # | Signal | Threshold | Severity | Why | First response |
| --- | --- | --- | --- | --- | --- |
| 1 | **5xx rate (all routes)** | > 1% of requests over 5 min | **High** | The site is failing for real visitors | Check the last deploy; roll back (`rollback.md`) |
| 2 | **`/api/bookings` error rate** | Any 5xx, or > 2% of submissions over 10 min | **Critical** | **Every failed enquiry is a permanently lost lead — there is no queue or retry (§3.2)** | Roll back immediately; then confirm whether email delivery or validation is at fault |
| 3 | **`/api/bookings` 429 spike** | > 20 in 10 min, or a sharp change from baseline | Medium | Either abuse/spam, or the limit is too tight and real visitors (shared hotel NAT) are being blocked | Inspect source distribution. Many sources → likely abuse. Few sources, many legitimate-looking → raise `BOOKING_RATE_LIMIT_MAX` and see troubleshooting §6 |
| 4 | **p95 response time** | > 1500 ms over 10 min, or 2× the pre-deploy baseline | Medium | Leading indicator of NFR-1 failure | Check cache hit rate and image optimisation volume |
| 5 | **`/api/health` non-200** | 2 consecutive failures from an external check, 1-min interval | **Critical** | The app runtime is down | Roll back |
| 6 | **Build / deploy failure on `main`** | Any | Medium | `main` is broken; the release path is blocked | Fix forward on a branch |
| 7 | **CI failure on `main`** | Any | Medium | A regression reached the default branch | Same |
| 8 | **`npm audit` high/critical** | Any (fails CI already) | Medium | Known-vulnerable dependency | Cybersecurity Engineer triage; record in `docs/security/vulnerabilities.md` |
| 9 | **Home page LCP** | p75 > 2.5s (NFR-1) | Medium | Direct requirement breach | Check hero image size/format, `priority` flag, cache hit rate |
| 10 | **CLS / INP** | p75 CLS > 0.1 (NFR-2), INP > 200ms (NFR-3) | Low–Medium | Direct requirement breach | Usually a missing image dimension or a heavy client component |
| 11 | **Vercel token expiry** | 14 days before expiry | Low | An expired token breaks deploys — not the site, but it breaks rollback-by-redeploy | Rotate per `environment.md` §5.1 |
| 12 | **TLS certificate** | Vercel-managed; alert only if the platform reports a renewal failure | Low | Automatic, but not infallible | Check domain configuration |

### Routing

- **Critical** → immediate notification to the on-duty engineer and the Noble Path
  owner (booking failures are a business problem, not only a technical one).
- **High / Medium** → team channel during working hours (Asia/Colombo).
- **Low** → weekly review.

### Tooling

Vercel Analytics and Speed Insights cover #4, #9 and #10. #1, #2, #3 and #5 need
either Vercel log drains/alerts or a small external uptime monitor hitting
`/api/health`. **Choose and record the tool in §9 before production launch** — an
alert table with no implementation is documentation theatre.

---

## 7. The rate limiter: a known architectural weakness

`/api/bookings` is rate-limited in memory, per process (NFR-8).

The app runtime is **stateless and horizontally scaled**. Each instance has its own
counter. So the effective limit is:

```text
effective limit  ≈  BOOKING_RATE_LIMIT_MAX  ×  number of live instances
```

Instances are also recycled, which resets counters unpredictably. In practice this
means the limiter **stops casual abuse from one client but does not stop a
determined or distributed attacker**, and its behaviour is not reproducible.

This is accepted for v1: the endpoint sends an email rather than writing to a
database, the blast radius of abuse is spam, and adding Redis to a project that
otherwise has no data tier is a large change for a small gain. It must be revisited
the moment enquiries are persisted, or if alert #3 fires repeatedly.

Fix when needed: a shared store (Vercel KV / Upstash Redis) or a platform-level WAF
rate-limit rule in front of the route. Either is an infrastructure change and needs
DevOps review plus an ADR.

---

## 8. Backup and recovery

### There is nothing to back up — and that is a deliberate design property

| Asset | Where it lives | Backup | Recovery |
| --- | --- | --- | --- |
| Application source | Git (GitHub) | GitHub replication + every clone | `git clone`, deploy |
| Content (destinations, experiences, packages) | `content/` in Git | Same as source | Same as source — **content is code** (ADR-002) |
| Owned photography | `public/` in Git | Same as source; **originals should also exist outside the repo** | See gap below |
| Build artefacts | Vercel, immutable per deployment | Vercel retains previous deployments | Promote a previous deployment (< 2 min) |
| Environment variables | Vercel + GitHub Environments | **Not backed up** — see gap below | Re-enter manually from `environment.md` |
| Booking enquiries | **Nowhere.** They exist only in a delivered email | Staff mailbox retention | **None.** An undelivered enquiry is unrecoverable |
| DNS zone | Registrar | **Not backed up** | Re-enter from `deployment.md` §7 |

### Recovery objectives (v1)

| Scenario | RTO | RPO | Method |
| --- | --- | --- | --- |
| Bad deploy | < 15 min | n/a — no state | Promote previous deployment |
| App runtime outage (platform) | Vercel's SLA | n/a | Platform recovery; container image is the escape hatch |
| Vercel account/project lost | ~2–4 hours | n/a | Recreate the project from Git, re-enter environment variables, re-point DNS (TTL-bound) |
| Repository lost | ~1 hour | Last push | Restore from a local clone; GitHub is the primary, clones are the de facto backup |
| Email provider outage | Provider-dependent | **Every enquiry during the outage is lost** | No mitigation in v1 |

**RPO is "not applicable" for everything except booking enquiries, where it is
effectively infinite.** That asymmetry is the honest summary of v1's recovery posture.

### Gaps

1. **Photography originals.** `public/` holds web-sized JPEGs. Full-resolution
   originals must be stored outside the repository with their licence records —
   Git is version control, not an asset archive.
2. **Environment variable values are not backed up.** If the Vercel project is lost,
   the values must be re-entered by hand. `environment.md` documents what each one
   should be; keep the actual production values in the team password manager.
3. **No enquiry durability.** The highest-value gap. See §9.

---

## 9. What changes when bookings gain a datastore

Almost everything on this page is contingent on "no database". Recording the
constraints now prevents them being rediscovered under time pressure later.

| Concern | v1 (no database) | With a datastore |
| --- | --- | --- |
| **Hosting** | Vercel is clearly right (`deployment.md` §1) | Re-evaluate. Co-locating the app with the database in one region/VPC becomes a real argument for a container platform. |
| **Networking** | No VPC needed | Private networking, a security group or allow-list, and connection management become mandatory. The database must never be publicly reachable. |
| **Connections** | None | Serverless + a connection-per-instance database is a classic failure mode. Needs a pooler, or a serverless-native database. |
| **Backups** | Nothing to back up | Automated backups, tested **restores** (an untested backup is not a backup), retention policy, point-in-time recovery. |
| **Recovery** | RPO n/a | Real RTO/RPO targets. Rollback stops being purely a deployment concern: **a schema migration cannot be rolled back by promoting a previous deployment.** |
| **Migrations** | None | Forward and rollback migration scripts, documented per Fortechz §8. Expand-migrate-contract, so the old code still runs against the new schema. |
| **Rate limiting** | In-memory, weak (§7) | Move to the shared store immediately — the weakness stops being acceptable once writes persist. |
| **Secrets** | Four variables, no credentials | A database credential appears. Rotation becomes a real, outage-capable procedure. |
| **Data protection** | Enquiry PII transits to a mailbox | PII at rest: encryption, retention limits, deletion/erasure handling, a documented lawful basis. Requires a Cybersecurity Engineer review. |
| **Monitoring** | 5xx, latency, 429 | Add connection pool saturation, slow queries, replication lag, disk. |
| **Environments** | Differ only by variables | Staging needs its own database with realistic but **non-production** data. Never point staging at production data. |

**Any of this is an infrastructure change and must be reviewed by the DevOps Engineer
and recorded as an ADR before implementation.**

---

## 10. Required actions

| # | Action | Owner | Priority |
| --- | --- | --- | --- |
| 1 | Implement `app/api/health/route.ts` — 200, small JSON, `no-store`, **no version/build/env detail** (a health endpoint is public; do not leak internals) | Full-Stack Engineer | **Blocking** |
| 2 | Add `output: "standalone"` to `next.config.ts` | Full-Stack Engineer | Blocking for the container image only |
| 3 | Choose the email delivery provider and document it here and in `environment.md` | Orchestrator + DevOps | **Blocking for FR-5** |
| 4 | Choose and configure the alerting tool; implement alerts #1–#5 at minimum | DevOps Engineer | Before production launch |
| 5 | Record the hosting ADR (Vercel over containers) in `docs/decisions/architecture-decisions.md` | Owning agent | Fortechz policy |
| 6 | Record the actual Vercel log retention once the project exists (§5) | DevOps Engineer | Before production launch |
| 7 | Store full-resolution photography originals and licence records outside the repository | Human / UI/UX | Medium |
| 8 | Store production environment variable values in the team password manager | Human | Medium |
| 9 | Decide whether to persist or queue booking enquiries in v1.1 | Orchestrator | High (business risk) |

---

## 11. Change log

| Date | Change | By |
| --- | --- | --- |
| 2026-09-19 | Initial infrastructure architecture: runtime topology, request-path walkthroughs, trust boundaries, logging and alerting baseline, rate-limiter weakness, backup/recovery posture, datastore migration constraints. Nothing provisioned. | DevOps Engineer |
