import { serverEnv } from "@/lib/env";

/**
 * In-memory sliding-window rate limiter for public write endpoints (NFR-8).
 *
 * KNOWN LIMITATION — this is process-local state:
 *   * counters are lost on restart, redeploy or a serverless cold start;
 *   * each instance counts separately, so N instances allow N times the limit.
 *
 * That is an accepted trade-off for v1, which runs as a single container and
 * whose only public write endpoint creates an enquiry rather than an account or
 * a payment. Before the application is scaled horizontally this must be moved
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

/** Limits for the public booking endpoint, from the environment. */
export const bookingRateLimitOptions: RateLimitOptions = {
  max: serverEnv.BOOKING_RATE_LIMIT_MAX,
  windowMs: serverEnv.BOOKING_RATE_LIMIT_WINDOW_MS,
};

/** Hard ceiling on tracked keys, to bound memory under a rotating-IP flood. */
const MAX_TRACKED_KEYS = 5_000;

/** How often a full sweep of expired windows runs, at most. */
const SWEEP_INTERVAL_MS = 60_000;

/** Timestamps of recent hits, oldest first, per key. */
const hits = new Map<string, number[]>();
let lastSweepAt = 0;

function sweep(now: number, windowMs: number): void {
  if (now - lastSweepAt < SWEEP_INTERVAL_MS) return;
  lastSweepAt = now;
  for (const [key, timestamps] of hits) {
    if (timestamps.length === 0 || (timestamps[timestamps.length - 1] ?? 0) <= now - windowMs) {
      hits.delete(key);
    }
  }
}

function evictOldestKeys(): void {
  // Map iterates in insertion order, so the first keys are the least recently created.
  const excess = hits.size - MAX_TRACKED_KEYS;
  if (excess <= 0) return;
  let removed = 0;
  for (const key of hits.keys()) {
    hits.delete(key);
    removed += 1;
    if (removed >= excess) break;
  }
}

/**
 * Records a hit for `key` and reports whether it is within the limit.
 *
 * `now` is injectable so the behaviour can be tested without waiting for real
 * time to pass; production callers should not pass it.
 */
export function checkRateLimit(
  key: string,
  options: RateLimitOptions = bookingRateLimitOptions,
  now: number = Date.now(),
): RateLimitResult {
  const { max, windowMs } = options;
  const windowStart = now - windowMs;

  sweep(now, windowMs);

  const existing = hits.get(key) ?? [];
  const recent = existing.filter((timestamp) => timestamp > windowStart);

  if (recent.length >= max) {
    const oldest = recent[0] ?? now;
    const resetAtMs = oldest + windowMs;
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

/** Clears all counters. Intended for tests only. */
export function resetRateLimits(): void {
  hits.clear();
  lastSweepAt = 0;
}

/** Number of keys currently tracked. Exposed for tests and for memory assertions. */
export function trackedKeyCount(): number {
  return hits.size;
}
