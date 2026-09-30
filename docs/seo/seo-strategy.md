# Noble Path: SEO Strategy and Implementation

**Introduced by:** D-38 (2026-09-30) · **Owners:** Full-Stack (on-page), DevOps (performance, headers), the owner (off-site)

## 1. Goal, stated honestly

The owner asked for **#1 on Google for "travel trip planner"**.

- **That is not achievable** with on-site work. The results for "travel trip planner" and "trip
  planner" (checked 2026-09-30) are global planning apps with very high authority: Wanderlog,
  TripIt, Canva, AAA TripTik, Trip.com, Roadtrippers, Tripadvisor. Google reads the query as "a tool
  for any destination", which a single-country operator does not match.
- **The realistic target** is to rank at or near #1 for the Sri Lanka searches travellers who
  might book actually use:

| Priority | Query | Difficulty | Who ranks now |
|---|---|---|---|
| 1 | Sri Lanka trip planner / Sri Lanka itinerary planner | Winnable (3–9 months) | Mixed: Tripadvisor operator, Wanderlust, Wanderlog, srilanka.travel, Tikalanka's login-only map |
| 2 | Sri Lanka itinerary 7 / 10 / 14 days | Medium, high value | Rough Guides, kimkim, TourRadar, local operators |
| 3 | Sri Lanka private driver | Medium; reviews decide it | Tripadvisor, Viator, exact-match local domains |
| 4 | plan a trip to Sri Lanka | Medium | Rough Guides, Nomadic Matt, blogs |
| — | Sri Lanka tour packages, Sri Lanka travel guide | Hard (OTAs and publishers) | Long-term only |

**At launch of D-38 the site was not indexed at all**: `robots.txt` and `sitemap.xml` returned 404,
and `site:noblepathsrilanka.com` returned nothing. Every ranking starts from that.

## 2. What the code now does (D-38)

| Area | Implementation | File |
|---|---|---|
| robots.txt | Allows all but `/api/`; points to the sitemap. **Disallow-all** on previews/staging | `app/robots.ts` |
| sitemap.xml | 7 static pages + every trip + every destination (35 URLs at D-38), rebuilt on every Publish | `app/sitemap.ts` |
| Indexing guard | Indexable only when `NEXT_PUBLIC_SITE_URL` is exactly `https://www.noblepathsrilanka.com` and `VERCEL_ENV` is `production` (or unset). Else `noindex` | `lib/seo.ts` `indexableFor()` |
| Per-page metadata | Every page sets its own title, description, canonical, og:url, og:title and Twitter card through `pageMetadata()`; no page inherits the home page's any more | `lib/seo.ts`, each `page.tsx` |
| Titles | Keyword-led, ≤ 60 characters with the ` \| Noble Path` suffix (table in §3) | |
| Descriptions | ≤ 155 characters, clipped on a word boundary (`clip()`) | |
| Structured data | Site-wide `TravelAgency` + `WebSite` (`app/layout.tsx`); `TouristTrip` (+ `Offer` only when a real `priceFromUsd` is set) + `BreadcrumbList` on trips; `TouristDestination` + `BreadcrumbList` on destinations; `FAQPage` on `/plan`. All URLs absolute; all JSON escaped | `lib/seo.ts` |
| /plan content | Server-rendered guide: how planning works, all itineraries by length, main destinations, 5 FAQs. 161 → 683 words | `components/plan/plan-guide.tsx` |
| Internal links | Each destination lists the itineraries that visit it; `/plan` links every trip and the main destinations | `app/destinations/[slug]/page.tsx` |
| /experiences | Permanent 308 to `/activities` (was a 307 page); site links point at `/activities` directly | `next.config.ts` |
| Hero video | 26 MB 1440p → 2.7 MB 720p (phones) / 5.8 MB 1080p (≥ 1024 px), `preload="metadata"`, a 208 KB poster preloaded at high priority | `components/home/hero.tsx` |
| Caching | `/images/*` cached for a week plus a day stale-while-revalidate (was revalidated on every visit) | `next.config.ts` |
| Fonts | Unused Poppins 300 dropped (one fewer preload) | `app/layout.tsx` |

## 3. Keyword map

| Page | Primary keyword | Title (suffix ` \| Noble Path` added) |
|---|---|---|
| `/` | Sri Lanka trip planner | Sri Lanka Trip Planner & Private Driver Tours |
| `/plan` | plan a trip to Sri Lanka | Plan Your Sri Lanka Trip: Transfers & Vehicle |
| `/trips` | Sri Lanka itineraries | Sri Lanka Itineraries & Private Tour Packages |
| `/trips/[slug]` | Sri Lanka {N} day itinerary | {Trip}: {N}-Day Sri Lanka Itinerary |
| `/destinations` | places to visit in Sri Lanka | Best Places to Visit in Sri Lanka |
| `/destinations/[slug]` | things to do in {Place} | Things to Do in {Place}, Sri Lanka |
| `/activities` | things to do in Sri Lanka | Things to Do in Sri Lanka: Activities & Experiences |
| `/accommodation` | where to stay in Sri Lanka | Where to Stay in Sri Lanka: Hotels by Budget |
| `/about` | Sri Lanka tour operator | About Noble Path: Local Sri Lanka Trip Planners |
| `/bookings` | book a Sri Lanka tour | Enquire & Book a Sri Lanka Tour |

**Rule for new copy:** every claim must already be true and stated on the site (policy §18,
requirements §7.4). No invented prices, licences, review counts or awards.

## 4. Content still to build (ordered by impact for effort)

1. **Restore an itinerary builder on `/plan`** (owner decision, see D-38 open questions). The
   day-by-day planner with drive times is the one thing no competitor offers without a login, and
   it is what "Sri Lanka trip planner" searchers want. `components/plan/*` still exists.
2. **7, 10 and 14-day itinerary pages**, 1,500–2,500 words each: day-by-day plan, map, drive times,
   best months, cost guidance, 6–8 FAQs, "open in planner".
3. **A "how many days / how to get there / where to stay" block** on every destination page.
4. **Best time to visit Sri Lanka**, a month-by-month page built on the two-monsoon rule.
5. **Sri Lanka private driver** page: vehicles, what's included, how it works, FAQ.
6. **Practical guides:** ETA/visa, the Kandy–Ella train, CMB airport transfers, daily budget.

## 5. Off-site actions (owner): code alone will not rank the site

1. **Google Search Console:** verify the domain (DNS TXT), submit
   `https://www.noblepathsrilanka.com/sitemap.xml`, and request indexing for `/`, `/plan`, `/trips`.
   Check Pages/Coverage weekly.
2. **Bing Webmaster Tools:** import from Search Console (also feeds DuckDuckGo and ChatGPT search).
3. **Google Business Profile** (travel agency / tour operator), with the real address, phone and
   photos; ask every customer for a review.
4. **Tripadvisor** operator listing; Trustpilot; consider Viator/GetYourGuide for driver hire.
5. **SLTDA registration** shown on the site once held; listing on srilanka.travel; trade
   directories and marketplaces (TourRadar, kimkim).
6. **Backlinks:** hotels and activity partners, travel bloggers, local press.
7. **Publish contact details and social profiles on the site.** The site has no phone, email,
   address, logo or favicon today, so the `TravelAgency` schema cannot carry them. Add them and
   extend `app/layout.tsx` (`address`, `telephone`, `email`, `logo`, `sameAs`).
8. **Measure:** a Search Console baseline now; track ~15 target queries monthly; expect 3–6 months
   before the Sri Lanka queries move.

## 6. Checking it

```bash
curl -s https://www.noblepathsrilanka.com/robots.txt
curl -s https://www.noblepathsrilanka.com/sitemap.xml | grep -c "<loc>"
```

- Google's Rich Results Test on a trip page (`TouristTrip`, `BreadcrumbList`) and on `/plan`
  (`FAQPage`). Google shows FAQ rich results only for some sites; the text still counts.
- PageSpeed Insights (pagespeed.web.dev) for `/`, `/plan` and a destination, mobile. The D-38 audit
  could not get numbers (API rate limit), so the first run after deploy is the baseline.
