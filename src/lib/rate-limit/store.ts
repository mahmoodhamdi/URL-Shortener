/**
 * Rate limit store interface
 * Supports in-memory storage with optional Redis support
 */

export interface RateLimitRecord {
  count: number;
  resetAt: number;
}

export interface RateLimitStore {
  get(key: string): Promise<RateLimitRecord | null>;
  set(key: string, record: RateLimitRecord, ttlMs: number): Promise<void>;
  increment(key: string, ttlMs: number): Promise<RateLimitRecord>;
}

/**
 * In-memory rate limit store
 * Simple implementation suitable for single-server deployments
 */
export class InMemoryStore implements RateLimitStore {
  private store = new Map<string, RateLimitRecord>();
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    // Clean up expired entries every minute
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }

  async get(key: string): Promise<RateLimitRecord | null> {
    const record = this.store.get(key);
    if (!record) return null;

    // Check if expired
    if (record.resetAt < Date.now()) {
      this.store.delete(key);
      return null;
    }

    return record;
  }

  async set(key: string, record: RateLimitRecord, _ttlMs: number): Promise<void> {
    this.store.set(key, record);
  }

  async increment(key: string, ttlMs: number): Promise<RateLimitRecord> {
    const now = Date.now();
    const existing = await this.get(key);

    if (existing && existing.resetAt > now) {
      existing.count++;
      this.store.set(key, existing);
      return existing;
    }

    const newRecord: RateLimitRecord = {
      count: 1,
      resetAt: now + ttlMs,
    };
    this.store.set(key, newRecord);
    return newRecord;
  }

  private cleanup(): void {
    const now = Date.now();
    const entries = Array.from(this.store.entries());
    for (const [key, record] of entries) {
      if (record.resetAt < now) {
        this.store.delete(key);
      }
    }
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.store.clear();
  }
}

// Default in-memory store instance
let defaultStore: InMemoryStore | null = null;

export function getDefaultStore(): InMemoryStore {
  if (!defaultStore) {
    defaultStore = new InMemoryStore();
  }
  return defaultStore;
}

// Future: Redis store implementation
// export class RedisStore implements RateLimitStore { ... }
