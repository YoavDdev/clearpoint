/**
 * Simple in-memory rate limiter for API routes.
 * Uses a sliding window counter per key (IP or token hash).
 *
 * NOTE: This is per-instance (not shared across serverless invocations).
 * For production at scale, consider Redis-based rate limiting.
 * For Vercel/Next.js on a single region, this provides basic protection.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Cleanup stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.resetAt) {
      store.delete(key);
    }
  }
}, 5 * 60 * 1000);

export interface RateLimitConfig {
  /** Max requests per window */
  maxRequests: number;
  /** Window size in seconds */
  windowSeconds: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Check if a request is within rate limits.
 * @param key - Unique identifier (e.g., IP address, token hash, or combined)
 * @param config - Rate limit configuration
 */
export function checkRateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  const windowMs = config.windowSeconds * 1000;

  const entry = store.get(key);

  // No entry or window expired — reset
  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: config.maxRequests - 1, resetAt: now + windowMs };
  }

  // Within window
  if (entry.count < config.maxRequests) {
    entry.count++;
    return { allowed: true, remaining: config.maxRequests - entry.count, resetAt: entry.resetAt };
  }

  // Rate limited
  return { allowed: false, remaining: 0, resetAt: entry.resetAt };
}

// ─── Preset configs ──────────────────────────────────────────────

/** Ingest endpoints: 60 requests per minute per token */
export const INGEST_LIMIT: RateLimitConfig = { maxRequests: 60, windowSeconds: 60 };

/** VOD file upload: 10 per minute per token */
export const VOD_UPLOAD_LIMIT: RateLimitConfig = { maxRequests: 10, windowSeconds: 60 };

/** Alert ingest: 30 per minute per token (burst protection) */
export const ALERT_LIMIT: RateLimitConfig = { maxRequests: 30, windowSeconds: 60 };

/** Admin API: 100 requests per minute per IP */
export const ADMIN_LIMIT: RateLimitConfig = { maxRequests: 100, windowSeconds: 60 };
