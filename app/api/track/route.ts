import { createHash, randomBytes } from "node:crypto";

import { NextResponse, type NextRequest } from "next/server";

import { countryOf, deviceOf, isBot, normalizePath, referrerHost, colomboDay } from "@/lib/analytics";
import { isKnownDestinationSlug, isKnownTripSlug } from "@/lib/content";
import { getDb } from "@/lib/db";
import { clientKey } from "@/lib/enquiry-endpoint";
import { createRateLimiter } from "@/lib/rate-limit";

/**
 * `POST /api/track` — one page view, sent by `components/analytics-beacon.tsx` (D-36).
 *
 * Privacy by design, so no cookie banner is needed:
 * - no cookies, no local storage, no fingerprinting script;
 * - the IP address is never stored. Unique visitors are counted as a hash of
 *   (a random salt for the day, IP, browser), and the salt is deleted after two
 *   days, after which no hash can be tied to anyone or to another day;
 * - only daily totals per page, country, device class and referring site.
 *
 * Always answers 204 with no body, whatever happens, so the endpoint tells a
 * caller nothing. Same-origin only, rate limited, and a no-op without a
 * database.
 */
export const runtime = "nodejs";

const MAX_BODY_BYTES = 1024;
/** A person clicking around generates well under this; a script does not. */
const limiter = createRateLimiter({ max: 120, windowMs: 60_000 });

const noContent = () => new NextResponse(null, { status: 204 });

export async function POST(request: NextRequest): Promise<NextResponse> {
  const db = getDb();
  if (!db) return noContent();

  const site = request.headers.get("sec-fetch-site");
  const origin = request.headers.get("origin");
  if ((site !== null && site !== "same-origin") || (origin !== null && origin !== request.nextUrl.origin)) {
    return noContent();
  }

  const userAgent = request.headers.get("user-agent") ?? "";
  if (isBot(userAgent)) return noContent();

  const ip = clientKey(request);
  if (!limiter.check(ip).allowed) return noContent();

  const length = Number(request.headers.get("content-length") ?? "0");
  if (!Number.isFinite(length) || length <= 0 || length > MAX_BODY_BYTES) return noContent();

  let body: { p?: unknown; r?: unknown };
  try {
    body = JSON.parse(await request.text()) as { p?: unknown; r?: unknown };
  } catch {
    return noContent();
  }
  const path = normalizePath(body.p);
  if (!path || !isSitePage(path)) return noContent();

  // Vercel's header only: `cf-ipcountry` is not set by this host, so a client
  // could send it to pick its own country (D-39, F-39-18).
  const country = countryOf(request.headers.get("x-vercel-ip-country"));
  const device = deviceOf(userAgent);
  const referrer = referrerHost(body.r, request.nextUrl.hostname);

  try {
    // Days are counted in Sri Lanka time, which is how the business reads them.
    // Worked out once, here: before D-39 each statement evaluated now() on its
    // own pooled connection, so around midnight the salt was created for one
    // day and looked up for the next, and the visit was lost (F-39-19).
    const day = colomboDay();
    await db.query(
      `insert into page_views_daily (day, path, country, device, referrer_host, views)
       values ($1, $2, $3, $4, $5, 1)
       on conflict (day, path, country, device, referrer_host)
       do update set views = page_views_daily.views + 1`,
      [day, path, country, device, referrer],
    );

    const salt = await saltFor(db, day);
    if (!salt) return noContent();
    const visitor = createHash("sha256").update(salt).update(ip).update(userAgent).digest();
    await db.query(`insert into visitors_daily (day, visitor_hash) values ($1, $2) on conflict do nothing`, [
      day,
      visitor,
    ]);
  } catch (error) {
    console.error(`[track] Could not record a view: ${(error as Error).message}`);
  }
  return noContent();
}

/**
 * The day's random salt, created on first use. Salts older than yesterday are
 * deleted, on about one visit in fifty rather than on every one.
 */
async function saltFor(db: NonNullable<ReturnType<typeof getDb>>, day: string): Promise<Buffer | null> {
  await db.query(`insert into visitor_salts (day, salt) values ($1, $2) on conflict do nothing`, [day, randomBytes(32)]);
  if (Math.random() < 0.02) await db.query(`delete from visitor_salts where day < $1::date - 1`, [day]);
  const { rows } = await db.query<{ salt: Buffer }>(`select salt from visitor_salts where day = $1`, [day]);
  return rows[0]?.salt ?? null;
}

export async function GET(): Promise<NextResponse> {
  return new NextResponse(null, { status: 405, headers: { Allow: "POST" } });
}

/**
 * Only real pages are counted (D-39, F-39-27). Any lower-case path used to be
 * stored, so a script could add unlimited rows (`/x1`, `/x2`, …) to the
 * statistics tables.
 */
const STATIC_PAGES = new Set(["/", "/plan", "/trips", "/destinations", "/activities", "/accommodation", "/about", "/bookings", "/credits"]);

function isSitePage(path: string): boolean {
  if (STATIC_PAGES.has(path)) return true;
  const [, section, slug, extra] = path.split("/");
  if (!slug || extra !== undefined) return false;
  if (section === "trips") return isKnownTripSlug(slug);
  if (section === "destinations") return isKnownDestinationSlug(slug);
  return false;
}

