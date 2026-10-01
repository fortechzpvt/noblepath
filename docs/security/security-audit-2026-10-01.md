# Noble Path: Consolidated Security Review (2026-10-01)

**Systems:**
- **Public site** `www.noblepathsrilanka.com`: repository `fortechzpvt/noblepath`, Next.js 16 on Vercel.
- **Admin app** `noblepathadmin.vercel.app`: repository `fortechzpvt/noblepathadmin`, Next.js 16 on Vercel.
- **Database:** Supabase PostgreSQL, project `mgywzyxewtblqklfdigj`, region ap-northeast-2.

**How it was done:**
- **Agent audits:** eight read-only specialist audits (D-39 and D-40 in `security-review.md`).
- **Orchestrator review:** authentication, session, authorisation, input, logging and compliance.
- **External tests:** non-destructive and owner-authorised (Supabase REST/Auth with the public anon key, live HTTP crawls).

**Not performed:**
- a hands-on penetration test of the live apps (the agent was stopped before it ran);
- an independent third-party review;
- load or DoS testing.

**Update, same day (D-41):** M-1, M-2, M-8, M-10, L-1, L-3, L-4, L-5 and I-1 are fixed and tested.
M-5's migration is written and waits for the owner to run it. The remaining items are owner or
DevOps actions, plus M-3, M-6, M-9, M-11 and L-2, which are planned.

**Overall:**
- **No Critical findings.**
- **High (3):** all known, owner-level actions, none of them code defects: single-factor admin sign-in on the open internet, no privacy notice, and exposed credentials for the old Aiven database, which still holds personal data.
- **Medium/Low:** hardening, listed in §1.

The rest of this document answers each requested checklist in turn. "✅" means verified, with evidence. "⚠️" means a gap, with a finding id from §1.

---

## 1. Prioritised findings (open)

| Id | Sev | Area | Finding | Remediation | Owner |
|---|---|---|---|---|---|
| H-1 | **High** | Authentication | The admin uses a password only (F-36-10, accepted by the owner), and the sign-in page is reachable by anyone (no Vercel Deployment Protection observed). A phished password exposes all enquiry PII | Turn on Vercel Deployment Protection for `noblepathadmin`. Enable Supabase MFA (TOTP) and require AAL2 in `requireAdmin()` | Owner, then code |
| H-2 | **High** | Compliance | There is no privacy notice, though enquiries are stored for 24 months and sent to Supabase (South Korea), Vercel and Resend (US) (F-36-8) | Publish a privacy notice before launch, covering purposes, processors, transfers, retention and rights | Owner/legal |
| H-3 | **High** | Data | The Aiven database still holds a copy of content, enquiries and statistics, and its admin credentials were exposed in chat and screenshots (F-36-11, F-37-3) | Export anything needed, then **delete the Aiven service** | Owner |
| M-1 | Med | Authentication | The reset request's response time reveals whether an email is an admin (F-40-1) | **Fixed (D-41):** the email is sent with `after()`, so replies take the same time | Code |
| M-2 | Med | Session | The 12 h cap is measured from the user-wide `last_sign_in_at`, and the cap sign-out is global (F-40-2) | **Fixed (D-41):** measured from this session's `amr` timestamp; cap sign-out is local. Unit-tested | Code |
| M-3 | Med | Session | Supabase session cookies are not HttpOnly (`@supabase/ssr` default), and the CSP allows inline scripts (F-36-2), so any XSS could steal a session | Nonce-based CSP in the admin (all pages are dynamic). Keep XSS sinks at zero | Code |
| M-4 | Med | Authentication | The 14-character password policy is enforced only in the app, not in Supabase (F-40-3) | Supabase → Auth → Passwords: minimum 14 characters, with required character classes | Owner |
| M-5 | Med | Database | No EXECUTE revoke from PUBLIC on functions, and default-privilege revokes cover only `postgres` (F-40-4) | **Written (D-41):** `db/migrations/004_function_lockdown.sql`. **Owner runs it** (`npm run db:migrate`). Untested against a database | Code, then owner runs it |
| M-6 | Med | Database | `public` is exposed through the Data API with no RLS backstop (F-37-1, F-40-5) | Move the tables to a non-exposed schema `app`, or RLS with policies for the np_* roles only | Code + owner |
| M-7 | Med | Database | Postgres ports are open to the internet with no Network Restrictions (F-40-6) | Restrict the direct host. Consider static egress for Vercel | Owner/DevOps |
| M-8 | Med | Privacy | The admin cannot delete one person's enquiry (only a bulk purge after 24 months), so erasure requests cannot be fulfilled | **Fixed (D-41):** "Export data" (JSON, audited) and "Delete" (two-step, audited) on each enquiry | Code |
| M-9 | Med | Monitoring | No alerting. Site errors go only to Vercel runtime logs (short retention on Hobby). The audit log lives in the same database it audits | Log drain (Vercel → e.g. Axiom/Better Stack), alerts on `login.failed` bursts and 5xx spikes, and a separate log store | DevOps |
| M-10 | Med | Supply chain | The admin repo has no Dependabot and no `npm audit` CI job; Actions are pinned by tag (F-40-7, F-40-8) | **Fixed (D-41):** admin Dependabot and `npm audit` job; actions in both repos pinned to v4.4.0 commit SHAs | Code |
| M-11 | Med | Abuse | Rate limits are in memory per serverless instance (site bookings and rides, track, places), so a distributed or multi-instance burst exceeds them | Move them to a shared store (Upstash Redis / Vercel KV) or use Vercel Firewall rate-limit rules | DevOps |
| L-1 | Low | Authentication | The sign-in throttle can be raced; `redirectTo` comes from the Origin header (F-39-10, F-39-4) | **Fixed (D-41):** attempts recorded and counted in one statement; a success removes its attempt; `ADMIN_URL` replaces the Origin header | Code |
| L-2 | Low | Session | The access token lifetime is 1 h (Supabase default), above the 15-minute guideline. There is no idle timeout (the 60-minute idle limit was removed with the move to Supabase) | Set the JWT expiry to 900 s; add a 30-minute idle check from the cookie's last refresh | Owner + code |
| L-3 | Low | Logging | Viewing an enquiry is not audited; `login.refused` lacks the Supabase user id (F-39-11) | **Fixed (D-41):** `enquiry.viewed` and `enquiry.exported` audited; `login.refused` records the Supabase user id | Code |
| L-4 | Low | Errors | No custom `error.tsx` in either app. Next shows a generic page with a digest and no stack, which is safe but unbranded | **Fixed (D-41):** `app/error.tsx` and `app/global-error.tsx` in both apps (generic text plus digest) | Code |
| L-5 | Low | Repo hygiene | `.gitignore`/`.dockerignore` gaps; no `engines` field in the site; an unused `@eslint/eslintrc`; Docker images pinned by tag (F-40-10, F-40-11) | **Fixed (D-41):** ignore files closed; site `engines: 24.x`; `@eslint/eslintrc` removed. Docker digest pinning still open | Code |
| L-6 | Low | Info disclosure | PostgREST errors confirm which tables exist; `graphql_public` is exposed; unused Twilio/SAML configuration (F-40-12) | Resolved by M-6; remove the unused configuration | Owner |
| L-7 | Low | Privacy | The project ref and a personal notification email appear in the docs (F-40-13) | Redact if the repo could become public | Code |
| I-1 | Info | Admin search | `ilike` with unescaped `%`/`_` (wildcard injection, admin only, harmless) | **Fixed (D-41):** `%`, `_` and `\` escaped in the admin search | Code |

---

## 2. Endpoint inventory: authentication, authorisation, rate limits, responses and input

The system has **one privileged role** (the admin, single tenant) and **anonymous travellers**.
Travellers have no accounts, so horizontal escalation between users does not arise. No public
endpoint reads stored data by id.

### Public site

| Endpoint | Authn/authz | Rate limit (server) | Input bounds | Response (minimal?) |
|---|---|---|---|---|
| `POST /api/bookings` | Public by design. Writes only. Cross-site form posts are blocked: `application/json` is required (415), so a cross-origin browser POST needs a preflight, which gets no ACAO | 5 per 10 min per IP (`BOOKING_RATE_LIMIT_*`), in memory (M-11) | Content-Length required, ≤ 50 KB; strict zod schema; field lengths; digits-only numbers; single-line checks | `{ id }` only; errors are `{ error: { code, message, correlationId, fields } }`. ✅ minimal |
| `POST /api/rides` | Same as bookings | Shares the enquiry limiter | Same | `{ id }`. ✅ |
| `POST /api/track` | Public beacon; same-site and non-bot only | 120 per min per IP, in memory | ≤ 1 KB; path allowlist (only real pages, D-39) | `204` with no body. ✅ |
| `GET /api/places/search`, `/reverse` | Public; cross-site requests refused | 30 per min per client, plus an upstream 5 per second | Query length and coordinate bounds checked; fixed upstream URL (no SSRF) | Sanitised place labels and coordinates only. ✅ |
| Pages (`/`, `/trips/*`, …) | Public, static | CDN | `dynamicParams=false`; unknown slugs 404 | No personal data |

### Admin

| Entry point | Authn/authz | Notes |
|---|---|---|
| Every page under `app/(panel)` and its `generateMetadata` | `requireAdmin()`, which means a Supabase session **plus** the allowlist **plus** the 12 h cap. Enforced per page (F-39-1 fix; regression test `tests/panel-guard.test.ts`) | Vertical escalation (a non-admin Supabase user) is blocked; public sign-ups are off (verified) |
| Server Actions: `saveContent`, `toggleStatus`, `removeContent`, `moveContent`, `publishSite`, `updateEnquiry`, `purgeOldEnquiries`, `uploadMedia`, `deleteMedia`, `setNewPassword`, `signOutEverywhereElse` | Each calls `requireAdmin()` first. CSRF is covered by the Next.js Origin check. Input is validated with zod and slug/regex allowlists | Single tenant: any admin may act on any record by design |
| `signIn`, `forgotPassword`, `signOut` | Public by necessity | Uniform messages; throttled (10 per 15 min per client + Supabase); L-1, M-1 |
| `GET /media/[file]` | `requireAdmin()`; strict id regex; `nosniff`; `default-src 'none'` | ✅ |
| `GET /auth/callback` | Exchanges a one-time code; redirect restricted to the same origin (`safe-next.ts`) | ✅ |
| `GET /auth/reset` | `requireAdmin()` plus a recovery proof in the signed `amr` claim (≤ 15 min) | ✅ |

**Data leakage:**
- **API responses:** no endpoint returns password hashes, tokens, keys or full records.
- **Admin pages:** render enquiry PII to the admin, which is their purpose.
- **Booking references** (`NP-YYYYMMDD-XXXXXX`, random 31⁶ per day) are not enumerable for data access; no public endpoint looks them up.

**On "5 attempts per minute" for authentication:**
- The admin allows 10 failures per 15 minutes per client, roughly 0.7 per minute. That is stricter than 5 per minute overall, but burstier, and it is raceable (L-1).
- Supabase Auth adds its own per-IP limits.
- Failed sign-ins are logged as `login.failed` (with reason and timestamp) in `audit_log`. The IP is stored only as a keyed hash in `login_attempts`, deliberately, as data minimisation. Add a hashed-IP field to the audit entry if correlation is needed.

---

## 3. SQL and NoSQL injection

- **No MongoDB or ORM:** raw `pg` with **parameterised** queries everywhere (`$1…`).
- **Every interpolated `${…}` in SQL was reviewed.** None carries user input:

| Location | Interpolation | Safe because |
|---|---|---|
| `noblepathadmin/app/(panel)/enquiries/page.tsx:42` | `where ${conditions.join(" and ")}` | Conditions are fixed strings holding only `$n` placeholders; values go through the `values` array; `status`/`kind` are allowlisted |
| `noblepathadmin/app/(panel)/enquiries/{page,actions}.ts` | `${EXPIRED_ENQUIRY}` | A module constant (`lib/retention.ts`) |
| `noblepathadmin/lib/stats.ts` | `${TODAY}` and similar | Module constants |
| `NobalPath/app/api/track/route.ts` | none (all `$n`) | Fixed in D-39 |

- **Only issue:** wildcard characters in the admin's `ilike` search (I-1), which is harmless.
- **Nothing to rewrite:** no vulnerable query was found.

---

## 4. Database configuration

| Check | Status |
|---|---|
| Default credentials | ✅ No app uses `postgres`. Roles `np_admin`, `np_site_build` and `np_site_runtime` have 48-character random hex passwords. ⚠️ Rotate anything ever pasted in chat (H-3/F-36-11 concerns Aiven) |
| Public internet exposure | ⚠️ Ports 5432/6543 reachable (M-7). The Data API exposes `public` but returns **no data** to anon (verified, 13 objects: 401/42501) |
| TLS | ✅ `rejectUnauthorized: true` against the Supabase root CA (`DATABASE_CA_CERT`), verified on both pooler ports. `rejectUnauthorized:false` is never used |
| Least privilege | ✅ Site runtime can only INSERT enquiries and visit counters. The build can only SELECT the published-content view and media. The admin has data rights only; the owner is not used by any app |
| Pooling / exhaustion | ✅ Supavisor pooler; app pools of max 3 with a 10 s idle timeout, a 15 s `query_timeout` and `statement_timeout` |
| Backups | ⚠️ Supabase free plan: daily backups, encrypted at rest by the provider, short retention, no PITR. Decide before launch (F-37-2) |

**Configuration changes:**
- migration `004` (M-5);
- schema move or RLS (M-6);
- Network Restrictions (M-7);
- `alter role np_site_runtime set statement_timeout='15s'` (also set on the role, not just the client).

---

## 5. Sensitive data in the schema

| Field | Classification | Protection |
|---|---|---|
| Admin passwords | Secret | ✅ Supabase Auth bcrypt. Legacy `admin_users.password_hash` and `totp_secret_enc` are nulled (migration 002) |
| Supabase session and refresh tokens | Secret | ✅ Managed by Supabase. Refresh tokens are rotated and server-side revocable. ⚠️ The cookies are JS-readable (M-3) |
| `booking_requests.traveller_name`, `email`, `payload` (phone, nationality, dates, notes) | **Personal data** | Encrypted at rest by the provider (disk level) only, with no field-level encryption. Access: np_admin read; site runtime insert-only. Retention 24 months after the later of request and trip (manual purge, F-36-7). ⚠️ No per-record deletion or export (M-8) |
| `login_attempts.client_hash` | Pseudonymous | Keyed SHA-256 of the IP; deleted after 1 day |
| `visitors_daily.visitor_hash` | Pseudonymous | Daily-salted hash; salt deleted after 2 days, so the hash cannot be linked afterwards |
| `audit_log.detail` | Internal | Never holds secrets or traveller data (by rule). ⚠️ Enquiry views are not logged (L-3) |
| Payment cards | — | ✅ None. The site takes no payments (ADR-004) |

**Classification labels:** the personal-data columns are labelled in `docs/database/database-schema.md`.
Adding `comment on column … is 'PII'` in a migration would put the label in the database itself.

---

## 6. Deployment, headers, errors and CORS

| Check | Status |
|---|---|
| Debug mode | ✅ Production builds; no `NODE_ENV=development` on Vercel; `poweredByHeader: false` |
| Stack traces | ✅ Next production hides them (generic page + digest). APIs return `{code, message, correlationId}`. Database and provider errors are logged server-side only. L-4: no custom error page |
| Source maps | ✅ `*.js.map` returns 403 on both apps (verified) |
| Secrets in env | ✅ Every secret is in Vercel env. Only `NEXT_PUBLIC_SITE_URL` is public. No hard-coded secrets (§9) |
| HTTPS/HSTS | ✅ Valid certificates; `max-age=63072000; includeSubDomains; preload` on www and the admin. ⚠️ The bare domain lacks `includeSubDomains; preload` (Vercel domain settings) |
| Security headers | ✅ CSP (`frame-ancestors 'none'`, `object-src 'none'`, `base-uri`, `form-action`), XFO DENY, nosniff, Referrer-Policy, Permissions-Policy, COOP, HSTS on both apps. ⚠️ `script-src 'unsafe-inline'` (M-3) |
| CORS | ✅ No API sends `Access-Control-Allow-Origin`, so cross-origin JS cannot read API responses and JSON POSTs fail preflight. Vercel adds `ACAO: *` to **static** public responses (pages, sitemap): harmless, with no credentials and public content. No origin reflection; no `Allow-Credentials` |

**Exact configuration:** `next.config.ts` in both repositories already sets the headers. For M-3, the admin's
`proxy.ts` should generate a per-request nonce and set
`script-src 'self' 'nonce-…' 'strict-dynamic'` (Next.js nonce CSP pattern).

---

## 7. CI/CD, dependencies and lockfiles

| Check | Status |
|---|---|
| Secrets in the repo or CI | ✅ None in either repository's history (all branches and unreachable objects) or workflows |
| Dev dependencies in builds | ✅ Vercel and Next standalone output ship only what the server traces; Docker uses `npm ci` with a standalone copy |
| Docker | ✅ `node:24-alpine`, a non-root `nextjs` user, BuildKit secrets for the build-time DB URL. ⚠️ Tag pin instead of digest (L-5). Vercel is the live host; Docker is the alternative |
| Deployment credentials | ✅ The Vercel deploy hook is a secret URL held only in the admin's server env. ⚠️ It is unauthenticated by nature: rotate it if exposed (runbook §9) |
| Workflows | ✅ `contents: read`, `persist-credentials:false`, no `pull_request_target`, no expression injection. ⚠️ Tag-pinned actions; the admin lacks Dependabot and an audit gate (M-10) |
| Dependencies | ✅ All production packages are well-known and spelled correctly (next, react, react-dom, zod, pg, resend, leaflet, lucide-react, sharp, @supabase/ssr, @supabase/supabase-js). `npm audit`: 0. Lockfile v3 with integrity hashes, from registry.npmjs.org only. Production install scripts: none. Licences: no GPL/AGPL (libvips LGPL is dynamically linked). Caret ranges on `pg`, `resend`, `sharp` and `@supabase/*` are held by the lockfile. ⚠️ Unused `@eslint/eslintrc` (L-5) |

---

## 8. OWASP Top 10 (2021)

| Category | Findings (by severity) |
|---|---|
| A01 Broken access control | Fixed: F-39-1 (High, layout-only checks), F-39-7 (open redirect). Open: none in code. Single tenant, so no IDOR surface |
| A02 Cryptographic failures | ✅ TLS everywhere, verified DB TLS, bcrypt (Supabase), keyed hashes for IPs. Provider-level encryption at rest only for PII (acceptable; see §10) |
| A03 Injection | ✅ SQL parameterised (§3); email is plain text; JSON-LD escaped; no shell/eval. I-1 info |
| A04 Insecure design | H-1 single-factor admin; M-8 no erasure path; M-11 per-instance limits |
| A05 Security misconfiguration | M-3 `'unsafe-inline'`; M-6/M-7 database exposure; bare-domain HSTS; L-6 |
| A06 Vulnerable components | ✅ 0 advisories; Next 16.3.8 patched (GHSA-vcvr-r3jv-pc5j). M-10 automation gap in the admin |
| A07 Identification and authentication failures | H-1; M-1 timing enumeration; M-2 session cap; M-4 provider password policy; L-1, L-2 |
| A08 Software and data integrity | ✅ Lockfile integrity, CI read-only. M-10 SHA pinning; content integrity checked at build (F-39-25) |
| A09 Logging and monitoring failures | M-9 no alerting or separate store; L-3 enquiry views not audited |
| A10 SSRF | ✅ `/api/places` uses a fixed upstream base URL, `URLSearchParams`, bounded coordinates and a 4 s timeout. The admin makes no user-controlled fetches; the deploy hook is a fixed env URL |

---

## 9. Hard-coded secrets

✅ **None found** in the working tree or full git history of either repository. That covers
`sk_`, `pk_`, `re_`, `ghp_`, `AKIA…`, JWTs (`service_role`), `postgres://user:pass@`, private
keys and committed `.env` files.

`.env.local` is git-ignored and has never been committed. Every connection string in the docs
uses `…` or `<password>`. Secrets live only in Vercel environment variables (site:
`RESEND_API_KEY`, `DATABASE_URL`, `CONTENT_DATABASE_URL`; admin: `DATABASE_URL`,
`ADMIN_ENCRYPTION_KEY`, `SITE_DEPLOY_HOOK_URL`, `SUPABASE_ANON_KEY`).

---

## 10. Logging and monitoring

| Check | Status |
|---|---|
| Failed authentication logged | ✅ `audit_log` `login.failed` (timestamp, reason) and `login.refused`. The IP is a keyed hash only (privacy) |
| Authorisation failures logged | Partly. A non-admin Supabase account is logged (`login.refused`); a page-level redirect is not |
| No sensitive data in logs | ✅ Store and email failures log only the reference and correlation id; the audit `detail` never holds traveller data or secrets |
| Separate log store | ⚠️ The audit log is in the application database; site logs are Vercel runtime logs only (M-9) |
| Log injection | ✅ The audit log is structured jsonb, not text lines. Console logs carry ids and provider error names, not raw user input |
| Alerting | ⚠️ None (M-9). Suggested: a Vercel log drain, plus alerts on ≥ 5 `login.failed` per 15 min and on 5xx rate |

---

## 11. Compliance gaps (GDPR, PIPEDA, SOC 2)

| Requirement | GDPR | PIPEDA | SOC 2 | Status and code reference | Priority |
|---|---|---|---|---|---|
| Transparency / privacy notice | Arts 12–14 | Principle 8 (Openness) | P-series | ⚠️ Missing (H-2) | **High** |
| Lawful basis / consent | Art 6 | Principle 3 (Consent) | — | Enquiries: pre-contract steps (Art 6(1)(b)). Analytics are cookie-free and IP-free, and DNT/GPC are honoured (`app/api/track/route.ts`). `localStorage` holds only the visitor's own selections (functional). No marketing | Low |
| Retention | Art 5(1)(e) | Principle 5 | C1 | 24 months after the later of request and trip (`noblepathadmin/lib/retention.ts`); manual purge (F-36-7) | Medium |
| Erasure / access requests | Arts 15, 17 | Principle 9 (Access) | P-series | ⚠️ No per-record delete or export (M-8) | **Medium–High** |
| Security of processing | Art 32 | Principle 7 (Safeguards) | CC6 | Strong, apart from H-1 (MFA) and M-3 | High (MFA) |
| Encryption at rest | Art 32 | Principle 7 | CC6.1 | Provider disk encryption (Supabase/AWS). Field-level encryption is not required for this data class; document the decision | Low |
| Audit trail | Art 30 (records) | Principle 1 (Accountability) | CC7 | `audit_log` covers changes, sign-ins, purges and uploads. ⚠️ Not reads of PII (L-3) | Medium |
| Cross-border transfers | Chapter V | Principle 1 (transfers for processing) | — | Data goes to Supabase (Seoul), Vercel and Resend (US) and the staff Gmail. Needs processor DPAs and disclosure in the notice (H-2) | High (with H-2) |
| Data classification labels | Art 30 | — | C1 | Documented in `database-schema.md`; not yet in the database (§5) | Low |
| Change management | — | — | CC8 | ✅ PRs, CI (lint, type, test, build, audit on the site), decision records, changelog | — |
| Incident response / monitoring | Arts 33–34 | Breach reporting | CC7 | ⚠️ No alerting or runbook for breaches (M-9) | Medium |
| Vendor management | Art 28 | Principle 1 | CC9 | ⚠️ DPAs not recorded for Supabase, Vercel, Resend, Google | Medium |

---

## 12. AI coding tools and intellectual property

- **What AI tools have processed:**
  - the full source of both apps, the docs, and live configuration observed in dashboards;
  - one credential set was pasted into a chat (F-36-11, Aiven).
- **No secrets in code** means repository access alone does not grant system access.
- **Proprietary logic:**
  - the itinerary rules (`lib/itinerary.ts`), travel-time table (`lib/known-places.ts`, content) and editorial content are the business's IP;
  - they are public in the site's client bundle by nature (the planner runs in the browser), so they are not secret;
  - there are no proprietary models or algorithms on the server.
- **Infrastructure detail:** project ref, region and role names are in the docs (L-7).
- **Recommendations:**
  1. Never paste credentials into AI chats. Use the clipboard and secret-store patterns used during D-37.
  2. Keep secrets only in Vercel or Supabase.
  3. If code must be withheld from AI tools, keep it in a separate repository the tools are not given, and use the tool's ignore settings for `.env*`, `*.pem` and `*.crt`.
  4. Review AI tool data-retention settings at the organisation level.

---

## 13. Architecture: trust boundaries and data flows

| # | Boundary / flow | Data class | Authentication and authorisation | In transit / at rest |
|---|---|---|---|---|
| 1 | Traveller browser → site pages | Public | None | TLS (HSTS) / CDN |
| 2 | Traveller → `/api/bookings`, `/api/rides` | **Personal data** | None (public form); rate limit; zod | TLS / Supabase disk encryption |
| 3 | Site runtime → Supabase (`np_site_runtime`) | Personal data | Role password; insert-only grants | TLS verified against the CA / provider |
| 4 | Site runtime → Resend → staff Gmail | Personal data | API key | TLS / provider (US) |
| 5 | Site runtime → Photon (Komoot) | Typed place names | None (public API); fixed URL | TLS |
| 6 | Site build → Supabase (`np_site_build`) | Published content | Role password; view-only SELECT | TLS verified |
| 7 | Admin browser → admin app | Personal data, credentials | Supabase session + allowlist + 12 h cap; **single factor (H-1)** | TLS / cookies |
| 8 | Admin app → Supabase Auth | Credentials, tokens | Anon key + user session | TLS |
| 9 | Admin app → Supabase DB (`np_admin`) | All data | Role password; data rights only | TLS verified |
| 10 | Admin → Vercel deploy hook | None | Secret URL | TLS |
| 11 | Anyone → Supabase Data API | — | Anon key; **no grants** (verified) | TLS |

**Single points of failure:**
- **Supabase** (one project, free tier, no PITR):
  - if it is down, the site still serves static pages and enquiries are still emailed;
  - publishing and the admin stop.
- **Resend:** if it is down, enquiries are still saved (D-36).
- **The single admin account:** if it is lost, there is a reset flow plus the `admin:create` CLI.

**Architectural risks flagged:**
- H-1 (an internet-facing single-factor admin over all PII);
- M-6 (business tables in an API-exposed schema);
- M-11 (per-instance rate limits in serverless).

---

## 14. Input handling and XSS

- **Server-side validation:** zod on every API and Server Action.
  - Lengths are bounded everywhere: booking fields ≤ 60–2,000 characters, body ≤ 50 KB, track ≤ 1 KB, uploads ≤ 4 MB, Server Action body ≤ 4.5 MB.
  - Single-line fields reject control characters and bidi overrides; numbers are digits only (D-39).
- **File uploads:** the format is read from the bytes by sharp; there is a pixel limit; images are re-encoded; metadata is stripped. Uploads are stored as DB blobs under uuid names, so there is no path traversal. `pull-content` writes only `<uuid>.<jpg|webp|png>`.
- **XSS:**
  - React escapes all output.
  - `dangerouslySetInnerHTML` is used only for JSON-LD, via `jsonLdScript()`, which escapes `<` (unit-tested).
  - Leaflet tooltips use text.
  - Emails are plain text.
  - Credit links are https only (F-36-1).
  - No vulnerable output point was found. The remaining weakness is defence in depth: the CSP allows inline scripts (M-3).

## 15. Sessions and JWT

| Check | Status |
|---|---|
| Session id entropy | ✅ Supabase access JWT + opaque refresh token from a CSPRNG |
| Cookie flags | ⚠️ `SameSite=Lax`, **not HttpOnly** (`@supabase/ssr` defaults; M-3). `Secure` is now set explicitly in production (D-41, `lib/supabase.ts` and `proxy.ts`). Strict would break the email-link return |
| Idle timeout | ⚠️ None beyond the 1 h access token with silent refresh (L-2) |
| Regeneration after login | ✅ A new session on every sign-in (Supabase) |
| Concurrent sessions | Not limited. "Sign out all other sessions" is available |
| Logout invalidates server-side | ✅ The refresh token is revoked (`scope:"local"`); pages re-check with `getUser()` |
| JWT algorithm and secret | ✅ Supabase-signed (HS256 project secret, held by Supabase); verified server-side on every request (`getUser`/`getClaims`); `alg:none` rejected by Supabase |
| JWT expiry | ⚠️ Access token 3600 s (L-2: set 900 s); refresh rotation on by Supabase default (reuse interval 10 s) |
| Minimal claims | ✅ Standard Supabase claims; no PII beyond the email |

---

*Earlier detail: `security-review.md` sections D-36 to D-40. Decisions: `architecture-decisions.md` D-36 to D-39.*
