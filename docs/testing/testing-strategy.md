# Noble Path — Testing Strategy

**Status:** Approved for v1
**Last updated:** 2026-09-30 (D-36, §8)

---

## 1. What actually needs testing here

This is a static, unauthenticated content site with one write endpoint. Blanket coverage
targets would produce a lot of tests that assert JSX still renders. The risk is not evenly
distributed, so neither is the testing effort:

| Area | Risk if wrong | Priority |
| --- | --- | --- |
| Booking input validation | Bad or malicious data reaches the server; PII mishandled | **Critical** |
| Rate limiting | Endpoint abused; unbounded memory growth | **Critical** |
| Itinerary generation | Visitor is handed an impossible or empty travel plan | **High** |
| Content integrity (slug references) | Broken links and 404s across the site | **High** |
| Accessibility | Site unusable by keyboard or screen reader; legal exposure | **High** |
| Responsive layout | Site unusable on the phones most tourists browse from | **High** |
| Performance budgets | Fails NFR-1/2/3, harms search ranking | **Medium** |
| Presentational markup | Cosmetic | **Low** |

## 2. Layers

**Static analysis (every commit, in CI)**
- `tsc --noEmit` with `strict` and `noUncheckedIndexedAccess`. On this project the type
  checker *is* a test suite: it is what stops a trip day referencing a destination that
  does not exist.
- `eslint` with `next/core-web-vitals` — catches accessibility and performance mistakes
  at author time.
- `npm audit --audit-level=high` — fails the build on high or critical advisories.

**Build-time integrity checks**
`lib/content.ts` validates every cross-reference at import. A dangling slug fails the
build rather than 404-ing in production. This is cheaper and more reliable than a test
suite asserting the same thing, and it cannot be forgotten when content is added.

**Unit tests** — the deterministic pure functions, where tests pay for themselves:
- `generateItinerary`: determinism (identical input → identical output), day-count never
  exceeds the request, no empty days, seasonal scoring actually shifts the route between
  monsoons, drive-time warnings fire above the threshold, and the boundary cases (1 day,
  30 days, no interests, a single narrow interest).
- `bookingRequestSchema`: each field's accept/reject boundaries, unknown-key rejection,
  the honeypot, past and implausibly-distant arrival dates, and over-length inputs.
- The rate limiter: allows up to the limit, rejects beyond it, expires its window, and
  evicts entries so memory stays bounded.

**Integration tests** — `POST /api/bookings`: happy path returns `201` with a well-formed
reference, invalid input returns `400` with field-level errors, exceeding the limit returns
`429` with `Retry-After`, wrong methods return `405`, and a malformed JSON body does not
produce a stack trace in the response.

**Manual verification (each release, recorded in `test-results.md`)**
- Production build succeeds and boots.
- Every route renders: home, destinations index and detail, experiences, trips index and
  detail, plan, about, bookings.
- Responsive pass at 390 / 768 / 1024 / 1440 / 1920.
- Full keyboard traversal with a visible focus indicator on every interactive element,
  including over photographic backgrounds.
- `prefers-reduced-motion: reduce` disables the cinematic motion.
- Lighthouse on the home page and one detail page.
- Every image loads — no broken remote URLs.

## 3. Accessibility testing (NFR-4, WCAG 2.2 AA)

Automated checks catch perhaps a third of real accessibility defects, so both are required:
- Automated: `eslint-plugin-jsx-a11y` via the Next config, plus axe in the browser.
- Manual: keyboard-only traversal of every flow; VoiceOver on the booking form and the
  itinerary builder; contrast verification of white type over each hero photograph
  (measured against the scrim, not the raw image); zoom to 200% without loss of content.

## 4. Performance budgets

| Metric | Budget | Measured on |
| --- | --- | --- |
| LCP | ≤ 2.5s | Home, 4G throttled, mobile |
| CLS | ≤ 0.1 | All pages |
| INP | ≤ 200ms | Plan page (the most interactive) |
| Hero image transferred | ≤ 300KB | Home |
| Client JS on a content page | ≤ 120KB gzipped | Destination detail |

A budget without a recorded measurement is an aspiration. Results go in `test-results.md`
with the date and conditions.

## 5. Security testing

Owned by the Cybersecurity Agent and recorded in `docs/security/security-review.md`:
input validation boundaries, rate-limit effectiveness, security-header and CSP verification
against the deployed response, absence of secrets in the client bundle (NFR-6), error paths
that must not leak internals, and dependency review.

## 6. What is not tested in v1, and why

- **No visual regression testing.** The design is still moving; snapshots would be noise.
  Introduce it once the design system stops changing.
- **No cross-browser automation.** Manual verification on the NFR-5 matrix is proportionate
  at this size.
- **No load testing.** Static pages are served by a CDN; the single dynamic endpoint is rate
  limited. Revisit when enquiries are persisted.

These are deliberate omissions, recorded so that nobody mistakes them for coverage.

## 7. Definition of done

A change is not complete until: types pass, lint passes, the production build succeeds,
the affected manual checks are re-run and recorded, documentation is updated, and — if the
change touches input handling, PII or headers — the Cybersecurity Agent has reviewed it.

## 8. D-36: automated tests and the end-to-end run

**Unit tests** use `node:test` through `tsx`, with no extra test framework.

| Suite | Command | Covers | Result (2026-09-30) |
| --- | --- | --- | --- |
| Site | `npm test` (root) | `lib/analytics.ts` (path stripping, referrer, device, bot, country); `lib/content-integrity.ts` (bundled content is clean, a removed destination is caught, the 300-minute drive rule); https-only credit links | 7 / 7 pass |
| Admin | `npm test` (in `admin/`) | scrypt hash, verify and policy; AES-GCM seal and open, wrong key, tampering; TOTP window; form parsing for a full trip (days, prices, months, lines, null overnight), blank price, paragraphs, friendly error mapping | 8 / 8 pass |

**Static checks:** lint and typecheck pass in both apps; `next build` passes in both apps.

**End-to-end run.** Performed once by the implementing agent, not automated. It used local
PostgreSQL 18.4 (embedded, from the scratchpad) and production builds of both apps:
1. **Database setup:**
   - migrations applied, and a re-run was a no-op;
   - `roles.sql` applied;
   - the site roles got "permission denied" on `booking_requests` and `content_items`.
2. **Seed:** 363 items loaded; a re-run wrote 0.
3. **Site build from the database:** the same 48 pages. `REQUIRE_DATABASE_CONTENT=true` fails
   with no URL and with a wrong password.
4. **Admin sign-in:**
   - no cookie → redirect;
   - a forged cookie → redirect;
   - password, then a live TOTP code → dashboard;
   - cookie flags verified;
   - five wrong passwords → locked, with every attempt audited.
5. **Admin editing:**
   - enquiry status and notes saved;
   - trip price set;
   - an empty new trip shows 11 field errors;
   - image uploaded, with EXIF, ICC and XMP stripped (checked with sharp);
   - the uploaded image set as a trip photo;
   - unpublishing Ella blocks Publish, listing each reference to it;
   - re-publishing Ella unblocks it;
   - Publish called the deploy hook (seen by a mock hook server).
6. **Site after publish:**
   - rebuilt from the database, with the uploaded image copied to `public/media/`;
   - "From $1,450" on the home carousel and the trip page;
   - the trip page uses the uploaded image.
7. **Site runtime:**
   - two ride requests with a deliberately invalid Resend key were saved with
     `email_status = failed` and still answered 200;
   - page views counted per path, country, device and referrer, with the query string stripped;
   - bot and cross-site beacons ignored.
8. **Screens:** the dashboard charts (colours checked with the dataviz palette validator; hover
   tooltip; legend) and the phone width (no horizontal scroll; the menu collapses).

**Not tested:**
- against Aiven (TLS with Aiven's CA);
- on the real hosting platforms (deploy hook, `x-forwarded-for`, geo header);
- a real Resend send;
- real touch devices or screen readers for the admin;
- load.

