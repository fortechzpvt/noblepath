# Noble Path

Trip planning for Sri Lanka. Curated destinations, experiences and ready-made trips,
plus an itinerary builder that turns "I have ten days" into a route that actually works.

A Fortechz project.

---

## Quick start

```bash
npm install
cp .env.example .env.local
npm run dev            # http://localhost:3000
```

Other scripts:

```bash
npm run build          # production build
npm start              # serve the production build
npm run typecheck      # tsc --noEmit
npm run lint           # eslint
```

Requires Node 24.

## Stack

| Layer | Choice | Why |
| --- | --- | --- |
| Framework | Next.js 16, App Router, React Server Components | ADR-001 |
| Language | TypeScript, `strict` + `noUncheckedIndexedAccess` | ADR-001 |
| Styling | Tailwind CSS v4, design tokens in `@theme` | ADR-005 |
| Validation | Zod 4, one schema shared by client and server | — |
| Content | Typed TypeScript modules, no CMS or database | ADR-002, ADR-003 |
| Icons | Lucide | design-system.md §10.6 |

## How it fits together

Editorial content lives in `content/` as typed data and is compiled into the build, so
content pages are static and served from the edge. The itinerary planner is a pure,
deterministic function that runs in the browser. The only dynamic server work is a
single validated, rate-limited booking-enquiry endpoint.

There is no database, no login and no payment processing in v1 — each of those is a
recorded decision with a documented exit, not an oversight. Start with
`docs/architecture/system-architecture.md`.

## Documentation

The repository and `docs/` are the source of truth. If it isn't written down, it isn't
project knowledge.

| Topic | Where |
| --- | --- |
| What we're building and why | `docs/requirements/requirements.md` |
| System shape, trust boundaries, scaling limits | `docs/architecture/system-architecture.md` |
| Code structure and conventions | `docs/architecture/application-architecture.md` |
| Runtime topology, monitoring | `docs/architecture/infrastructure-architecture.md` |
| Design tokens, components, flows, a11y | `docs/design/` |
| API reference | `docs/api/` |
| Forward database design | `docs/database/database-schema.md` |
| Security architecture, threat model, review | `docs/security/` |
| Deploy, environments, rollback | `docs/deployment/` |
| Testing strategy and recorded results | `docs/testing/` |
| Every significant decision | `docs/decisions/architecture-decisions.md` |
| Runbook | `docs/troubleshooting/troubleshooting.md` |
| Who did what, and what they handed on | `docs/agents/handoffs.md` |
| Change log | `CHANGELOG.md` |

## Working on this project

1. Read the relevant documentation before changing anything.
2. Make the change. Test it.
3. Update the documentation so it describes what is now true.
4. Record the decision if it was a significant one.

Changes touching authentication, user input, PII or security headers require review by
the Cybersecurity Agent. Infrastructure changes require review by the DevOps Agent.
Production is never modified without explicit human approval.

## Known limitations

These are tracked openly rather than discovered later:

- **Stock photography.** Five photographs are owned; the rest are Unsplash placeholders
  and must be replaced with owned or properly licensed imagery before commercial launch (ADR-006).
- **Enquiries are not persisted.** `POST /api/bookings` validates and returns a reference,
  but v1 has no datastore. Durability depends on the notification path (ADR-003).
- **Rate limiting is in-memory.** It does not survive a restart and does not work across
  multiple instances. A shared store is required before horizontal scaling.
- **Prices are indicative bands**, not live quotes, and are labelled as such.
- **Travel times are advisory**, derived from typical road conditions.
- **`'unsafe-inline'` on `style-src`** is an accepted residual risk; the exit is a
  nonce-based CSP (ADR-008).

## Licence and credits

Photography credits are recorded alongside each image in `content/`. The route-pin vector
is traced from the supplied marker asset.
