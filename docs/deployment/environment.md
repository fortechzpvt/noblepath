# Noble Path — Environment Configuration

**Project:** Noble Path
**Owner:** Fortechz — DevOps Engineer
**Status:** Proposed and approved for v1 build
**Last updated:** 2026-09-19

Source of truth for every environment variable the application and its pipelines
read. `.env.example` is the checked-in template; **this document is the
specification**. If the two disagree, fix both — do not leave them divergent.

---

> **Status note.** No environment has been provisioned. The values in the
> "Production" and "Staging" columns below are the **required** values to set when
> those environments are created, not values that are currently set anywhere.

---

## 1. The rule that governs everything on this page

### `NEXT_PUBLIC_*` variables are compiled into the JavaScript sent to the browser.

Next.js inlines any variable whose name starts with `NEXT_PUBLIC_` into the client
bundle **at build time**. It is not read at runtime, it is not hidden, and it is not
protected by anything. Anyone can read it with View Source.

**Therefore:**

- **Never put a secret, key, token, password, connection string or internal hostname
  behind a `NEXT_PUBLIC_` prefix.** Not "temporarily". Not "it's only staging".
- Renaming a server-only variable to `NEXT_PUBLIC_*` to "make it work in a component"
  is a security incident, not a fix. If a component needs the value, the value must be
  fetched through a server component, a route handler or a server action instead.
- A `NEXT_PUBLIC_*` value **cannot be rotated by changing a setting** — it is baked
  into a build. Changing it requires a rebuild and redeploy of every environment that
  uses it.

This enforces **NFR-6** ("No secrets in client bundles — only `NEXT_PUBLIC_*` reaches
the browser").

**Verification.** After a production build, confirm no server-only variable leaked:

```bash
npm run build
# Should return nothing. If it returns a match, stop and treat it as an incident.
grep -rl "BOOKINGS_NOTIFICATION_EMAIL" .next/static/ || echo "clean"
```

Run this whenever a new server-side variable is introduced.

---

## 2. Variable reference

Every variable in `.env.example`, plus the pipeline variables.

### 2.1 `NEXT_PUBLIC_SITE_URL`

| Property | Value |
| --- | --- |
| **Purpose** | Absolute base URL of the deployment. Used to build canonical URLs, `sitemap.xml`, `robots` directives and Open Graph / Twitter card URLs (FR-7.2). |
| **Exposure** | **PUBLIC** — compiled into the client bundle. Must never hold a secret. |
| **Required** | Yes, in every environment. |
| **Default** | `http://localhost:3000` (from `.env.example`) |
| **Format** | Absolute origin, scheme included, **no trailing slash**. `https://noblepath.lk` ✅ · `noblepath.lk` ❌ · `https://noblepath.lk/` ❌ |
| **Local** | `http://localhost:3000` |
| **Preview** | The preview deployment URL, or the staging URL as an approximation |
| **Staging** | `https://staging.noblepath.lk` |
| **Production** | `https://noblepath.lk` |
| **Consequence if wrong** | Canonical tags and Open Graph URLs point at the wrong host. On production this means social shares 404 and search engines may consolidate ranking signals onto staging. It does not break rendering, so it fails silently — check it explicitly after a domain change. |
| **Changing it** | Requires a **rebuild and redeploy**, not just a settings change (see §1). |

### 2.2 `BOOKINGS_NOTIFICATION_EMAIL`

| Property | Value |
| --- | --- |
| **Purpose** | Destination mailbox for booking enquiries submitted via `/api/bookings` (FR-5). Noble Path staff follow up from here. |
| **Exposure** | **SERVER-ONLY.** Never expose to the client. It is not a credential, but it is an internal operational address: publishing it invites spam directly into the booking workflow. |
| **Required** | Yes in staging and production. Optional locally (enquiries can be logged instead of sent). |
| **Default** | Empty in `.env.example` — there is deliberately no fallback address. |
| **Format** | A single valid email address. |
| **Local** | Developer's own address, or leave empty |
| **Staging** | A staging/test mailbox — **never the real bookings inbox**, or test enquiries will reach staff as real leads |
| **Production** | The real Noble Path bookings mailbox |
| **Consequence if wrong/unset** | Enquiries are accepted and the visitor sees a reference code (FR-5.4) but nobody is notified — **silent lead loss**. This is the highest-impact misconfiguration in the project. The app should fail loudly at startup in production if this is unset; raised as a required action in §7. |

### 2.2.1 `RESEND_API_KEY`

| Property | Value |
| --- | --- |
| **Purpose** | Secret API key for [Resend](https://resend.com), used by `POST /api/bookings` (D-23) to send the notification email. |
| **Exposure** | **SERVER-ONLY, SECRET.** Never expose to the client, never commit, never log. Treat exactly like the pipeline's `VERCEL_TOKEN` in §3. |
| **Required** | Yes in production (`lib/env.ts` throws at startup if unset — same treatment as `BOOKINGS_NOTIFICATION_EMAIL`). Optional locally: `/api/bookings` answers `503 delivery_unavailable` instead of sending when unset, so the rest of the app stays usable without a Resend account. |
| **Default** | None. |
| **Format** | A Resend secret key, `re_...`, created in the [Resend dashboard](https://resend.com/api-keys). |
| **Local** | A developer's own Resend key, or leave empty to exercise the 503 path |
| **Staging** | A separate Resend key/project from production, if staging is expected to actually send mail during testing |
| **Production** | The real Noble Path Resend key |
| **Consequence if wrong/unset** | In production: the app refuses to start (see §7 item 1 — now enforced, not just designed). At runtime with a revoked/invalid key: Resend's API call fails, `/api/bookings` returns `502 delivery_failed`, and the failure (never the key itself) is logged server-side with a correlation id. |

### 2.2.2 `RESEND_FROM_EMAIL`

| Property | Value |
| --- | --- |
| **Purpose** | The "from" address Resend sends the notification email as. |
| **Exposure** | **SERVER-ONLY.** Not a secret, but not meaningful to expose either. |
| **Required** | No — defaults to Resend's shared sandbox sender. |
| **Default** | `onboarding@resend.dev` |
| **Format** | A single valid email address. |
| **Local / Staging** | The default is fine — sandbox sending only reaches the Resend account's own verified address anyway. |
| **Production** | An address on a domain verified in the Resend dashboard. **Operational step, not a code change**: until a sending domain is verified, Resend will not deliver to `BOOKINGS_NOTIFICATION_EMAIL` at all if it differs from the account's own address, regardless of what this variable is set to. |
| **Consequence if wrong/unset** | Sandbox sender stays in effect, silently limiting real-world delivery to the account owner's own address — see D-23's known limitations. Not an application error; Resend accepts the send and simply does not deliver it further. |

### 2.3 `BOOKING_RATE_LIMIT_MAX`

| Property | Value |
| --- | --- |
| **Purpose** | Maximum booking submissions allowed per client within the sliding window (NFR-8). |
| **Exposure** | **SERVER-ONLY.** |
| **Required** | Optional — the application should apply a safe default if unset. |
| **Default** | `5` |
| **Format** | Positive integer. |
| **Local** | `5`, or higher while testing the form repeatedly |
| **Staging** | `5` — keep it at the production value so the limit is actually exercised before release |
| **Production** | `5` |
| **Consequence if wrong** | Too low: legitimate visitors — especially several people behind one hotel NAT — get blocked with 429 and the enquiry is lost. Too high: the endpoint becomes a spam and email-amplification vector. |
| **Caveat** | The limiter is **in-memory and per-instance**. The real-world ceiling is `MAX × number of live instances`. See `docs/troubleshooting/troubleshooting.md` §6. |

### 2.4 `BOOKING_RATE_LIMIT_WINDOW_MS`

| Property | Value |
| --- | --- |
| **Purpose** | Length of the sliding rate-limit window, in milliseconds. |
| **Exposure** | **SERVER-ONLY.** |
| **Required** | Optional — default applies if unset. |
| **Default** | `600000` (10 minutes) |
| **Format** | Positive integer, milliseconds. `600000` = 10 min · `3600000` = 1 hr |
| **Local / Staging / Production** | `600000` |
| **Consequence if wrong** | A very large window plus serverless instance churn makes behaviour unpredictable — an instance that is recycled loses its counters entirely. Do not raise this above one hour without moving to a shared store. |

---

## 3. Pipeline configuration (GitHub)

These are **not** application variables. They are never read by application code and
must never be added to `.env.example`.

| Name | Kind | Where configured | Purpose | Notes |
| --- | --- | --- | --- | --- |
| `VERCEL_TOKEN` | **Secret** | GitHub → Settings → Environments → `staging` / `production` → Environment secrets | Authenticates the Vercel CLI in `deploy.yml` | Team token, scoped to the Noble Path project only. Never a personal account-wide token. Set a 90-day expiry. |
| `VERCEL_ORG_ID` | **Secret** | Same, per environment | Vercel team identifier | Not strictly confidential, but kept as a secret so all three deploy inputs are handled identically. |
| `VERCEL_PROJECT_ID` | **Secret** | Same, per environment | Vercel project identifier | As above. |
| `DEPLOY_BASE_URL` | Variable (not secret) | GitHub → Settings → Environments → `<env>` → Environment variables | Base URL the post-deploy smoke check hits | `https://staging.noblepath.lk` / `https://noblepath.lk` |
| `NEXT_PUBLIC_SITE_URL` | Inline literal in `ci.yml` | `.github/workflows/ci.yml` | Satisfies the build in CI | Deliberately set to `https://ci.invalid` — a build-only placeholder so CI never produces a deployable artefact with a real URL, and so CI needs no secrets and passes on fork PRs. |

**Why environment-scoped, not repository-scoped:** a repository secret is visible to
every job in every workflow. An environment secret resolves only inside a job that
declares `environment: <name>`. Because `deploy-production` is the only job declaring
`environment: production`, the production Vercel token is only decryptable *after* a
human has approved the run. Scoping is part of the approval gate, not separate from it.

---

## 4. Where secrets live, per environment

| Environment | Store | Who can read | Injection mechanism |
| --- | --- | --- | --- |
| **Local** | `.env.local` on the developer's machine | That developer | Next.js loads `.env.local` automatically. Git-ignored via `.env*.local`. **Never commit it; never paste its contents into a ticket, chat message or AI conversation.** |
| **Preview** | Vercel project → Environment Variables → Preview scope | Vercel team members | Injected into the build and runtime by Vercel |
| **Staging** | Vercel (app vars, Preview/Staging scope) + GitHub Environment `staging` (deploy credentials) | Vercel team members; GitHub repo admins | Vercel injects app vars; GitHub injects deploy credentials into the job |
| **Production** | Vercel (app vars, Production scope) + GitHub Environment `production` (deploy credentials) | Restricted: Vercel team admins; GitHub environment reviewers | As above, **after human approval** |

### Rules

1. Secrets are **never** committed to the repository, in any form, including
   examples, comments, test fixtures and documentation.
2. Secrets are **never** printed. No `echo $TOKEN`, no `env | sort` in a workflow, no
   `console.log(process.env)` in application code. GitHub masks known secret values in
   logs, but masking is a safety net, not a control — a base64'd or partially printed
   secret defeats it.
3. Secrets are **never** written to a file inside a CI workspace, because the workspace
   can be uploaded as an artifact.
4. Secrets are **never** passed through a workflow `output`, a job output, or a
   `GITHUB_ENV` line.
5. `.dockerignore` excludes every `.env*` file so no credential can enter an image
   layer. Image layers are permanent — a secret added and later removed is still in
   history.
6. `.env.example` contains **names and safe defaults only**, never a real value.

---

## 5. Rotation procedure

Rotation is a production-affecting change. **Rotating a credential can cause an
outage; get human approval before rotating anything in production.**

### 5.1 `VERCEL_TOKEN` (routine — every 90 days, or immediately on suspected exposure)

1. Vercel → Account/Team Settings → Tokens → create a **new** token, scoped to the
   Noble Path project, with a fresh 90-day expiry.
2. Update the `staging` GitHub Environment secret first.
3. Run a staging deploy. Confirm it succeeds end to end, including the smoke check.
4. Update the `production` GitHub Environment secret.
5. Dispatch a production deploy of the **already-live commit** (a no-op redeploy) and
   have it approved. Confirm it succeeds. This validates the new token without
   shipping a change.
6. **Only then** revoke the old token in Vercel.
7. Record the rotation date and the next due date in the team calendar.

Order matters: create-verify-then-revoke. Revoking first turns a routine task into an
outage of the deploy path.

### 5.2 `BOOKINGS_NOTIFICATION_EMAIL`

Not a secret, but changing it silently redirects business leads.

1. Confirm the new mailbox exists and is monitored.
2. Change it in staging, submit a test enquiry, confirm delivery.
3. Get explicit approval from the Noble Path owner — this changes who receives
   customer enquiries.
4. Change it in the Vercel Production scope and **redeploy** (a variable change alone
   does not take effect on an existing deployment).
5. Submit a real test enquiry on production and confirm delivery.
6. Update this document.

### 5.3 `NEXT_PUBLIC_SITE_URL`

Changing it requires a rebuild (§1). Sequence: DNS ready → change the variable →
deploy → verify canonical tags and Open Graph URLs → update this document.

### 5.4 Emergency: a secret has leaked

1. **Revoke first, investigate second.** Vercel → Tokens → revoke the exposed token.
   An exposed credential is more dangerous than a broken deploy pipeline.
2. Issue a replacement and update the GitHub Environment secret.
3. If it was committed to Git: revoking is the fix. **Rewriting history is not** —
   assume anything pushed was captured. Rewriting history in a shared repository is
   itself a destructive change requiring approval.
4. Review Vercel audit logs for use of the credential between exposure and revocation.
5. Notify the Cybersecurity Engineer and record the incident in
   `docs/security/vulnerabilities.md` with timeline, blast radius and remediation.
6. Do **not** quietly fix it. Fortechz policy forbids silently removing security
   findings.

---

## 6. Adding a new environment variable — checklist

```text
[ ] Is it genuinely needed, or can it be a constant in code?
[ ] Does it contain anything sensitive? If yes, it MUST NOT be NEXT_PUBLIC_*
[ ] Added to .env.example with a safe placeholder and a comment (Full-Stack Engineer)
[ ] Documented in §2 of this file: purpose, exposure, required, default, format,
    per-environment values, consequence if wrong
[ ] Set in Vercel for Preview, Staging and Production scopes
[ ] Application validates it at startup and fails loudly if a required var is missing
[ ] If it affects the build, ci.yml has a safe placeholder so fork PRs still pass
[ ] If secret: confirmed it is not echoed, not written to a file, not in an output
[ ] docs/deployment/deployment.md pre-deploy checklist still accurate
[ ] Reviewed by the DevOps Engineer (environment configuration is DevOps scope)
```

---

## 7. Known gaps and required actions

| # | Gap | Impact | Owner |
| --- | --- | --- | --- |
| 1 | **Resolved (D-23).** `lib/env.ts` validates required vars with Zod at module load and throws in production when one is missing. It existed before D-23 but was dead code — nothing under `app/` imported it, since `/api/bookings` did not exist, so it had never actually run. `RESEND_API_KEY` was added under the same treatment. | Was High — silent loss of business leads | Closed. Now genuinely enforced: `next build` fails immediately if `BOOKINGS_NOTIFICATION_EMAIL` or `RESEND_API_KEY` is unset, because Next evaluates route modules during build-time page-data collection, not only at request time. |
| 2 | No automated check that a server-only variable has not leaked into the client bundle. | Medium — NFR-6 is enforced by convention only | Full-Stack / DevOps: add a post-build grep step (see §1) to `ci.yml` once the variable list is stable. |
| 3 | The rate-limit variables have no effect across instances (in-memory limiter). | Medium — NFR-8 is weaker in practice than the configured value implies | Documented limitation for v1; revisit when a datastore exists. |
| 4 | Vercel token expiry is a calendar reminder, not an automated alert. | Low — an expired token breaks deploys, not the site | DevOps: revisit if deploy frequency increases. |

---

## 8. Change log

| Date | Change | By |
| --- | --- | --- |
| 2026-09-19 | Initial specification of all four application variables from `.env.example`, pipeline secrets, per-environment storage, rotation procedures and known gaps. Nothing provisioned. | DevOps Engineer |
| 2026-09-23 | Added `RESEND_API_KEY` and `RESEND_FROM_EMAIL` (D-23, booking delivery). Closed gap #1 — `lib/env.ts`'s startup validation is now actually exercised by `POST /api/bookings`, not dead code. | Full-Stack Engineer |
