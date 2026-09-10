/**
 * Sliding-window limiter. Defense-in-depth note: this is a soft throttle.
 * The PRIMARY brute-force defense is DB-backed account lockout (failedLoginAttempts),
 * which survives restarts and multiple instances. Swap this for Redis in production.
 */
const buckets = new Map<string, number[]>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
}

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const windowStart = now - windowMs;

  const timestamps = (buckets.get(key) ?? []).filter((t) => t > windowStart);

  if (timestamps.length >= limit) {
    const retryAfterMs = timestamps[0] + windowMs - now;
    buckets.set(key, timestamps);
    return { allowed: false, remaining: 0, retryAfterMs };
  }

  timestamps.push(now);
  buckets.set(key, timestamps);
  return { allowed: true, remaining: limit - timestamps.length, retryAfterMs: 0 };
}

// Lazy cleanup so the map doesn't grow unbounded.
setInterval(() => {
  const cutoff = Date.now() - 15 * 60 * 1000;
  for (const [k, ts] of buckets) {
    const fresh = ts.filter((t) => t > cutoff);
    if (fresh.length === 0) buckets.delete(k);
    else buckets.set(k, fresh);
  }
}, 60 * 1000).unref();