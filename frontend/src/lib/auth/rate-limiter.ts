/**
 * In-memory rate limiter for login attempts.
 *
 * Limits: 5 attempts per (IP + email) per minute.
 * Lockout: 15 minutes after exhausting the quota.
 *
 * Note: resets on server restart — acceptable for a school/single-process
 * deployment. Production would use Redis with atomic INCR + EXPIRY.
 */

interface AttemptRecord {
  count: number
  firstAttempt: number
  lockedUntil?: number
}

const MAX_ATTEMPTS = 5
const WINDOW_MS = 60_000          // 1 minute sliding window
const LOCKOUT_MS = 15 * 60_000    // 15 minute lockout

// Module-level Map — persists across requests in the same Node.js process
const store = new Map<string, AttemptRecord>()

// Purge stale entries every 5 minutes to prevent unbounded memory growth
const cleanup = setInterval(() => {
  const now = Date.now()
  for (const [key, r] of store) {
    const expired =
      (r.lockedUntil && now > r.lockedUntil) ||
      (!r.lockedUntil && now - r.firstAttempt > WINDOW_MS)
    if (expired) store.delete(key)
  }
}, 5 * 60_000)

// Allow the interval to be garbage-collected in test environments
if (cleanup.unref) cleanup.unref()

export interface RateLimitResult {
  allowed: boolean
  /** Attempts remaining in the current window (0 when blocked) */
  remaining: number
  /** Seconds until the client may retry (only set when blocked) */
  retryAfterSeconds?: number
}

/**
 * Check whether a key is within rate limits, and consume one slot.
 * Call this BEFORE the actual auth attempt.
 * On success, call `resetRateLimit` to clear the counter.
 */
export function checkRateLimit(key: string): RateLimitResult {
  const now = Date.now()
  let r = store.get(key)

  // If there is an active lockout
  if (r?.lockedUntil) {
    if (now < r.lockedUntil) {
      return {
        allowed: false,
        remaining: 0,
        retryAfterSeconds: Math.ceil((r.lockedUntil - now) / 1000),
      }
    }
    // Lockout expired — clear and fall through
    store.delete(key)
    r = undefined
  }

  // No record, or window has rolled over — start fresh
  if (!r || now - r.firstAttempt > WINDOW_MS) {
    store.set(key, { count: 1, firstAttempt: now })
    return { allowed: true, remaining: MAX_ATTEMPTS - 1 }
  }

  // Window still open — check quota
  if (r.count >= MAX_ATTEMPTS) {
    // Apply lockout
    r.lockedUntil = now + LOCKOUT_MS
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil(LOCKOUT_MS / 1000),
    }
  }

  r.count++
  return { allowed: true, remaining: MAX_ATTEMPTS - r.count }
}

/** Clear the rate-limit record for a key (call on successful auth). */
export function resetRateLimit(key: string): void {
  store.delete(key)
}
