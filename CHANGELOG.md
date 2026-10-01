# Changelog

Significant changes, newest first (Fortechz policy §16). Decisions behind each entry are in
`docs/decisions/architecture-decisions.md`.

## 2026-10-01 — D-39: bug hunt fixes

### Security
- Admin (`noblepathadmin`):
  - every panel page re-checks the admin allowlist (F-39-1, High);
  - password-recovery mode comes from the signed session token, not a forgeable cookie (F-39-2, High);
  - the open redirect in `/auth/callback` is fixed (F-39-7).

### Fixed
- Admin:
  - the editor keeps typed edits after validation errors;
  - saving a deleted item no longer says "Saved.";
  - a HEIC upload no longer causes a 500;
  - sign-out is local to this device and is logged;
  - two admin-only 500s are gone (itinerary JSON, `/enquiries/%25`).
- Site: unknown `/trips/*` and `/destinations/*` slugs serve the full 404 page instead of an empty body.

- Site bookings:
  - pre-planned trip requests are no longer rejected because of hidden seeded entries;
  - "Book this trip" preselects the trip;
  - enquiries with stray control characters are still saved;
  - DB and Resend timeouts are added;
  - stricter number and phone checks, matched in the browser;
  - visitor counts no longer drop at midnight;
  - reference IDs use the Sri Lanka date.
- Data:
  - retention counts from the trip date when it is later;
  - builds list broken content references clearly;
  - licensed images need a credit;
  - the admin's shared-file drift guard works again.

- Site (second pass, all remaining site findings):
  - booking form:
    - /plan transfers carried into /bookings;
    - no stale saved itinerary;
    - server errors land on the right fields;
    - entry dates must fall within the trip, and trips are capped at 120 days;
    - the date minimum follows the visitor's own date;
  - carousel keyboard focus and swipe tap fixed;
  - a map pin dropped outside Sri Lanka snaps back;
  - og:images are resized (3.1 MB to 72 KB);
  - uppercase URLs redirect to lower case;
  - the build checks that every image exists;
  - `/api/track` counts only real pages;
  - the place-search limit is 30 a minute per client.

### Tests
- Admin: `tests/panel-guard.test.ts` and `tests/recovery.test.ts` (8 tests in total).
- Site:
  - `tests/d39.test.ts` (text cleaning, Sri Lanka dates);
  - `tests/booking-d39.test.ts` (hidden entries, phone digits, digits-only legs, using the real server schema);
  - a credit-rule test;
  - field-id mapping, trip-window dates and share images.
  - 22 of 22 pass.

## 2026-09-30 — Security: Next.js 16.3.8

### Security
- `next` and `eslint-config-next` upgraded from 16.3.5 to 16.3.8 (critical GHSA-vcvr-r3jv-pc5j, `next/og` RCE; not used here, so not exploitable). The admin repository has the same upgrade.

## 2026-09-30 — D-38: search engine optimisation

### Added
- `robots.txt` and `sitemap.xml` (35 URLs), which previously returned 404.
- `lib/seo.ts`, with one indexing rule for production and previews.
- JSON-LD:
  - site-wide `TravelAgency` and `WebSite`;
  - `BreadcrumbList` on trips and destinations;
  - `FAQPage` on `/plan`.
- A crawlable planning guide and FAQ on `/plan`, which grew from 161 to 683 words.
- "Itineraries that visit {place}" on destination pages.
- 5 unit tests (`tests/seo.test.ts`).

### Changed
- Keyword-led titles and descriptions on every page; each page now has its own Open Graph data.
- `/experiences` is a permanent 308 to `/activities`.
- Hero video: 26 MB changed to 2.7 MB (phones) or 5.8 MB (desktop), with a poster and `preload="metadata"`.
- `/images/*` is cached for a week.

### Fixed
- The noindex guard for previews compared against the unused `noblepath.lk` and was never applied.

### Documentation
- New `docs/seo/seo-strategy.md`.
- New ADR D-38.
- Updated `environment.md`, the security review and testing §10.

## 2026-09-30 — D-37: database moved to Supabase

### Changed
- **Supabase PostgreSQL** replaces Aiven. The schema, roles and snapshot build are unchanged.
  Connections go through the Supabase pooler, with TLS verified against `prod-ca-2021.crt`.
- `.env.example` documents the pooler strings (session 5432 for the build, transaction 6543
  for the runtime).

### Security
- The Data API lockdown was verified: `anon` and `authenticated` hold no grants on our tables.
- `*.crt` is now ignored by git and Docker.

### Documentation
- New D-37 in the decisions record, the security review (F-37-1 to F-37-3) and testing §9.
- Updated `database-schema.md`, `admin.md`, `environment.md`, `README.md`,
  `system-architecture.md` and `endpoints.md`.

## 2026-09-30

### Added
- **Admin app** (`admin/`, D-36), deployed separately. It has:
  - sign-in with password and authenticator code;
  - a dashboard: enquiries, page views, visitors, top pages, countries, devices, referrers and
    requested trips;
  - enquiry follow-up;
  - editors for trips (day by day), destinations, experiences, stays, activities, categories,
    vehicles, regions and home-page text;
  - a media library, Publish, an activity log, and account security.
- **Aiven PostgreSQL** schema, least-privilege roles, migrations, seeding (D-36).
- **Real prices:** optional "From $X" on trips, experiences, stays, activities and vehicles
  (D-36).
- **`POST /api/track`:** cookie-free page-view counting (D-36).
- Hero split entrance (D-32), 3D trip carousel (D-33), hero scroll fade and laptop fit (D-34),
  trip photographs (D-35).

### Changed
- The site builds its content from the database snapshot when configured (`lib/content-source.ts`).
- Booking and ride requests are also saved. If the email fails but the request is saved, the
  traveller now sees success.
- The content integrity rules moved to `lib/content-integrity.ts` and now also check activity
  categories.

### Security
- New D-36 section in `docs/security/security-review.md` (self-review; independent review
  pending).
- Credit links restricted to https. One `http://` licence link upgraded.
- The site's Docker build takes database credentials as BuildKit secrets.

### Documentation
- New: `docs/database/database-schema.md`, `docs/deployment/admin.md`, `admin/README.md`.
- Updated: system architecture §11, API endpoints, environment, testing strategy §8, handoffs.

### Changed (later on 2026-09-30)
- The admin is prepared for its own repository and Vercel project:
  - photos are resized in the browser before upload (Vercel's 4.5 MB limit);
  - it has its own `.gitignore`;
  - Node is pinned to 24.x;
  - `sync-schema` takes the site repository's path.

### Security (later on 2026-09-30)
- Admin sign-in changed to password only at the owner's request (F-36-10, accepted risk).
- Deployed: Aiven migrated and seeded, roles verified, site building from the database, and
  admin live on Vercel.
- Removed the outdated `admin/` copy from the site repository. The admin lives only in
  `fortechzpvt/noblepathadmin`.
