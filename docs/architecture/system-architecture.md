# Noble Path — System Architecture

**Status:** Approved for v1
**Last updated:** 2026-09-19

---

## 1. One-paragraph summary

Noble Path is a server-rendered Next.js 16 application. Editorial content (destinations,
experiences, trip packages) is typed TypeScript compiled into the build, so almost every
page is static or statically revalidated and served from a CDN edge. The only dynamic
server work in v1 is a single validated, rate-limited `POST /api/bookings` enquiry
endpoint. There is no database, no user accounts and no payment processing in v1.

## 2. Why this shape

The product is a **content-heavy, read-mostly, image-heavy marketing and planning site**
with one small write path. The dominant costs are image delivery and time-to-first-paint,
not compute or data access. An architecture optimised for static delivery therefore beats
a conventional three-tier application on every requirement that matters here (NFR-1,
NFR-2, NFR-9), while removing an entire class of security and operational risk: no
database means no injection surface, no connection pool to exhaust, no backup/restore
burden, and no stored PII beyond what passes transiently through the enquiry endpoint.

The itinerary planner (FR-4) is the one piece that might have suggested a backend. It does
not need one: the algorithm is deterministic and operates on the same compiled content the
client already has, so it runs in the browser with no round trip and works offline.

## 3. Layers

```
┌──────────────────────────────────────────────────────────────────┐
│  Browser                                                          │
│  ├── Server-rendered HTML + streamed RSC payload                  │
│  ├── Client components: filters, itinerary builder, booking form  │
│  └── localStorage: the visitor's saved plan (FR-4.4)              │
└──────────────────────────────┬───────────────────────────────────┘
                               │ HTTPS
┌──────────────────────────────▼───────────────────────────────────┐
│  CDN / Edge                                                       │
│  ├── Static HTML + RSC payloads for all content pages             │
│  ├── Optimised images (AVIF/WebP) from next/image                 │
│  └── Security headers from next.config.ts                         │
└──────────────────────────────┬───────────────────────────────────┘
┌──────────────────────────────▼───────────────────────────────────┐
│  Next.js runtime (Node 24)                                        │
│  ├── React Server Components — render pages from content modules  │
│  ├── /api/bookings — Zod validation, rate limit, reference code   │
│  └── /api/health — liveness probe                                 │
└──────────────────────────────┬───────────────────────────────────┘
┌──────────────────────────────▼───────────────────────────────────┐
│  Content layer (compiled, version-controlled)                     │
│  content/regions.ts · destinations.ts · experiences.ts · trips.ts │
│  lib/content.ts — typed accessors + build-time integrity checks   │
└──────────────────────────────────────────────────────────────────┘
```

## 4. Component responsibilities

| Component | Responsibility | Notes |
| --- | --- | --- |
| `content/*` | The editorial source of truth | Typed data, reviewed like code |
| `lib/content.ts` | Typed queries over content | Throws at build time on dangling slugs |
| `lib/itinerary.ts` | Deterministic itinerary generation | Pure function, no I/O, no randomness |
| `lib/validation.ts` | Zod schemas for all external input | Single place input is trusted from |
| `lib/rate-limit.ts` | Sliding-window limiter for public writes | In-memory — single instance only |
| `app/**/page.tsx` | Server components rendering content | Static by default |
| `components/*` | Presentational + interactive UI | Client components marked explicitly |
| `app/api/bookings` | The only write path | Validated, rate limited, no persistence in v1 |

## 5. Data flow — reading content

1. A request for `/destinations/ella` hits the CDN.
2. On a cache hit the pre-rendered HTML is returned with no origin work.
3. On a miss, the Next.js runtime renders the server component, which calls
   `getDestinationBySlug` against the compiled content module — an in-memory lookup.
4. `next/image` serves the photography in AVIF/WebP at the requested breakpoint.

No network hop, no query, no cache invalidation problem. Content changes ship as a deploy.

## 6. Data flow — a booking enquiry

1. The visitor submits the form. The client validates with the **same Zod schema** the
   server uses, so the error copy is identical on both sides.
2. `POST /api/bookings` re-validates server-side — the client check is a convenience, never
   a control (NFR-7).
3. The rate limiter is consulted by client IP. Over the limit → `429` with `Retry-After`.
4. A reference code is generated with a CSPRNG and returned with `201`.
5. Non-PII metadata plus the reference is logged. The full submission is not logged.

## 7. Trust boundaries

| Boundary | What crosses it | Control |
| --- | --- | --- |
| Browser → Edge | All requests | TLS, HSTS, security headers |
| Browser → `/api/bookings` | Untrusted user input | Zod `.strict()`, rate limiting, honeypot |
| Build → Runtime | Compiled content | Integrity checks fail the build, not production |
| Runtime → Logs | Enquiry metadata | PII excluded by design |
| Page → Unsplash CDN | Image requests only | CSP `img-src` allow-list |

Everything inside the Next.js runtime is a single trust domain. There are no service-to-service
calls in v1.

## 8. What this architecture deliberately does not do

- **No database.** Content is code; enquiries are not persisted. See ADR-002 and ADR-003.
- **No authentication.** There is nothing to log in to. This removes session management,
  password handling and account-takeover risk from v1 entirely.
- **No payment processing.** v1 is enquiry-based, which keeps the project out of PCI-DSS
  scope. See ADR-004.
- **No CMS.** Editors are engineers in v1. See ADR-002 for the migration path.

## 9. Known scaling limits

| Limit | Trigger | Required change |
| --- | --- | --- |
| In-memory rate limiting | More than one running instance | Move to Redis or an edge KV store |
| Content as code | Non-technical editors, or >~200 entries | Introduce a headless CMS behind `lib/content.ts` |
| No enquiry persistence | Enquiry volume beyond manual follow-up | Add PostgreSQL per `docs/database/database-schema.md` |
| Full rebuild per content change | Content changes several times a day | Incremental Static Regeneration or on-demand revalidation |

Each of these is a deliberate v1 trade-off with a known exit, not an oversight.

## 10. Related documents

- `docs/architecture/application-architecture.md` — internal code structure
- `docs/architecture/infrastructure-architecture.md` — runtime topology (DevOps)
- `docs/security/security-architecture.md` — controls and threat model
- `docs/decisions/architecture-decisions.md` — the ADRs referenced above
