import { serverEnv } from "@/lib/env";

/**
 * In-memory sliding-window rate limiter for public write endpoints (NFR-8).
 *
 * KNOWN LIMITATION — this is process-local state:
 *   * counters are lost on restart, redeploy or a serverless cold start;
 *   * each instance counts separately, so N instances allow N times the limit.
 *
 * That is an accepted trade-off for v1, which runs as a single container and
 * whose public write endpoints (`/api/bookings`, `/api/rides`, which share one
 * bucket per client) create an enquiry rather than an account or a payment. Before the application is scaled horizontally this must be moved
 * to a shared store (Redis or equivalent) keyed the same way. Documented in
 * docs/api/api-overview.md so the constraint does not live only in this file.
 *
 * Memory is bounded two ways: expired windows are swept periodically, and the
 * map is capped, evicting the least recently created keys first. An attacker
 * rotating source addresses can therefore cost us at most a fixed amount of
 * memory, at the price of evicting honest keys early — which fails open, not
 * closed, and is the right direction for an enquiry form.
 */

export interface RateLimitOptions {
  /** Requests allowed per window. */
  readonly max: number;
  /** Window length in milliseconds. */
  readonly windowMs: number;
}

export interface RateLimitResult {
  readonly allowed: boolean;
  readonly limit: number;
  readonly remaining: number;
  /** Seconds until the caller may retry. `0` when the request was allowed. */
  readonly retryAfterSeconds: number;
  /** Epoch milliseconds at which the oldest hit in the window expires. */
  readonly resetAtMs: number;
}

/** Limits for the public booking endpoints, from the environment. */
export const bookingRateLimitOptions: RateLimitOptions = {
  max: serverEnv.BOOKING_RATE_LIMIT_MAX,
  windowMs: serverEnv.BOOKING_RATE_LIMIT_WINDOW_MS,
};

/** Default ceiling on tracked keys per limiter, to bound memory under a rotating-IP flood. */
const DEFAULT_MAX_TRACKED_KEYS = 5_000;

/** How often a full sweep of expired windows runs, at most. */
const SWEEP_INTERVAL_MS = 60_000;

export interface RateLimiter {
  /**
   * Records a hit for `key` and reports whether it is within the limit.
   * `now` is injectable so the behaviour can be tested without waiting for
   * real time to pass; production callers should not pass it.
   */
  readonly check: (key: string, now?: number) => RateLimitResult;
  /** Clears all counters. Intended for tests only. */
  readonly reset: () => void;
  /** Number of keys currently tracked. Exposed for tests and memory assertions. */
  readonly size: () => number;
}

/**
 * One independent limiter: its own store, window, sweep and key cap.
 *
 * Each limit (bookings, place lookups per client, the place-search upstream
 * cap) gets its **own** limiter. They used to share one store, and a sweep
 * triggered by a short-window limiter deleted long-window booking buckets
 * early, silently resetting the booking limit (security review D-25, F-9).
 * Separate stores make that impossible: a limiter only ever sweeps or evicts
 * its own keys, by its own window.
 */
export function createRateLimiter(
  options: RateLimitOptions,
  maxTrackedKeys: number = DEFAULT_MAX_TRACKED_KEYS,
): RateLimiter {
  const { max, windowMs } = options;
  /** Timestamps of recent hits, oldest first, per key. */
  const hits = new Map<string, number[]>();
  let lastSweepAt = 0;

  function sweep(now: number): void {
    if (now - lastSweepAt < SWEEP_INTERVAL_MS) return;
    lastSweepAt = now;
    for (const [key, timestamps] of hits) {
      if (timestamps.length === 0 || (timestamps[timestamps.length - 1] ?? 0) <= now - windowMs) {
        hits.delete(key);
      }
    }
  }

  function evictOldestKeys(): void {
    // Map iterates in insertion order, so the first keys are the least recently used.
    const excess = hits.size - maxTrackedKeys;
    if (excess <= 0) return;
    let removed = 0;
    for (const key of hits.keys()) {
      hits.delete(key);
      removed += 1;
      if (removed >= excess) break;
    }
  }

  function check(key: string, now: number = Date.now()): RateLimitResult {
    const windowStart = now - windowMs;
    sweep(now);

    const recent = (hits.get(key) ?? []).filter((timestamp) => timestamp > windowStart);

    if (recent.length >= max) {
      const oldest = recent[0] ?? now;
      const resetAtMs = oldest + windowMs;
      // Re-insert so a client being denied stays most-recently-used: an
      // over-limit key must not be the first one evicted under a flood.
      hits.delete(key);
      hits.set(key, recent);
      return {
        allowed: false,
        limit: max,
        remaining: 0,
        retryAfterSeconds: Math.max(1, Math.ceil((resetAtMs - now) / 1000)),
        resetAtMs,
      };
    }

    recent.push(now);
    // Re-inserting moves the key to the end of the eviction order.
    hits.delete(key);
    hits.set(key, recent);
    evictOldestKeys();

    const oldest = recent[0] ?? now;
    return {
      allowed: true,
      limit: max,
      remaining: Math.max(0, max - recent.length),
      retryAfterSeconds: 0,
      resetAtMs: oldest + windowMs,
    };
  }

  return {
    check,
    reset: () => {
      hits.clear();
      lastSweepAt = 0;
    },
    size: () => hits.size,
  };
}

/** The limiter shared by `POST /api/bookings` and `POST /api/rides` (one bucket per client). */
const bookingLimiter = createRateLimiter(bookingRateLimitOptions);

/** Booking-endpoint limit for `key` (a client identifier). */
export function checkRateLimit(key: string, now: number = Date.now()): RateLimitResult {
  return bookingLimiter.check(key, now);
}

/** Clears the booking limiter's counters. Intended for tests only. */
export function resetRateLimits(): void {
  bookingLimiter.reset();
}

/** Number of keys the booking limiter tracks. Exposed for tests and memory assertions. */
export function trackedKeyCount(): number {
  return bookingLimiter.size();
}
