import { SRI_LANKA_BOUNDS, isInSriLanka, roundPoint, type GeoPoint } from "@/lib/geo";
import { createRateLimiter } from "@/lib/rate-limit";
import { sanitiseSubjectFragment } from "@/lib/safe-text";

/**
 * Server-side place search and reverse lookup for the single-trip map (D-25).
 *
 * SERVER ONLY. The browser never calls the provider directly: it calls
 * `/api/places/*`, which calls this. That keeps the strict `connect-src 'self'`
 * CSP intact, keeps the traveller's IP address and User-Agent away from the
 * provider, and lets us cache, bound and rate-limit what is sent upstream.
 *
 * Provider: Photon (https://photon.komoot.io), a free geocoder over
 * OpenStreetMap data. The public instance is best-effort with no SLA and asks
 * for fair use, which is what the cache and `upstreamLimiter` cap below are for.
 * Moving to a self-hosted Photon or a paid provider only changes this file.
 * See D-25 for the alternatives considered.
 */

export interface PlaceResult extends GeoPoint {
  /** The place's own name, e.g. "Jaffna" or "US hotel". */
  readonly name: string;
  /** Where it is, e.g. "Hospital Road, Jaffna, Jaffna District". May be "". */
  readonly detail: string;
}

export class PlaceLookupError extends Error {
  constructor(readonly reason: "busy" | "timeout" | "upstream") {
    super(`Place lookup failed: ${reason}`);
    this.name = "PlaceLookupError";
  }
}

const PHOTON_BASE = "https://photon.komoot.io";
/** Identifies us to the provider, as its usage policy asks. No traveller data. */
const USER_AGENT = "NoblePath/1.0 (+https://noblepath.lk; trip booking)";
const TIMEOUT_MS = 4_000;
const RESULT_LIMIT = 6;
/** Photon's bbox order is minLon,minLat,maxLon,maxLat. */
const BBOX = `${SRI_LANKA_BOUNDS.west},${SRI_LANKA_BOUNDS.south},${SRI_LANKA_BOUNDS.east},${SRI_LANKA_BOUNDS.north}`;

/**
 * Whole-app ceiling on upstream calls, separate from the per-client limit in
 * the route handlers: however many visitors are typing at once, the public
 * provider sees at most this many requests per second from us.
 */
const upstreamLimiter = createRateLimiter({ max: 5, windowMs: 1_000 }, 1);

/* -------------------------------------------------------------------------- */
/* Cache                                                                      */
/* -------------------------------------------------------------------------- */

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CACHE_MAX_ENTRIES = 2_000;
const cache = new Map<string, { readonly at: number; readonly value: unknown }>();

function cacheGet<T>(key: string): T | undefined {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (Date.now() - entry.at > CACHE_TTL_MS) {
    cache.delete(key);
    return undefined;
  }
  return entry.value as T;
}

function cacheSet(key: string, value: unknown): void {
  cache.delete(key);
  cache.set(key, { at: Date.now(), value });
  // Map iterates in insertion order: drop the oldest entries past the cap.
  while (cache.size > CACHE_MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest === undefined) break;
    cache.delete(oldest);
  }
}

/* -------------------------------------------------------------------------- */
/* Photon                                                                     */
/* -------------------------------------------------------------------------- */

interface PhotonFeature {
  readonly geometry?: { readonly coordinates?: readonly unknown[] };
  readonly properties?: Record<string, unknown>;
}

/**
 * Provider text is untrusted: collapse control, format and bidi characters
 * (F-12) so a suggestion can never fill a field with text our own validation
 * would then reject, and bound its length.
 */
const str = (value: unknown): string =>
  typeof value === "string" ? sanitiseSubjectFragment(value).slice(0, 100) : "";

/**
 * Keeps only Sri Lankan results with usable coordinates, and only the handful
 * of text properties we display — never passes the provider's payload through.
 */
function toPlace(feature: PhotonFeature): PlaceResult | null {
  const p = feature.properties ?? {};
  if (p.countrycode !== "LK") return null;
  const [lng, lat] = feature.geometry?.coordinates ?? [];
  if (typeof lat !== "number" || typeof lng !== "number") return null;
  const point = roundPoint({ lat, lng });
  if (!isInSriLanka(point)) return null;

  const street = [str(p.housenumber), str(p.street)].filter(Boolean).join(" ");
  const name = str(p.name) || street;
  if (!name) return null;
  const parts = [street, str(p.locality), str(p.city), str(p.county) || str(p.state)].filter(
    (part, index, all) => part !== "" && part !== name && all.indexOf(part) === index,
  );
  return { name, detail: parts.slice(0, 3).join(", "), ...point };
}

async function photon(path: "/api/" | "/reverse", params: Record<string, string>): Promise<PlaceResult[]> {
  if (!upstreamLimiter.check("upstream").allowed) {
    throw new PlaceLookupError("busy");
  }
  let response: Response;
  try {
    response = await fetch(`${PHOTON_BASE}${path}?${new URLSearchParams(params)}`, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
  } catch (error) {
    throw new PlaceLookupError(error instanceof Error && error.name === "TimeoutError" ? "timeout" : "upstream");
  }
  if (!response.ok) throw new PlaceLookupError("upstream");

  const body = (await response.json().catch(() => null)) as { features?: unknown } | null;
  const features = Array.isArray(body?.features) ? (body.features as PhotonFeature[]) : [];
  const seen = new Set<string>();
  const places: PlaceResult[] = [];
  for (const feature of features) {
    const place = toPlace(feature);
    if (!place) continue;
    const key = `${place.name}|${place.detail}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    places.push(place);
  }
  return places;
}

/** Normalises a query for both the upstream call and the cache key. */
export function normaliseQuery(query: string): string {
  return query.replace(/\s+/g, " ").trim().toLowerCase();
}

export async function searchPlaces(query: string): Promise<PlaceResult[]> {
  const q = normaliseQuery(query);
  const key = `search:${q}`;
  const cached = cacheGet<PlaceResult[]>(key);
  if (cached) return cached;
  const places = await photon("/api/", { q, lang: "en", limit: String(RESULT_LIMIT), bbox: BBOX });
  cacheSet(key, places);
  return places;
}

/**
 * Nearest named place to a point. The point is rounded to 4 decimals (~11 m)
 * before it leaves our server: ample to name a street, and it means nearby
 * lookups share a cache entry rather than each sending a precise location.
 */
export async function reversePlace(point: GeoPoint): Promise<PlaceResult | null> {
  const lat = point.lat.toFixed(4);
  const lng = point.lng.toFixed(4);
  const key = `reverse:${lat},${lng}`;
  const cached = cacheGet<PlaceResult | null>(key);
  if (cached !== undefined) return cached;
  const [place] = await photon("/reverse", { lat, lon: lng, lang: "en", limit: "1" });
  const value = place ?? null;
  cacheSet(key, value);
  return value;
}
