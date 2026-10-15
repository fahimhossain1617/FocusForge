// Simple and effective in-memory rate limiter with sliding window

interface RateLimitRecord {
  timestamps: number[];
}

const store = new Map<string, RateLimitRecord>();

// Cleanup stale entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  const cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, record] of store.entries()) {
      record.timestamps = record.timestamps.filter((ts) => now - ts < 3600000);
      if (record.timestamps.length === 0) {
        store.delete(key);
      }
    }
  }, 300000);
  if (cleanupTimer && typeof cleanupTimer.unref === 'function') {
    cleanupTimer.unref();
  }
}

/**
 * Check if a request exceeds rate limit.
 * @param key Unique identifier (e.g. `ip:endpoint` or `user:endpoint`)
 * @param limit Maximum allowed requests in window
 * @param windowMs Window duration in milliseconds
 * @returns boolean `true` if allowed, `false` if rate limit exceeded
 */
export function checkRateLimit(key: string, limit: number, windowMs: number): { allowed: boolean; remaining: number; retryAfterSeconds: number } {
  const now = Date.now();
  let record = store.get(key);

  if (!record) {
    record = { timestamps: [] };
    store.set(key, record);
  }

  // Filter timestamps within window
  record.timestamps = record.timestamps.filter((ts) => now - ts < windowMs);

  if (record.timestamps.length >= limit) {
    const oldestTimestamp = record.timestamps[0];
    const retryAfterMs = windowMs - (now - oldestTimestamp);
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil(retryAfterMs / 1000),
    };
  }

  record.timestamps.push(now);
  return {
    allowed: true,
    remaining: limit - record.timestamps.length,
    retryAfterSeconds: 0,
  };
}

/**
 * Asynchronously check rate limit via Upstash Redis (if configured in env),
 * seamlessly falling back to in-memory sliding window if env vars are absent or network errors.
 */
export async function checkRateLimitAsync(
  key: string,
  limit: number,
  windowMs: number
): Promise<{ allowed: boolean; remaining: number; retryAfterSeconds: number }> {
  const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (upstashUrl && upstashToken) {
    try {
      const redisKey = `ratelimit:${key}`;
      const expireSeconds = Math.max(1, Math.ceil(windowMs / 1000));
      
      // Execute atomic pipeline: INCR + EXPIRE
      const response = await fetch(`${upstashUrl}/pipeline`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${upstashToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([
          ['INCR', redisKey],
          ['EXPIRE', redisKey, expireSeconds, 'NX'],
        ]),
        signal: AbortSignal.timeout(1500),
      });

      if (response.ok) {
        const results = await response.json();
        const currentCount = Number(results[0]?.result) || 1;
        if (currentCount > limit) {
          return {
            allowed: false,
            remaining: 0,
            retryAfterSeconds: expireSeconds,
          };
        }
        return {
          allowed: true,
          remaining: Math.max(0, limit - currentCount),
          retryAfterSeconds: 0,
        };
      }
    } catch (redisErr: any) {
      console.warn('[RateLimiter] Upstash Redis check failed, falling back to in-memory:', redisErr?.message);
    }
  }

  // In-memory fallback
  return checkRateLimit(key, limit, windowMs);
}

/**
 * Extract client IP safely from request headers
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }
  return '127.0.0.1';
}


