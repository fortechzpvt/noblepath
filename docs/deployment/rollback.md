# Noble Path — Rollback Procedures

**Project:** Noble Path
**Owner:** Fortechz — DevOps Engineer
**Status:** Proposed and approved for v1 build
**Last updated:** 2026-09-19

---

> **Status note.** No environment is provisioned yet (see
> `docs/deployment/deployment.md` §"Current status"). This is the approved
> procedure to follow once staging and production exist. **These steps have not
> been rehearsed against live infrastructure** — a rehearsal on staging is a
> required action before the first production deploy (§8).

---

## 0. The rule

**Roll back first. Diagnose afterwards.**

Rolling back a Vercel deployment means re-pointing an alias at a build that already
exists. It takes seconds, needs no build, and is itself reversible. Debugging a live
production incident while visitors are seeing errors is not a trade worth making.

The instinct to "just push a quick fix" is the wrong one: a forward fix needs a branch,
CI (~5 min), a build (~2 min) and an approval, and it ships code that has never run
anywhere. Rollback returns you to a known-good state in under two minutes.

---

## 1. Detecting a bad deploy

### 1.1 Caught automatically

| Signal | Where | Meaning |
| --- | --- | --- |
| `verify` job fails | GitHub Actions | Broken before anything deployed. **Not a rollback** — fix forward on a branch. |
| Approval gate not approved | GitHub Actions | Production was never touched. No action. |
| `vercel deploy` step fails | GitHub Actions | The new build never became live. Production still serves the previous deployment. **Usually no rollback needed — verify, then fix forward.** |
| **Smoke check fails (`/api/health` ≠ 200)** | GitHub Actions | The deployment is live and unhealthy. **Roll back now.** |

### 1.2 Caught by a human or by monitoring

Roll back if, after a deploy, any of these are true:

- `/api/health` returns non-200, or the home page returns 5xx.
- 5xx rate exceeds ~1% of requests over 5 minutes.
- p95 latency more than doubles against the pre-deploy baseline.
- `/api/bookings` or `/api/rides` rejects valid submissions, or returns 5xx — **booking enquiries are
  the business outcome of the entire site; losing them is a severity-1 incident even
  if every page renders perfectly.**
- The hero or primary imagery fails to load (CSP violation, broken remote pattern).
- A CSP violation blocks fonts or scripts site-wide.
- Console errors indicate a hydration failure on primary pages.
- LCP on the home page regresses past 2.5s on 4G mobile (NFR-1).
- Any secret or internal detail is visible in a client response.

### 1.3 Baseline

You cannot detect a regression without a baseline. Before a production deploy, record
from the Vercel dashboard: current 5xx rate, p95 latency, and the **deployment ID
currently serving production**. Put the deployment ID in the team channel with the
deploy announcement — that is the thing you will roll back to, and hunting for it
during an incident wastes the minutes that matter.

---

## 2. Rollback — Vercel (the v1 production path)

### 2.1 Dashboard (preferred — fastest, works on a phone)

1. Vercel → Noble Path project → **Deployments**.
2. Find the last known-good production deployment (the ID you recorded in §1.3).
   Confirm its commit SHA is the one you expect.
3. **⋯** menu → **Promote to Production** (in some UI versions: **Rollback** /
   **Instant Rollback**).
4. Confirm.
5. Verify: `curl -i https://noblepath.lk/api/health` → expect `200`. Load the home
   page. Submit a test booking enquiry.

**Time to recover: under 2 minutes**, because no build runs — the alias moves to an
existing immutable deployment.

### 2.2 CLI (when the dashboard is unavailable, or you prefer a scripted path)

```bash
# Requires a Vercel token in your shell. NEVER paste the token into a shared
# channel, a ticket, or an AI conversation.
npm i -g vercel@48
export VERCEL_TOKEN=...            # from your own password manager, not from CI

vercel ls noble-path               # list deployments; identify the good one
vercel promote <deployment-url-or-id>
curl -i https://noblepath.lk/api/health
```

### 2.3 Rollback by redeploying an older commit (slower fallback)

Only if instant rollback is unavailable. This **rebuilds**, so it takes 5–8 minutes
and needs the approval gate again.

1. `git revert <bad-sha>` on a branch — **revert, do not force-push `main`.** A force
   push to a shared branch is a destructive change requiring human approval, and it
   breaks every other clone.
2. PR → CI green → merge to `main`.
3. Staging deploys automatically; verify there.
4. Dispatch `Deploy` with `target=production`, get approval.

---

## 3. Rollback — container platform (escape-hatch path, not used in v1)

If Noble Path is ever running from the committed `Dockerfile`:

1. Identify the previous image tag (always tag images with the commit SHA, never
   deploy `:latest` — `:latest` makes rollback ambiguous and is the single most common
   cause of "we rolled back and nothing changed").
2. Re-deploy the previous tag:
   - Cloud Run: `gcloud run services update-traffic <svc> --to-revisions=<prev>=100`
   - ECS: update the service to the previous task definition revision
   - Fly.io: `fly releases` then `fly deploy --image <previous-image>`
   - Kubernetes: `kubectl rollout undo deployment/noble-path`
3. Wait for the new tasks to pass `HEALTHCHECK` before the old ones drain.
4. Verify `/api/health`.

**Time to recover: 2–5 minutes**, dominated by container start and health-check
stabilisation.

**Important:** because `NEXT_PUBLIC_*` values are baked in at build time, an image is
bound to the environment it was built for. Rolling back means redeploying the previous
**image**, not rebuilding the previous commit with current variables.

---

## 4. Rollback — configuration changes

Configuration changes are the ones people forget to roll back, because no deployment
appears in the list.

| Change | Rollback | Time | Notes |
| --- | --- | --- | --- |
| Server-only env var (e.g. `BOOKING_RATE_LIMIT_MAX`) in Vercel | Restore the previous value **and redeploy** | ~3 min | A variable change does not apply to an already-running deployment. Record the old value before changing it. |
| `NEXT_PUBLIC_*` variable | Restore the old value, **rebuild and redeploy** | 5–8 min | Baked into the bundle at build time. |
| GitHub Environment reviewer list | Re-add the reviewer | ~1 min | **Removing a required reviewer weakens the approval gate.** Never do it to unblock a deploy. |
| Vercel project setting (Node version, build command) | Restore, then redeploy | 5–8 min | Screenshot or note the old setting before changing it. |
| **DNS record** | Restore the previous record | **Up to the old TTL — potentially hours** | See §5. Not a fast rollback. |

---

## 5. What cannot be rolled back (or not quickly)

Be honest about these before you take the action, not after.

| Action | Why it is hard or impossible to reverse |
| --- | --- |
| **DNS changes** | Resolvers worldwide cache the old record for its TTL. Reverting the record does not flush those caches. A bad apex record can mean hours of partial outage. Lower TTL to 300s *in advance*, wait for the old TTL to expire, then change. **Requires explicit human approval.** |
| **HSTS preload submission** | `max-age=63072000; includeSubDomains; preload` is already served. Once the domain is on the browser preload list, removal takes months and ships with browser releases. Every subdomain must serve valid HTTPS, forever. Treat preload submission as a one-way door. |
| **A revoked credential** | Revocation is immediate and irreversible. You must issue a new one. This is why §5.1 of `environment.md` says create-verify-then-revoke. |
| **Booking enquiries lost during an outage** | v1 has no database (ADR-002). An enquiry that fails to send is **gone** — there is no queue, no retry and no dead-letter store. If `/api/bookings` was broken for 40 minutes, those leads do not exist anywhere. This is the most expensive consequence of a slow rollback on this project and the strongest argument for the §0 rule. |
| **Emails already sent** | A misconfigured `BOOKINGS_NOTIFICATION_EMAIL` that sent enquiries to the wrong mailbox cannot be unsent. Contact the recipient and confirm deletion. |
| **A secret committed and pushed** | Assume it is captured the moment it is pushed. Rotate; do not rely on history rewriting. |
| **Content or imagery already indexed** | If staging was accidentally public and indexed, `noindex` fixes it going forward but de-indexing takes weeks. |
| **`public/` assets replaced in place** | Not content-hashed. Intermediary caches may serve the old file after a rollback and the new file after a redeploy. Prefer new filenames. |

---

## 6. Expected time to recover

| Scenario | Detection | Action | **Total TTR** |
| --- | --- | --- | --- |
| Smoke check fails during deploy | Immediate (automated) | Vercel promote previous | **< 5 min** |
| Bad deploy found by a human within the 10-min verification window | ≤ 10 min | Vercel promote previous | **< 15 min** |
| Regression found later via monitoring | Depends on alert thresholds | Vercel promote previous | **alert latency + 5 min** |
| Configuration-only problem | Variable | Restore value + redeploy | **~10 min** |
| Requires a forward fix (rollback insufficient) | Variable | Branch → CI → staging → approval → production | **30–60 min** |
| DNS misconfiguration | Minutes | Restore record, wait for TTL | **TTL-bound; up to hours** |

**Target for v1: any production regression is back to a known-good state within
15 minutes of detection.**

---

## 7. Who to notify

| Situation | Notify | When |
| --- | --- | --- |
| Rollback performed on production | Noble Path owner + the full project team, in the team channel | Immediately — before diagnosing |
| Booking endpoint was broken | Noble Path owner **explicitly** | Immediately, with the outage window, so lost leads can be reasoned about |
| Security-relevant cause (leaked secret, CSP bypass, auth/validation flaw) | Cybersecurity Engineer | Immediately, and record in `docs/security/vulnerabilities.md` |
| Cause is in application code | Full-Stack Engineer | Immediately, with the failing commit SHA |
| Cause is infrastructure, pipeline or configuration | DevOps Engineer | Immediately |
| Cause is a UI regression against the approved spec | UI/UX Designer | Same day |
| Any rollback at all | Record in `docs/troubleshooting/troubleshooting.md` if it reveals a new failure mode | Within one working day |

### Rollback announcement template

```text
ROLLBACK — Noble Path production

When:            2026-__-__ __:__ (Asia/Colombo)
Rolled back:     <bad deployment ID / commit SHA>
Rolled back to:  <good deployment ID / commit SHA>
Detected by:     <smoke check | monitoring alert | manual verification>
Symptom:         <what visitors experienced>
Booking impact:  <none | enquiries failed between __:__ and __:__ — N leads at risk>
Current state:   <verified healthy: /api/health 200, test enquiry delivered>
Owner of fix:    <agent/person>
Next step:       <investigation / forward fix / post-incident note>
```

---

## 8. Post-rollback

1. **Do not re-deploy the same commit** hoping it was transient. Find the cause first.
2. Capture evidence before it ages out: failing run logs, Vercel function logs,
   browser console output, response headers.
3. Fix forward on a branch, with a test that reproduces the failure. If it was not
   caught by `verify`, the pipeline has a gap — widen the pipeline, not just the fix.
4. Add a runbook entry to `docs/troubleshooting/troubleshooting.md` if it is a new
   failure mode.
5. If it was security-relevant, the Cybersecurity Engineer records it in
   `docs/security/vulnerabilities.md`. **Never delete a finding to make a report look
   clean** (Fortechz policy §18).
6. Update this document if the procedure itself proved wrong or slow.

---

## 9. Required actions

| # | Action | Owner | Why |
| --- | --- | --- | --- |
| 1 | Implement `app/api/health/route.ts` | Full-Stack Engineer | Every automated detection path in §1.1 depends on it |
| 2 | **Rehearse a rollback on staging** — deploy twice, promote the first deployment back, time it, record the result in `docs/testing/test-results.md` | DevOps Engineer + a human with Vercel access | An unrehearsed rollback procedure is a hypothesis, not a plan |
| 3 | Configure monitoring alerts per `docs/architecture/infrastructure-architecture.md` §6 | DevOps Engineer | §1.2 detection is manual until alerts exist |
| 4 | Decide and document who the named production approvers are | Noble Path owner | The approval gate needs real people behind it |
| 5 | Consider a durable store or queue for booking enquiries in v1.1 | Orchestrator / Full-Stack | Removes the "lost leads are unrecoverable" risk in §5 |

---

## 10. Change log

| Date | Change | By |
| --- | --- | --- |
| 2026-09-19 | Initial rollback procedures: detection, Vercel and container rollback paths, configuration rollback, irreversible actions, TTR targets, notification matrix. Not yet rehearsed. | DevOps Engineer |
| 2026-09-25 | D-24: `/api/rides` added to the §1.2 rollback triggers alongside `/api/bookings`. | DevOps Engineer |
