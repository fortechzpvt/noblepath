-- Noble Path admin: initial schema (D-36).
-- Applied by `npm run db:migrate` in admin/. Documented in docs/database/database-schema.md.
-- Every statement is idempotent so a half-applied run can simply be re-run.

-- gen_random_uuid() is built into PostgreSQL 13+; Aiven runs 15+.

-- ---------------------------------------------------------------------------
-- Admin identity
-- ---------------------------------------------------------------------------

create table if not exists admin_users (
  id              uuid primary key default gen_random_uuid(),
  email           text not null unique check (email = lower(email) and length(email) <= 254),
  -- scrypt$N$r$p$salt$hash (admin/lib/auth/password.ts). Never the password.
  password_hash   text not null,
  -- AES-256-GCM ciphertext of the TOTP secret, keyed by ADMIN_ENCRYPTION_KEY.
  totp_secret_enc text,
  totp_enabled    boolean not null default false,
  -- Last accepted TOTP time step, so one code cannot be used twice.
  totp_last_step  bigint not null default 0,
  failed_logins   integer not null default 0,
  locked_until    timestamptz,
  created_at      timestamptz not null default now(),
  last_login_at   timestamptz,
  password_changed_at timestamptz not null default now()
);

-- Sessions are opaque random tokens; only their SHA-256 is stored, so a leaked
-- database dump cannot be replayed as a login.
create table if not exists admin_sessions (
  token_hash   bytea primary key,
  user_id      uuid not null references admin_users(id) on delete cascade,
  -- 'mfa' = password accepted, waiting for the authenticator code.
  stage        text not null check (stage in ('mfa', 'active')),
  created_at   timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  expires_at   timestamptz not null,
  user_agent   text
);
create index if not exists admin_sessions_user_idx on admin_sessions (user_id);
create index if not exists admin_sessions_expiry_idx on admin_sessions (expires_at);

-- Failed sign-in attempts per client, for rate limiting before the account is
-- even known. The key is a salted hash of the IP, never the IP itself.
create table if not exists login_attempts (
  client_hash  text not null,
  attempted_at timestamptz not null default now()
);
create index if not exists login_attempts_client_idx on login_attempts (client_hash, attempted_at);

create table if not exists audit_log (
  id         bigserial primary key,
  user_id    uuid references admin_users(id) on delete set null,
  action     text not null,
  entity     text,
  detail     jsonb,
  created_at timestamptz not null default now()
);
create index if not exists audit_log_created_idx on audit_log (created_at desc);

-- ---------------------------------------------------------------------------
-- Content
-- ---------------------------------------------------------------------------

-- One row per destination, experience, trip, stay, activity, category,
-- vehicle, region, plus the single 'site' settings row. `data` is validated
-- against lib/content-schema.ts by the admin before every write and again by
-- the site build (scripts/pull-content.ts).
create table if not exists content_items (
  kind       text not null check (kind in (
               'region', 'destination', 'experience', 'trip', 'accommodation',
               'activity-category', 'activity', 'vehicle', 'site')),
  slug       text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  data       jsonb not null,
  status     text not null default 'draft' check (status in ('draft', 'published')),
  position   integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references admin_users(id) on delete set null,
  primary key (kind, slug)
);
create index if not exists content_items_status_idx on content_items (kind, status, position);

-- What the site build is allowed to read (np_site_build, admin/db/roles.sql).
create or replace view published_content as
  select kind, slug, data, position from content_items where status = 'published';

-- Uploaded images. Resized and re-encoded on upload (EXIF, including GPS, is
-- dropped), then written into the site's public/media/ at build time.
create table if not exists media (
  id          uuid primary key default gen_random_uuid(),
  file_name   text not null,
  ext         text not null check (ext in ('jpg', 'webp', 'png')),
  mime        text not null check (mime in ('image/jpeg', 'image/webp', 'image/png')),
  width       integer not null,
  height      integer not null,
  byte_size   integer not null,
  bytes       bytea not null,
  alt         text not null default '',
  credit      text,
  created_at  timestamptz not null default now(),
  uploaded_by uuid references admin_users(id) on delete set null
);

-- Each "Publish site" press.
create table if not exists site_publishes (
  id           bigserial primary key,
  requested_at timestamptz not null default now(),
  requested_by uuid references admin_users(id) on delete set null,
  ok           boolean not null,
  status_code  integer,
  note         text
);

-- ---------------------------------------------------------------------------
-- Enquiries (written by the public site, read by the admin)
-- ---------------------------------------------------------------------------

-- Booking and ride requests. Personal data: retained for 24 months, then
-- purged from the admin (docs/security/security-review.md, retention).
create table if not exists booking_requests (
  id             text primary key,               -- NP-YYYYMMDD-XXXXXX, as emailed
  kind           text not null check (kind in ('booking', 'ride')),
  plan_choice    text,                           -- 'package' | 'custom' for bookings
  package_slug   text,
  traveller_name text not null,
  email          text not null,
  travel_date    date,
  party_size     integer,
  payload        jsonb not null,                 -- the full validated request
  email_status   text not null check (email_status in ('sent', 'failed', 'not-configured')),
  status         text not null default 'new' check (status in ('new', 'contacted', 'confirmed', 'closed')),
  notes          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists booking_requests_created_idx on booking_requests (created_at desc);
create index if not exists booking_requests_status_idx on booking_requests (status);

-- ---------------------------------------------------------------------------
-- Visitor statistics (no cookies, no IP addresses, no personal data)
-- ---------------------------------------------------------------------------

-- Daily counters only. A page view adds 1 to the row for its day, path,
-- country, device and referrer site.
create table if not exists page_views_daily (
  day           date not null,
  path          text not null,
  country       text not null default '??',
  device        text not null check (device in ('mobile', 'tablet', 'desktop')),
  referrer_host text not null default '',
  views         integer not null default 0,
  primary key (day, path, country, device, referrer_host)
);

-- Unique visitors, counted the way Plausible does: a hash of (daily random
-- salt, IP, user agent). The salt is deleted after two days, after which no
-- hash can be linked to a person or to another day.
create table if not exists visitor_salts (
  day  date primary key,
  salt bytea not null
);
create table if not exists visitors_daily (
  day          date not null,
  visitor_hash bytea not null,
  primary key (day, visitor_hash)
);
