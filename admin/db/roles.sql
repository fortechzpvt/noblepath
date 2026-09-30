-- Noble Path: database roles (D-36). Run ONCE, by hand, as the Aiven
-- `avnadmin` user, after 001_init.sql. Replace each CHANGE_ME with a long
-- random password (e.g. `openssl rand -base64 32`) and store it only in the
-- hosting platform's secret settings. Never commit real passwords.
--
-- Least privilege: each app can do exactly what it needs and nothing else.
--
--   np_admin        the admin app. Owns and manages everything.
--   np_site_build   the public site's BUILD step. Reads published content and
--                   media only. Cannot see drafts, enquiries, users or stats.
--   np_site_runtime the public site at RUN time. Can add enquiries and visit
--                   counts. Cannot read enquiries back, or read anything else.

create role np_admin login password 'CHANGE_ME';
create role np_site_build login password 'CHANGE_ME';
create role np_site_runtime login password 'CHANGE_ME';

-- The admin app runs migrations and owns the tables.
grant all on all tables in schema public to np_admin;
grant all on all sequences in schema public to np_admin;
alter default privileges in schema public grant all on tables to np_admin;
alter default privileges in schema public grant all on sequences to np_admin;

-- Build: published content only, through a view, plus the media it references.
grant select on published_content to np_site_build;
grant select (id, ext, bytes) on media to np_site_build;

-- Runtime: write-only enquiries and visitor counters.
grant insert on booking_requests to np_site_runtime;
grant insert, update (views) on page_views_daily to np_site_runtime;
grant select (day, path, country, device, referrer_host, views) on page_views_daily to np_site_runtime;
grant select, insert, delete on visitor_salts to np_site_runtime;
grant insert on visitors_daily to np_site_runtime;
