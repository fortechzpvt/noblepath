# Noble Path Admin

The private admin panel for the Noble Path website (D-36). It is its own repository and its
own Vercel project, separate from the public site, and backed by Aiven PostgreSQL.

The full documentation lives in the **site repository** (NobalPath), under `docs/`:
- **Setup, Vercel deployment and recovery:** `docs/deployment/admin.md`
- **Database:** `docs/database/database-schema.md`
- **Security design and review:** `docs/security/security-review.md` (D-36)
- **The decision and its reasoning:** D-36 in `docs/decisions/architecture-decisions.md`

## What it does

| Area | Pages |
| --- | --- |
| Overview | Dashboard (enquiries, visitors, top pages, countries, devices, referrers, requested trips, content counts) · Enquiries (list, detail, status and notes, 24-month purge) |
| Content | Trips (with day-by-day editor) · Destinations · Experiences · Stays · Activities · Activity categories · Vehicles & prices · Regions · Site text · Media library |
| Site | Publish (with integrity checks) · Activity log · Account & security |

Edits save to the database immediately and go live when you **Publish**, which rebuilds the
public site from everything marked *Published*.

## Local development

```bash
npm ci
cp .env.example .env.local        # fill in DATABASE_URL, DATABASE_CA_CERT, ADMIN_ENCRYPTION_KEY
npm run dev                       # http://localhost:3100
```

- The sign-in cookie is `__Host-` and `Secure`. Browsers allow that on `http://localhost`, but
  anywhere else the admin must be served over HTTPS.
- A local PostgreSQL works without `DATABASE_CA_CERT`.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run db:migrate` | Apply `db/migrations/*.sql` (needs `MIGRATION_DATABASE_URL`, the `avnadmin` account) |
| `npm run admin:create` | Create the one admin account with two-step verification. `-- --reset-password` / `-- --reset-2fa` to recover |
| `npm run sync-schema -- /path/to/NobalPath` | Copy `lib/content-schema.ts`, `lib/content-integrity.ts` and `lib/pg-config.ts` from the site repository |
| `npm test` | Unit tests (auth, encryption, TOTP, form parsing) |
| `npm run lint`, `npm run typecheck`, `npm run build` | The usual |

## Shared code

`lib/content-schema.ts`, `lib/content-integrity.ts` and `lib/pg-config.ts` are **copies** of
the site repository's originals, so both apps validate content identically.
- **Never edit them here.** Change them in the site repository, run
  `npm run sync-schema -- /path/to/NobalPath` here, commit, and deploy the admin before
  publishing content that relies on the change.

## Deploying on Vercel

- **Project:** import this repository as a new Vercel project (Framework: Next.js, root:
  repository root). Node 24 comes from `engines`.
- **Environment variables:** set the five variables from `.env.example`.
- **Deployment Protection:** turn it on.
- **Uploads:** Vercel caps request bodies at 4.5 MB, so the media page resizes photos in the
  browser first.

Full steps: `docs/deployment/admin.md` §6 in the site repository.
