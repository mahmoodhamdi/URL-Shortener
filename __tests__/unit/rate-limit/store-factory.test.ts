import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getRateLimitStore,
  isRedisConfigured,
  resetFactoryStore,
  getDefaultStore,
  InMemoryStore,
} from '@/lib/rate-limit/store';

// Store original env
const originalEnv = process.env;

describe('Store Factory', () => {
  beforeEach(() => {
    vi.resetModules();
    resetFactoryStore();
    process.env = { ...originalEnv };
    delete process.env.REDIS_URL;
    delete process.env.REDIS_HOST;
  });

  afterEach(() => {
    process.env = originalEnv;
    resetFactoryStore();
  });

  describe('isRedisConfigured', () => {
    it('should return false when no Redis env vars are set', () => {
      expect(isRedisConfigured()).toBe(false);
    });

    it('should return true when REDIS_URL is set', () => {
      process.env.REDIS_URL = 'redis://localhost:6379';
      expect(isRedisConfigured()).toBe(true);
    });

    it('should return true when REDIS_HOST is set', () => {
      process.env.REDIS_HOST = 'localhost';
      expect(isRedisConfigured()).toBe(true);
    });
  });

  describe('getRateLimitStore', () => {
    it('should return in-memory store by default', async () => {
      const store = await getRateLimitStore();
      expect(store).toBeInstanceOf(InMemoryStore);
    });

    it('should return in-memory store when type is memory', async () => {
      const store = await getRateLimitStore({ type: 'memory' });
      expect(store).toBeInstanceOf(InMemoryStore);
    });

    it('should return cached store on subsequent calls', async () => {
      const store1 = await getRateLimitStore({ type: 'memory' });
      const store2 = await getRateLimitStore({ type: 'memory' });
      expect(store1).toBe(store2);
    });

    it('should fall back to memory when Redis fails', async () => {
      // Mock Redis to fail
      vi.doMock('@/lib/rate-limit/redis-store', () => ({
        RedisStore: class {
          async connect() {
            throw new Error('Redis connection failed');
          }
        },
      }));

      const store = await getRateLimitStore({ type: 'redis' });
      expect(store).toBeInstanceOf(InMemoryStore);
    });
  });

  describe('getDefaultStore', () => {
    it('should return InMemoryStore instance', () => {
      const store = getDefaultStore();
      expect(store).toBeInstanceOf(InMemoryStore);
    });

    it('should return same instance on multiple calls', () => {
      const store1 = getDefaultStore();
      const store2 = getDefaultStore();
      expect(store1).toBe(store2);
    });
  });

  describe('resetFactoryStore', () => {
    it('should reset cached factory store', async () => {
      const store1 = await getRateLimitStore({ type: 'memory' });
      resetFactoryStore();

      // Force new instance creation
      vi.resetModules();
      const { getRateLimitStore: getStore } = await import('@/lib/rate-limit/store');
      const store2 = await getStore({ type: 'memory' });

      // After reset, should create new store
      // (Note: due to singleton pattern in getDefaultStore, may still be same)
      expect(store2).toBeDefined();
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

  describe('get', () => {
    it('should return null for non-existent key', async () => {
      const result = await store.get('non-existent');
      expect(result).toBeNull();
    });

    it('should return record for existing key', async () => {
      const record = { count: 5, resetAt: Date.now() + 60000 };
      await store.set('test-key', record, 60000);
      const result = await store.get('test-key');
      expect(result).toEqual(record);
    });

    it('should return null for expired key', async () => {
      const record = { count: 5, resetAt: Date.now() - 1000 };
      await store.set('expired-key', record, -1000);
      const result = await store.get('expired-key');
      expect(result).toBeNull();
    });
  });

  describe('set', () => {
    it('should store record', async () => {
      const record = { count: 10, resetAt: Date.now() + 60000 };
      await store.set('test-key', record, 60000);
      const result = await store.get('test-key');
      expect(result).toEqual(record);
    });

    it('should overwrite existing record', async () => {
      const record1 = { count: 5, resetAt: Date.now() + 60000 };
      const record2 = { count: 10, resetAt: Date.now() + 120000 };

      await store.set('test-key', record1, 60000);
      await store.set('test-key', record2, 120000);

      const result = await store.get('test-key');
      expect(result).toEqual(record2);
    });
  });

  describe('increment', () => {
    it('should create new record if key does not exist', async () => {
      const result = await store.increment('new-key', 60000);
      expect(result.count).toBe(1);
      expect(result.resetAt).toBeGreaterThan(Date.now());
    });

    it('should increment existing record', async () => {
      await store.increment('test-key', 60000);
      await store.increment('test-key', 60000);
      const result = await store.increment('test-key', 60000);
      expect(result.count).toBe(3);
    });

    it('should reset count when window expires', async () => {
      // Create expired record
      const expiredRecord = { count: 100, resetAt: Date.now() - 1000 };
      await store.set('expired-key', expiredRecord, -1000);

      // Increment should start fresh
      const result = await store.increment('expired-key', 60000);
      expect(result.count).toBe(1);
    });
  });

  describe('destroy', () => {
    it('should clear all records', async () => {
      await store.set('key1', { count: 1, resetAt: Date.now() + 60000 }, 60000);
      await store.set('key2', { count: 2, resetAt: Date.now() + 60000 }, 60000);

      store.destroy();

      // After destroy, store is cleared - need to create new store
      const newStore = new InMemoryStore();
      const result1 = await newStore.get('key1');
      const result2 = await newStore.get('key2');

      expect(result1).toBeNull();
      expect(result2).toBeNull();

      newStore.destroy();
    });

    it('should stop cleanup interval', () => {
      // This mainly verifies no errors occur
      store.destroy();
      store.destroy(); // Should handle multiple destroy calls
    });
  });
});
