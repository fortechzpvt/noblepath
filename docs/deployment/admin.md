# Noble Path Admin — Setup and Operations Runbook

**Introduced by:** D-36 (2026-09-30)

The admin app is a separate Next.js app in **its own repository** (originally this project's
`admin/` folder), deployed as its own Vercel project.
It needs Aiven PostgreSQL and the public site's deploy hook. Follow the steps in order.

## 1. Aiven PostgreSQL

1. Create an **Aiven for PostgreSQL** service. The smallest paid plan is enough; pick a cloud
   region near the hosting region.
2. From the service overview, copy:
   - the **Service URI** (it contains the `avnadmin` password);
   - the **CA certificate**, saved as `ca.pem`.

   Keep both out of the repository.
3. **Networking:** restrict *Allowed IP addresses* if the hosting platforms publish fixed egress
   IPs. Otherwise rely on TLS, strong passwords and the narrow roles below.
4. Enable Aiven's automatic backups (on by default) and note the retention period in this
   document.

## 2. Create the schema and roles

From a trusted computer, in the **admin repository**:

```bash
npm ci

# Schema (as the owner account)
MIGRATION_DATABASE_URL='postgres://avnadmin:…@….aivencloud.com:12345/defaultdb?sslmode=require' \
DATABASE_CA_CERT="$(cat ca.pem)" npm run db:migrate
```

Then run `db/roles.sql` (admin repository) as `avnadmin` (Aiven console → *Query editor*, or `psql`).
Replace each `CHANGE_ME` with a different random password from `openssl rand -base64 32`, and
store each one only in the hosting platform's secret settings.

## 3. Load the current content

In **this (site) repository**, which holds the content to load:

```bash
ADMIN_DATABASE_URL='postgres://np_admin:…@…/defaultdb?sslmode=require' \
DATABASE_CA_CERT="$(cat ca.pem)" npm run db:seed
```

## 4. Create the admin account (with two-step verification)

In the **admin repository**:

```bash
DATABASE_URL='postgres://np_admin:…' DATABASE_CA_CERT="$(cat ca.pem)" \
ADMIN_ENCRYPTION_KEY='<the same value the admin app will use>' npm run admin:create
```

- Generate `ADMIN_ENCRYPTION_KEY` once with `openssl rand -base64 32`.
- The script asks for the email and password at prompts, never as arguments.
- It shows a QR code for an authenticator app and switches two-step verification on only after
  a correct code.
- There can be only one admin account.

## 5. Deploy the public site with the database

Set these on the site project (Vercel → Settings → Environment Variables, Production). See
`environment.md` for the full list.

| Variable | Value |
|---|---|
| `CONTENT_DATABASE_URL` | `np_site_build` connection string. **Build time.** |
| `DATABASE_URL` | `np_site_runtime` connection string. **Runtime.** |
| `DATABASE_CA_CERT` | Contents of `ca.pem` (PEM text, or base64 of it) |
| `REQUIRE_DATABASE_CONTENT` | `true` in production, so a build without the database fails instead of publishing old bundled content |

Then create a **Deploy Hook** for the production branch (Vercel → Settings → Git → Deploy
Hooks). Its URL is `SITE_DEPLOY_HOOK_URL` below, and it is a secret.

## 6. Deploy the admin (its own repository, on Vercel)

The admin lives in **its own Git repository**, a copy of this project's `admin/` folder, and is a
**separate Vercel project** on its own hostname (e.g. `admin.noblepath.lk`). Do not put it on a
path under the public site.

**Vercel project settings:**
- **Framework:** Next.js.
- **Root directory:** the repository root.
- **Build command:** `npm run build`.
- **Node:** 24.x (pinned by `engines` in `package.json`).
- **Region:** the one closest to the Aiven service.

**Environment variables** (Production, and Preview only if previews should reach the
database):

| Variable | Value |
|---|---|
| `DATABASE_URL` | `np_admin` connection string |
| `DATABASE_CA_CERT` | Contents of `ca.pem` |
| `ADMIN_ENCRYPTION_KEY` | The value used in step 4. Changing it makes the stored authenticator secret unreadable; reset 2FA afterwards (§8) |
| `PUBLIC_SITE_URL` | `https://noblepath.lk`. Also read at **build** time for the image CSP, so redeploy after changing it |
| `SITE_DEPLOY_HOOK_URL` | From step 5 |

**Vercel-specific notes:**
- **Uploads:** Vercel refuses request bodies over 4.5 MB. The media page shrinks photos to at
  most 2400 px in the browser before sending, so this is invisible in normal use. A file the
  browser cannot decode (HEIC outside Safari) must be under 4 MB.
- **HTTPS:** Vercel serves HTTPS, which the `__Host-` Secure session cookie requires.
- **Aiven allow-list:** Vercel functions have no fixed outbound IPs (unless on Secure Compute),
  so Aiven's allow-list must stay open to them. Protection then rests on TLS, the per-role
  passwords and least privilege.
- **Access control:** turn on **Vercel Deployment Protection**, or put Cloudflare Access in
  front, so only you can reach the admin at all (finding F-36-3).

**Container alternative:** `docker build --build-arg PUBLIC_SITE_URL=https://noblepath.lk -t noble-path-admin .`
in the admin repository, then run with the variables above on port 3100.

### Keeping the two repositories in step

- **Shared files:** `lib/content-schema.ts`, `lib/content-integrity.ts` and `lib/pg-config.ts`
  live in **this** (site) repository. The admin repository keeps copies, so both apps validate
  content the same way.
- **After changing any of them here:** run `npm run sync-schema -- /path/to/NobalPath` in the
  admin repository, commit, and deploy the admin **before** publishing content that depends
  on the change. Otherwise the admin saves content the site build rejects, or refuses content
  the site accepts.
- **Migrations:** database migrations live in the admin repository (`db/migrations`), because
  the admin owns the schema.

## 7. Everyday use

- **Edit:** changes save immediately to the database but are **not live** until Publish.
- **Publish:** rebuilds the site from everything marked *Published*. The page refuses while any
  rule fails, such as a published trip pointing at a draft or deleted destination, or a
  package day over 300 minutes of driving, and lists what to fix.
- **Enquiries:**
  - every booking and ride request appears here as well as in email;
  - any marked **not emailed** did not reach the inbox; make sure someone picks them up;
  - requests older than 24 months must be deleted (the page offers a button).
- **Images:** upload in *Media library*, then pick them in any photo field. Always add alt text,
  and for anything not owned, a credit, source URL and licence URL; `/credits` is built from
  them.

## 8. Recovery

| Situation | Action |
|---|---|
| Forgot the password | `npm run admin:create -- --reset-password` (needs `DATABASE_URL`) |
| Lost the authenticator | `npm run admin:create -- --reset-2fa` (needs `DATABASE_URL`, `ADMIN_ENCRYPTION_KEY`) |
| Suspect someone else signed in | Check *Activity log*; reset password and 2FA; *Sign out all other sessions*; rotate `ADMIN_ENCRYPTION_KEY` and `np_admin`'s password |
| Locked out after failed attempts | Wait 15 minutes, or reset the password (which clears the lock) |
| A publish broke something | Vercel → Deployments → promote the previous deployment. Then fix the content and publish again |
| Deleted content by mistake | Activity log → the `content.deleted` entry holds its data; recreate it from that |
| Database unavailable | The live site keeps working: pages are static, and enquiries are still emailed (they are not saved until it returns). Publishing fails safely |

## 9. Rotating secrets

- **Database passwords:** `alter role np_… password '…'` as `avnadmin`, then update the platform
  variable and redeploy.
- **`ADMIN_ENCRYPTION_KEY`:** set the new value, redeploy the admin, then run `--reset-2fa` with
  the new value.
- **Deploy hook:** delete it in Vercel, create a new one, and update `SITE_DEPLOY_HOOK_URL`.
