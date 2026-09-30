# Changelog

Significant changes, newest first (Fortechz policy §16). Decisions behind each entry are in
`docs/decisions/architecture-decisions.md`.

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
