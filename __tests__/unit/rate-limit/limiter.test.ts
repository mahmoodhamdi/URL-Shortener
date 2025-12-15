import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  checkRateLimit,
  getRateLimitHeaders,
  getClientIp,
  createRateLimiter,
  getAnonymousRateLimitConfig,
  RATE_LIMIT_PRESETS,
} from '@/lib/rate-limit/limiter';
import { InMemoryStore } from '@/lib/rate-limit/store';

describe('Rate Limiter', () => {
  let store: InMemoryStore;

  beforeEach(() => {
    store = new InMemoryStore();
  });

  afterEach(() => {
    store.destroy();
  });

  describe('checkRateLimit', () => {
    it('should allow requests under the limit', async () => {
      const result = await checkRateLimit('test-user', {
        limit: 10,
        windowMs: 60000,
        store,
      });

      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(10);
      expect(result.remaining).toBe(9);
      expect(result.retryAfter).toBeUndefined();
    });

    it('should track multiple requests', async () => {
      const config = { limit: 5, windowMs: 60000, store };

      for (let i = 0; i < 3; i++) {
        await checkRateLimit('test-user', config);
      }

      const result = await checkRateLimit('test-user', config);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(1);
    });

    it('should deny requests over the limit', async () => {
      const config = { limit: 3, windowMs: 60000, store };

      // Make 3 requests (at limit)
      for (let i = 0; i < 3; i++) {
        await checkRateLimit('test-user', config);
      }

      // 4th request should be denied
      const result = await checkRateLimit('test-user', config);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.retryAfter).toBeDefined();
      expect(result.retryAfter).toBeGreaterThan(0);
    });

    it('should track separate limits for different identifiers', async () => {
      const config = { limit: 2, windowMs: 60000, store };

      await checkRateLimit('user-1', config);
      await checkRateLimit('user-1', config);
      await checkRateLimit('user-2', config);

      const result1 = await checkRateLimit('user-1', config);
      const result2 = await checkRateLimit('user-2', config);

      expect(result1.allowed).toBe(false);
      expect(result2.allowed).toBe(true);
      expect(result2.remaining).toBe(0);
    });
  });

  describe('getRateLimitHeaders', () => {
    it('should return correct headers for allowed request', () => {
      const result = {
        allowed: true,
        limit: 100,
        remaining: 50,
        resetAt: Date.now() + 60000,
      };

      const headers = getRateLimitHeaders(result);

      expect(headers['X-RateLimit-Limit']).toBe('100');
      expect(headers['X-RateLimit-Remaining']).toBe('50');
      expect(headers['X-RateLimit-Reset']).toBeDefined();
      expect(headers['Retry-After']).toBeUndefined();
    });

    it('should include Retry-After header when limited', () => {
      const result = {
        allowed: false,
        limit: 100,
        remaining: 0,
        resetAt: Date.now() + 60000,
        retryAfter: 60,
      };

      const headers = getRateLimitHeaders(result);

      expect(headers['Retry-After']).toBe('60');
    });
  });

  describe('getClientIp', () => {
    it('should get IP from x-forwarded-for header', () => {
      const headers = new Headers();
      headers.set('x-forwarded-for', '1.2.3.4, 5.6.7.8');

      const ip = getClientIp(headers);
      expect(ip).toBe('1.2.3.4');
    });

    it('should get IP from x-real-ip header', () => {
      const headers = new Headers();
      headers.set('x-real-ip', '10.0.0.1');

      const ip = getClientIp(headers);
      expect(ip).toBe('10.0.0.1');
    });

    it('should get IP from cf-connecting-ip header', () => {
      const headers = new Headers();
      headers.set('cf-connecting-ip', '192.168.1.1');

      const ip = getClientIp(headers);
      expect(ip).toBe('192.168.1.1');
    });

    it('should return unknown when no IP headers present', () => {
      const headers = new Headers();

      const ip = getClientIp(headers);
      expect(ip).toBe('unknown');
    });

    it('should prioritize x-forwarded-for over other headers', () => {
      const headers = new Headers();
      headers.set('x-forwarded-for', '1.1.1.1');
      headers.set('x-real-ip', '2.2.2.2');
      headers.set('cf-connecting-ip', '3.3.3.3');

      const ip = getClientIp(headers);
      expect(ip).toBe('1.1.1.1');
    });
  });

  describe('createRateLimiter', () => {
    it('should create a reusable rate limiter function', async () => {
      const limiter = createRateLimiter({ limit: 5, windowMs: 60000, store });

      const result1 = await limiter('test-user');
      const result2 = await limiter('test-user');

      expect(result1.allowed).toBe(true);
      expect(result2.allowed).toBe(true);
      expect(result2.remaining).toBe(3);
    });
  });

  describe('getAnonymousRateLimitConfig', () => {
    it('should return config for anonymous users', () => {
      const config = getAnonymousRateLimitConfig();

      expect(config.limit).toBe(60);
      expect(config.windowMs).toBe(60000);
    });
  });

  describe('RATE_LIMIT_PRESETS', () => {
    it('should have presets for API endpoints', () => {
      expect(RATE_LIMIT_PRESETS.api.shorten.limit).toBe(100);
      expect(RATE_LIMIT_PRESETS.api.bulk.limit).toBe(10);
      expect(RATE_LIMIT_PRESETS.api.stats.limit).toBe(300);
    });

    it('should have presets for auth endpoints', () => {
      expect(RATE_LIMIT_PRESETS.auth.login.limit).toBe(5);
      expect(RATE_LIMIT_PRESETS.auth.register.limit).toBe(3);
    });

    it('should have preset for redirect endpoint', () => {
      expect(RATE_LIMIT_PRESETS.redirect.limit).toBe(1000);
    });
  });
});

describe('InMemoryStore', () => {
  let store: InMemoryStore;

  beforeEach(() => {
    store = new InMemoryStore();
  });

  afterEach(() => {
    store.destroy();
  });

  it('should store and retrieve records', async () => {
    const record = { count: 5, resetAt: Date.now() + 60000 };
    await store.set('test-key', record, 60000);

    const retrieved = await store.get('test-key');
    expect(retrieved).toEqual(record);
  });

  it('should return null for expired records', async () => {
    const record = { count: 5, resetAt: Date.now() - 1000 }; // Already expired
    await store.set('test-key', record, 60000);

    const retrieved = await store.get('test-key');
    expect(retrieved).toBeNull();
  });

  it('should return null for non-existent keys', async () => {
    const retrieved = await store.get('non-existent');
    expect(retrieved).toBeNull();
  });

  it('should increment count correctly', async () => {
    const result1 = await store.increment('test-key', 60000);
    expect(result1.count).toBe(1);

    const result2 = await store.increment('test-key', 60000);
    expect(result2.count).toBe(2);
  });
});
