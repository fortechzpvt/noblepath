# Noble Path — Database Schema (Supabase PostgreSQL)

**Introduced by:** D-36 (2026-09-30) · **Source of truth:** `db/migrations/*.sql` (noblepathadmin repository)

Before D-36 there was no database (ADR-003). D-36 used Aiven; **D-37 moved it to Supabase**
(project `mgywzyxewtblqklfdigj`, region `ap-northeast-2`). The schema and roles are the same.
Now:
- Supabase PostgreSQL holds everything the admin app edits and reads.
- The public site uses it in only two narrow ways:
  - its **build** reads published content;
  - its **runtime** writes enquiries and visit counts.

## 1. Roles (least privilege)

Created by hand from `db/roles.sql` (noblepathadmin repository) after the first migration.

| Role | Used by | Can | Cannot |
|---|---|---|---|
| `postgres` | `npm run db:migrate` only | Everything (Supabase owner; was `avnadmin` on Aiven) | — (never given to an app) |
| `anon`, `authenticated` | Supabase Data API (PostgREST) | **Nothing** on our tables: `003_supabase_lockdown.sql` revokes all privileges and the default privileges | Read or write any table through the public API key |
| `np_admin` | Admin app, `admin:create`, `db:seed` | Read/write all tables | Create schema objects |
| `np_site_build` | Site build (`CONTENT_DATABASE_URL`) | `select` on the `published_content` view; `select (id, ext, bytes)` on `media` | See drafts, enquiries, users, sessions, statistics |
| `np_site_runtime` | Site runtime (`DATABASE_URL`) | `insert` into `booking_requests`, `page_views_daily`, `visitors_daily`; `update (views)` and column-level `select (day, path, country, device, referrer_host, views)` on `page_views_daily` (the upsert's `on conflict … do update` needs both; do not remove the select); `select, insert, delete` on `visitor_salts` | Read any enquiry, content, user or session |

These denials were checked against a real PostgreSQL:
- `np_site_build` and `np_site_runtime` both get "permission denied" on `booking_requests`;
- `np_site_runtime` gets "permission denied" on `content_items`.

## 2. Tables

### Admin identity

**`admin_users`** has one row, because Noble Path has a single admin.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | `gen_random_uuid()` |
| `email` | text unique | lower-case, ≤ 254 |
| `password_hash` | text | `scrypt$17$8$1$salt$hash`, never the password |
| `totp_secret_enc`, `totp_enabled`, `totp_last_step` | text, boolean, bigint | **Unused since the D-36 revision** (sign-in is password only). Kept so two-step verification can be restored without a migration |
| `failed_logins`, `locked_until` | int, timestamptz | 5 failures → locked 15 min |
| `created_at`, `last_login_at`, `password_changed_at` | timestamptz | |

**`admin_sessions`**:

| Column | Notes |
|---|---|
| `token_hash` (bytea PK) | SHA-256 of the cookie token; the token itself is never stored |
| `user_id` | FK, cascade |
| `stage` | `mfa` (password done, 10 min) or `active` (12 h absolute, 60 min idle) |
| `created_at`, `last_seen_at`, `expires_at` | |
| `user_agent` | Shown on the Account page |

**`login_attempts`**:
- columns: `client_hash`, `attempted_at`;
- one row per failed attempt, where the client is a keyed SHA-256 of the IP (the IP is never
  stored);
- 10 failures in 15 minutes block that client;
- rows are deleted after a day.

**`audit_log`**:
- columns: `id`, `user_id`, `action`, `entity`, `detail` (jsonb), `created_at`;
- `detail` never holds secrets or traveller data;
- a deleted content item's data is kept here so it can be restored by hand.

### Content

**`content_items`**, primary key `(kind, slug)`:

| Column | Notes |
|---|---|
| `kind` | `region`, `destination`, `experience`, `trip`, `accommodation`, `activity-category`, `activity`, `vehicle`, `site` |
| `slug` | The item's key. Lower-case, hyphenated; cannot change after creation (other items reference it) |
| `data` | jsonb, validated against `lib/content-schema.ts` on every write and on every site build |
| `status` | `draft` (hidden from the site) or `published` |
| `position` | Order on the site |
| `created_at`, `updated_at`, `updated_by` | |

- **View:** `published_content` (`kind, slug, data, position where status = 'published'`) is the
  only content the site build can read.
- **Fixed sets:** `region` and `vehicle` keys are fixed (the planner and booking validation
  depend on them). The admin can edit, unpublish and reorder them, but not add or delete.
- **Site text:** `site` has the single key `settings`.

**`media`** holds uploaded images:

| Column | Notes |
|---|---|
| `id` | uuid |
| `file_name` | |
| `ext`, `mime` | jpg/webp/png |
| `width`, `height`, `byte_size` | |
| `bytes` | Re-encoded image; metadata (incl. GPS) removed; ≤ 2400 px wide |
| `alt`, `credit` | Defaults offered when the image is picked |
| `created_at`, `uploaded_by` | |

**`site_publishes`**:
- columns: `requested_at`, `requested_by`, `ok`, `status_code`, `note`;
- one row per Publish press.

### Enquiries

**`booking_requests`** is written by the site's `/api/bookings` and `/api/rides`, and read by
the admin.

| Column | Notes |
|---|---|
| `id` | text PK: the `NP-YYYYMMDD-XXXXXX` reference in the email |
| `kind` | `booking` or `ride` |
| `plan_choice`, `package_slug` | `package` or `custom`; the trip, if one was chosen |
| `traveller_name`, `email` | **Personal data** |
| `travel_date`, `party_size` | For listing and statistics |
| `payload` | The whole validated request (honeypot removed). **Personal data** |
| `email_status` | `sent`, `failed` or `not-configured` |
| `status` | `new`, `contacted`, `confirmed` or `closed`, set in the admin |
| `notes` | Internal; admin only |
| `created_at`, `updated_at` | |

**Retention:** 24 months. The admin's Enquiries page shows how many are older and deletes them
with one click (the action is audited). Retention is not yet automatic; see the known gaps in
`docs/security/security-review.md` (D-36).

### Visitor statistics (no personal data)

| Table | Contents |
|---|---|
| `page_views_daily` | `(day, path, country, device, referrer_host)` → `views`. Days are Sri Lanka dates. Paths never include a query string |
| `visitor_salts` | One random 32-byte salt per day, deleted after two days |
| `visitors_daily` | `(day, sha256(salt ‖ IP ‖ user agent))`. Once the day's salt is deleted, no row can be linked to a person or to another day |

### Connecting on Supabase (D-37)

- **Use the pooler, not the direct host.** The direct host `db.<ref>.supabase.co` is IPv6-only
  on the free plan, and Vercel builds and functions are IPv4.
  - Host: `aws-0-ap-northeast-2.pooler.supabase.com`.
  - **Session mode, port 5432:** the site build, `db:seed`, `db:migrate`.
  - **Transaction mode, port 6543:** the site runtime and the admin (serverless functions).
- **User names carry the project ref:** `np_site_build.mgywzyxewtblqklfdigj`, and so on.
- **TLS:** verified against `prod-ca-2021.crt` ("Supabase Root 2021 CA") in
  `DATABASE_CA_CERT`. Verified on both pooler ports on 2026-09-30.
- **Applied migrations (2026-09-30):** `001_init.sql`, `002_supabase_auth.sql`,
  `003_supabase_lockdown.sql`. 363 content items published; 0 grants to `anon`/`authenticated`.

## 3. Migrations

- **What:** `db/migrations/NNN_name.sql` in the noblepathadmin repository, applied in name order by `npm run db:migrate`
  (in the noblepathadmin repository). Each file is applied once, in a transaction, and recorded in
  `schema_migrations`.
- **How:** run with `MIGRATION_DATABASE_URL`, the `postgres` (owner) connection string. Every statement
  in `001_init.sql` is idempotent (`if not exists`).
- **Rollback of 001:** nothing depends on it outside the admin, so drop the tables in reverse
  order. The site keeps working: without `CONTENT_DATABASE_URL` it builds from the bundled
  content, and without `DATABASE_URL` enquiries are only emailed.
- **Risks for future migrations:**
  - a change to `content_items.data`'s shape must go through `lib/content-schema.ts` first, or
    the next site build rejects the content;
  - renaming a column the site runtime writes (`booking_requests`, `page_views_daily`) needs a
    coordinated site deploy.

## 4. Seeding

`npm run db:seed` (repository root, `ADMIN_DATABASE_URL` = `np_admin`):
- loads the 363 items bundled in `content/*.ts`, plus the default vehicles and site text, as
  published;
- validates everything first and writes nothing on a validation failure;
- skips rows that already exist, so it is safe to re-run;
- `--dry-run` validates only; `--force` overwrites.
