/**
 * Minimal in-memory rate limiter (MVP).
 * WARNING: In serverless/prod, memory resets and does not share across instances.
 * Replace with durable storage limiter (Redis/Supabase table) when needed.
 */

type Bucket = {
  count: number;
  resetAt: number; // epoch ms
};

const buckets = new Map<string, Bucket>();

export type RateLimitConfig = {
  windowMs: number;
  max: number;
};

export function checkRateLimit(key: string, cfg: RateLimitConfig): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const b = buckets.get(key);

  if (!b || now >= b.resetAt) {
    const nb: Bucket = { count: 1, resetAt: now + cfg.windowMs };
    buckets.set(key, nb);
    return { allowed: true, remaining: cfg.max - 1, resetAt: nb.resetAt };
  }

  if (b.count >= cfg.max) {
    return { allowed: false, remaining: 0, resetAt: b.resetAt };
  }

  b.count += 1;
  buckets.set(key, b);
  return { allowed: true, remaining: cfg.max - b.count, resetAt: b.resetAt };
}
