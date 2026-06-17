import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Persistent rate limiter backed by Postgres (Supabase).
 *
 * Limits: 5 attempts per (IP + email) per minute.
 * Lockout: 15 minutes after exhausting the quota.
 *
 * Migrated from an in-memory `Map` to the database table
 * `auth_rate_limits` so that the limit is correctly enforced in
 * serverless deployments (Vercel/Cloud Run) where each invocation
 * may run in a fresh process. The RPC `fn_check_rate_limit` is
 * atomic (uses `FOR UPDATE`) so concurrent attempts race safely.
 */

const MAX_ATTEMPTS = 5
const WINDOW_SECONDS = 5 * 60 // 5 minute sliding window (era 60s,
// demasiado curto: clicar nos forms
// já demora isso, e na prática nunca
// se chegava ao lockout em uso normal)
const LOCKOUT_SECONDS = 15 * 60 // 15 minute lockout

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
 *
 * Failure mode: if the database is unreachable, we FAIL OPEN (return
 * `{ allowed: true }`) rather than locking everyone out. Auth still
 * runs and other defenses (Supabase Auth's own rate limits, captcha
 * if/when enabled) apply.
 */
export async function checkRateLimit(key: string): Promise<RateLimitResult> {
  try {
    const admin = createAdminClient()
    const { data, error } = await admin.rpc('fn_check_rate_limit', {
      p_key: key,
      p_max_attempts: MAX_ATTEMPTS,
      p_window_seconds: WINDOW_SECONDS,
      p_lockout_seconds: LOCKOUT_SECONDS,
    })

    if (error || !data) {
      console.error('[rate-limiter] check failed, failing open:', error?.message)
      return { allowed: true, remaining: MAX_ATTEMPTS }
    }

    // A RPC devolve JSONB com este shape — narrow via cast porque o
    // tipo gerado é `Json` (a estrutura interna não é inferida).
    const res = data as {
      allowed: boolean
      attempts_left: number
      retry_after_seconds: number
    }

    return {
      allowed: res.allowed,
      remaining: res.attempts_left,
      retryAfterSeconds: res.allowed ? undefined : res.retry_after_seconds,
    }
  } catch (err) {
    console.error('[rate-limiter] unexpected error, failing open:', err)
    return { allowed: true, remaining: MAX_ATTEMPTS }
  }
}

/**
 * Clear the rate-limit record for a key (call on successful auth).
 * Failures are logged but ignored — a stuck counter is harmless,
 * it just means the user will start a fresh window on next failure.
 */
export async function resetRateLimit(key: string): Promise<void> {
  try {
    const admin = createAdminClient()
    const { error } = await admin.rpc('fn_reset_rate_limit', { p_key: key })
    if (error) {
      console.error('[rate-limiter] reset failed:', error.message)
    }
  } catch (err) {
    console.error('[rate-limiter] reset unexpected error:', err)
  }
}
