import { getDefaultStore, RateLimitStore, RateLimitRecord } from './store';
import { getPlanLimits } from '@/lib/stripe/plans';
import { Plan } from '@/types';

export interface RateLimitConfig {
  limit: number;        // Maximum requests allowed
  windowMs: number;     // Time window in milliseconds
  store?: RateLimitStore;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;      // Unix timestamp when the limit resets
  retryAfter?: number;  // Seconds until retry is allowed (if limited)
}

export interface RateLimitHeaders {
  'X-RateLimit-Limit': string;
  'X-RateLimit-Remaining': string;
  'X-RateLimit-Reset': string;
  'Retry-After'?: string;
}

/**
 * Check rate limit for a given identifier
 * @param identifier - Unique identifier (API key, IP address, user ID)
 * @param config - Rate limit configuration
 */
export async function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const store = config.store || getDefaultStore();
  const now = Date.now();

  const record = await store.increment(identifier, config.windowMs);

  const remaining = Math.max(0, config.limit - record.count);
  const allowed = record.count <= config.limit;

  return {
    allowed,
    limit: config.limit,
    remaining,
    resetAt: record.resetAt,
    retryAfter: allowed ? undefined : Math.ceil((record.resetAt - now) / 1000),
  };
}

/**
 * Get rate limit for API requests based on plan
 */
export function getApiRateLimitConfig(plan: Plan): RateLimitConfig {
  const limits = getPlanLimits(plan);
  const dailyLimit = limits.apiRequestsPerDay;

  // Unlimited API requests
  if (dailyLimit === -1) {
    return {
      limit: Number.MAX_SAFE_INTEGER,
      windowMs: 24 * 60 * 60 * 1000, // 24 hours
    };
  }

  return {
    limit: dailyLimit,
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
  };
}

/**
 * Get rate limit for anonymous requests (by IP)
 */
export function getAnonymousRateLimitConfig(): RateLimitConfig {
  return {
    limit: 60, // 60 requests per minute for anonymous users
    windowMs: 60 * 1000, // 1 minute
  };
}

/**
 * Generate rate limit response headers
 */
export function getRateLimitHeaders(result: RateLimitResult): RateLimitHeaders {
  const headers: RateLimitHeaders = {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': Math.ceil(result.resetAt / 1000).toString(),
  };

  if (result.retryAfter !== undefined) {
    headers['Retry-After'] = result.retryAfter.toString();
  }

  return headers;
}

/**
 * Rate limit presets for different endpoints
 */
export const RATE_LIMIT_PRESETS = {
  // API endpoints
  api: {
    shorten: { limit: 100, windowMs: 60 * 1000 },      // 100 per minute
    bulk: { limit: 10, windowMs: 60 * 1000 },          // 10 per minute
    stats: { limit: 300, windowMs: 60 * 1000 },        // 300 per minute
    default: { limit: 60, windowMs: 60 * 1000 },       // 60 per minute
  },
  // Auth endpoints
  auth: {
    login: { limit: 5, windowMs: 15 * 60 * 1000 },     // 5 per 15 minutes
    register: { limit: 3, windowMs: 60 * 60 * 1000 },  // 3 per hour
    passwordReset: { limit: 3, windowMs: 60 * 60 * 1000 }, // 3 per hour
  },
  // Redirect endpoint
  redirect: { limit: 1000, windowMs: 60 * 1000 },      // 1000 per minute
} as const;

/**
 * Create a rate limiter for a specific endpoint
 */
export function createRateLimiter(config: RateLimitConfig) {
  return async (identifier: string): Promise<RateLimitResult> => {
    return checkRateLimit(identifier, config);
  };
}

/**
 * Get client IP from request headers
 */
export function getClientIp(headers: Headers): string {
  // Check common proxy headers
  const forwardedFor = headers.get('x-forwarded-for');
  if (forwardedFor) {
    // Get the first IP in the chain
    return forwardedFor.split(',')[0].trim();
  }

  const realIp = headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  // Cloudflare
  const cfIp = headers.get('cf-connecting-ip');
  if (cfIp) {
    return cfIp;
  }

  // Default fallback
  return 'unknown';
}
