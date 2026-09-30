# Noble Path — Database Schema (Aiven PostgreSQL)

**Introduced by:** D-36 (2026-09-30) · **Source of truth:** `admin/db/migrations/*.sql`

Before D-36 there was no database (ADR-003). Now:
- Aiven PostgreSQL holds everything the admin app edits and reads.
- The public site uses it in only two narrow ways:
  - its **build** reads published content;
  - its **runtime** writes enquiries and visit counts.

## 1. Roles (least privilege)

Created by hand from `admin/db/roles.sql` after the first migration.

| Role | Used by | Can | Cannot |
|---|---|---|---|
| `avnadmin` | `npm run db:migrate` only | Everything (Aiven owner) | — (never given to an app) |
| `np_admin` | Admin app, `admin:create`, `db:seed` | Read/write all tables | Create schema objects |
| `np_site_build` | Site build (`CONTENT_DATABASE_URL`) | `select` on the `published_content` view; `select (id, ext, bytes)` on `media` | See drafts, enquiries, users, sessions, statistics |
| `np_site_runtime` | Site runtime (`DATABASE_URL`) | `insert` into `booking_requests`, `page_views_daily`, `visitors_daily`; update `page_views_daily.views`; manage `visitor_salts` | Read any enquiry, content, user or session |

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
| `totp_secret_enc` | text | AES-256-GCM ciphertext (key `ADMIN_ENCRYPTION_KEY`) |
| `totp_enabled` | boolean | set only by `admin:create` |
| `totp_last_step` | bigint | last accepted TOTP step; a code is accepted once |
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

## 3. Migrations

- **What:** `admin/db/migrations/NNN_name.sql`, applied in name order by `npm run db:migrate`
  (in `admin/`). Each file is applied once, in a transaction, and recorded in
  `schema_migrations`.
- **How:** run with `MIGRATION_DATABASE_URL`, the `avnadmin` connection string. Every statement
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
