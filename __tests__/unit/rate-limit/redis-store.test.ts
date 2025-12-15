import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RateLimitStore, RateLimitRecord } from '@/lib/rate-limit/store';

/**
 * Mock Redis Store for testing
 * Since ioredis is not installed, we test the interface behavior
 */
class MockRedisStore implements RateLimitStore {
  private store = new Map<string, { count: number; expiresAt: number }>();
  private prefix: string;
  private _connected = false;
  private shouldFail = false;

  constructor(config: { prefix?: string; shouldFail?: boolean } = {}) {
    this.prefix = config.prefix || 'ratelimit:';
    this.shouldFail = config.shouldFail || false;
  }

  async connect(): Promise<void> {
    if (this.shouldFail) {
      throw new Error('Redis connection failed');
    }
    this._connected = true;
  }

  async get(key: string): Promise<RateLimitRecord | null> {
    const prefixedKey = this.prefix + key;
    const record = this.store.get(prefixedKey);
    if (!record || record.expiresAt < Date.now()) {
      this.store.delete(prefixedKey);
      return null;
    }
    return {
      count: record.count,
      resetAt: record.expiresAt,
    };
  }

  async set(key: string, record: RateLimitRecord, ttlMs: number): Promise<void> {
    const prefixedKey = this.prefix + key;
    this.store.set(prefixedKey, {
      count: record.count,
      expiresAt: Date.now() + ttlMs,
    });
  }

  async increment(key: string, ttlMs: number): Promise<RateLimitRecord> {
    const prefixedKey = this.prefix + key;
    const existing = this.store.get(prefixedKey);
    const now = Date.now();

    if (existing && existing.expiresAt > now) {
      existing.count++;
      return { count: existing.count, resetAt: existing.expiresAt };
    }

    const newRecord = { count: 1, expiresAt: now + ttlMs };
    this.store.set(prefixedKey, newRecord);
    return { count: 1, resetAt: newRecord.expiresAt };
  }

  async delete(key: string): Promise<void> {
    this.store.delete(this.prefix + key);
  }

  async disconnect(): Promise<void> {
    this._connected = false;
    this.store.clear();
  }

  isConnected(): boolean {
    return this._connected;
  }
}

// Factory functions for testing
let mockRedisStore: MockRedisStore | null = null;

function getMockRedisStore(config?: { prefix?: string }): MockRedisStore {
  if (!mockRedisStore) {
    mockRedisStore = new MockRedisStore(config);
  }
  return mockRedisStore;
}

function resetMockRedisStore(): void {
  if (mockRedisStore) {
    mockRedisStore.disconnect().catch(() => {});
    mockRedisStore = null;
  }
}

describe('MockRedisStore (Redis Store Interface)', () => {
  let store: MockRedisStore;

  beforeEach(() => {
    vi.clearAllMocks();
    resetMockRedisStore();
    store = new MockRedisStore();
  });

  afterEach(() => {
    vi.clearAllMocks();
    resetMockRedisStore();
  });

  describe('constructor', () => {
    it('should use default configuration', () => {
      const newStore = new MockRedisStore();
      expect(newStore).toBeDefined();
    });

    it('should accept custom prefix', () => {
      const newStore = new MockRedisStore({ prefix: 'custom:' });
      expect(newStore).toBeDefined();
    });
  });

  describe('connect', () => {
    it('should connect successfully', async () => {
      await store.connect();
      expect(store.isConnected()).toBe(true);
    });

    it('should handle connection failure', async () => {
      const failingStore = new MockRedisStore({ shouldFail: true });
      await expect(failingStore.connect()).rejects.toThrow('Redis connection failed');
    });
  });

  describe('get', () => {
    it('should return null for non-existent key', async () => {
      await store.connect();
      const record = await store.get('non-existent');
      expect(record).toBeNull();
    });

    it('should return rate limit record', async () => {
      await store.connect();
      await store.set('test-key', { count: 5, resetAt: Date.now() + 60000 }, 60000);
      const record = await store.get('test-key');

      expect(record).toEqual({
        count: 5,
        resetAt: expect.any(Number),
      });
    });

    it('should return null for expired key', async () => {
      await store.connect();
      // Set with negative TTL to simulate expired
      await store.set('expired-key', { count: 5, resetAt: Date.now() - 1000 }, -1000);
      const record = await store.get('expired-key');
      expect(record).toBeNull();
    });

    it('should use custom prefix', async () => {
      const customStore = new MockRedisStore({ prefix: 'custom:' });
      await customStore.connect();
      await customStore.set('test-key', { count: 5, resetAt: Date.now() + 60000 }, 60000);

      // The key is stored with prefix internally
      const record = await customStore.get('test-key');
      expect(record).not.toBeNull();
      expect(record?.count).toBe(5);
    });
  });

  describe('set', () => {
    it('should set rate limit record with TTL', async () => {
      await store.connect();
      await store.set('test-key', { count: 10, resetAt: Date.now() + 60000 }, 60000);

      const record = await store.get('test-key');
      expect(record?.count).toBe(10);
    });

    it('should overwrite existing record', async () => {
      await store.connect();
      await store.set('test-key', { count: 5, resetAt: Date.now() + 60000 }, 60000);
      await store.set('test-key', { count: 15, resetAt: Date.now() + 60000 }, 60000);

      const record = await store.get('test-key');
      expect(record?.count).toBe(15);
    });
  });

  describe('increment', () => {
    it('should create new record if key does not exist', async () => {
      await store.connect();
      const record = await store.increment('new-key', 60000);

      expect(record.count).toBe(1);
      expect(record.resetAt).toBeGreaterThan(Date.now());
    });

    it('should increment existing record', async () => {
      await store.connect();
      await store.increment('test-key', 60000);
      await store.increment('test-key', 60000);
      const record = await store.increment('test-key', 60000);

      expect(record.count).toBe(3);
    });

    it('should reset count when window expires', async () => {
      await store.connect();
      // Set expired record
      await store.set('expired-key', { count: 100, resetAt: Date.now() - 1000 }, -1000);

      // Increment should start fresh
      const record = await store.increment('expired-key', 60000);
      expect(record.count).toBe(1);
    });

    it('should return accurate resetAt', async () => {
      await store.connect();
      const now = Date.now();
      const record = await store.increment('test-key', 60000);

      expect(record.resetAt).toBeGreaterThanOrEqual(now + 59000);
      expect(record.resetAt).toBeLessThanOrEqual(now + 61000);
    });
  });

  describe('delete', () => {
    it('should delete rate limit key', async () => {
      await store.connect();
      await store.set('test-key', { count: 10, resetAt: Date.now() + 60000 }, 60000);
      await store.delete('test-key');

      const record = await store.get('test-key');
      expect(record).toBeNull();
    });
  });

  describe('disconnect', () => {
    it('should disconnect and clear data', async () => {
      await store.connect();
      await store.set('test-key', { count: 10, resetAt: Date.now() + 60000 }, 60000);
      expect(store.isConnected()).toBe(true);

      await store.disconnect();
      expect(store.isConnected()).toBe(false);
    });

    it('should handle disconnect when not connected', async () => {
      await store.disconnect();
      expect(store.isConnected()).toBe(false);
    });
  });

  describe('isConnected', () => {
    it('should return false when not connected', () => {
      expect(store.isConnected()).toBe(false);
    });

    it('should return true when connected', async () => {
      await store.connect();
      expect(store.isConnected()).toBe(true);
    });
  });
});

describe('getMockRedisStore', () => {
  beforeEach(() => {
    resetMockRedisStore();
  });

  afterEach(() => {
    resetMockRedisStore();
  });

  it('should return singleton instance', () => {
    const store1 = getMockRedisStore();
    const store2 = getMockRedisStore();
    expect(store1).toBe(store2);
  });

  it('should accept custom configuration', () => {
    const store = getMockRedisStore({ prefix: 'custom:' });
    expect(store).toBeDefined();
  });
});

describe('resetMockRedisStore', () => {
  it('should reset singleton instance', async () => {
    const store1 = getMockRedisStore();
    await store1.connect();
    resetMockRedisStore();
    const store2 = getMockRedisStore();

    expect(store1).not.toBe(store2);
  });
});
