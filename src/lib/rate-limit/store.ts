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

/**
 * Store type configuration
 */
export type StoreType = 'memory' | 'redis';

export interface StoreFactoryConfig {
  type?: StoreType;
  redis?: {
    url?: string;
    host?: string;
    port?: number;
    password?: string;
    tls?: boolean;
    prefix?: string;
  };
}

// Cached store instance for factory
let factoryStore: RateLimitStore | null = null;
let factoryStoreType: StoreType | null = null;

/**
 * Get rate limit store based on configuration
 * Automatically selects Redis if REDIS_URL is set, otherwise uses in-memory
 *
 * @param config - Optional configuration to override defaults
 * @returns Rate limit store instance
 */
export async function getRateLimitStore(config?: StoreFactoryConfig): Promise<RateLimitStore> {
  // Determine store type
  const storeType = config?.type ||
    (process.env.REDIS_URL || process.env.REDIS_HOST ? 'redis' : 'memory');

  // Return cached store if same type
  if (factoryStore && factoryStoreType === storeType) {
    return factoryStore;
  }

  // Create appropriate store
  if (storeType === 'redis') {
    try {
      const { RedisStore } = await import('./redis-store');
      const redisStore = new RedisStore(config?.redis);
      await redisStore.connect();
      factoryStore = redisStore;
      factoryStoreType = 'redis';
      console.log('[RateLimit] Using Redis store');
    } catch (error) {
      console.warn('[RateLimit] Failed to initialize Redis store, falling back to memory:', error);
      factoryStore = getDefaultStore();
      factoryStoreType = 'memory';
    }
  } else {
    factoryStore = getDefaultStore();
    factoryStoreType = 'memory';
    console.log('[RateLimit] Using in-memory store');
  }

  return factoryStore;
}

/**
 * Check if Redis is available and should be used
 */
export function isRedisConfigured(): boolean {
  return !!(process.env.REDIS_URL || process.env.REDIS_HOST);
}

/**
 * Reset factory store (for testing)
 */
export function resetFactoryStore(): void {
  factoryStore = null;
  factoryStoreType = null;
}
