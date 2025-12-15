/**
 * Redis rate limit store
 * Scalable implementation for multi-server deployments
 *
 * Requires ioredis package: npm install ioredis
 *
 * Environment variables:
 * - REDIS_URL: Redis connection URL (e.g., redis://localhost:6379)
 * - REDIS_HOST: Redis host (default: localhost)
 * - REDIS_PORT: Redis port (default: 6379)
 * - REDIS_PASSWORD: Redis password (optional)
 * - REDIS_TLS: Enable TLS (optional, 'true' to enable)
 */

import { RateLimitRecord, RateLimitStore } from './store';

// Type definition for Redis client (ioredis)
interface RedisClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, expiryMode?: string, time?: number): Promise<string | null>;
  setex(key: string, seconds: number, value: string): Promise<string | null>;
  incr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<number>;
  ttl(key: string): Promise<number>;
  pttl(key: string): Promise<number>;
  del(...keys: string[]): Promise<number>;
  quit(): Promise<string>;
  disconnect(): void;
  on(event: string, callback: (...args: unknown[]) => void): void;
}

export interface RedisStoreConfig {
  /** Redis connection URL (takes precedence over host/port) */
  url?: string;
  /** Redis host (default: localhost) */
  host?: string;
  /** Redis port (default: 6379) */
  port?: number;
  /** Redis password */
  password?: string;
  /** Enable TLS */
  tls?: boolean;
  /** Key prefix for rate limit keys */
  prefix?: string;
  /** Connection timeout in ms (default: 5000) */
  connectTimeout?: number;
  /** Enable auto-reconnect (default: true) */
  autoReconnect?: boolean;
}

/**
 * Redis-based rate limit store
 * Provides distributed rate limiting for scalable deployments
 */
export class RedisStore implements RateLimitStore {
  private client: RedisClient | null = null;
  private prefix: string;
  private config: RedisStoreConfig;
  private connected = false;
  private connecting = false;

  constructor(config: RedisStoreConfig = {}) {
    this.config = {
      host: config.host || process.env.REDIS_HOST || 'localhost',
      port: config.port || parseInt(process.env.REDIS_PORT || '6379', 10),
      password: config.password || process.env.REDIS_PASSWORD,
      url: config.url || process.env.REDIS_URL,
      tls: config.tls || process.env.REDIS_TLS === 'true',
      prefix: config.prefix || 'ratelimit:',
      connectTimeout: config.connectTimeout || 5000,
      autoReconnect: config.autoReconnect !== false,
    };
    this.prefix = this.config.prefix || 'ratelimit:';
  }

  /**
   * Initialize Redis connection
   */
  async connect(): Promise<void> {
    if (this.connected || this.connecting) {
      return;
    }

    this.connecting = true;

    try {
      // Dynamic import to avoid requiring ioredis if not used
      // Using Function constructor to bypass TypeScript static analysis for optional dependency
      // eslint-disable-next-line @typescript-eslint/no-implied-eval, no-new-func
      const dynamicImport = new Function('moduleName', 'return import(moduleName)');
      const ioredisModule = await dynamicImport('ioredis');
      const Redis = ioredisModule.default;

      const options: Record<string, unknown> = {
        connectTimeout: this.config.connectTimeout,
        maxRetriesPerRequest: this.config.autoReconnect ? 3 : 0,
        retryStrategy: this.config.autoReconnect
          ? (times: number) => Math.min(times * 50, 2000)
          : () => null,
      };

      if (this.config.password) {
        options.password = this.config.password;
      }

      if (this.config.tls) {
        options.tls = {};
      }

      if (this.config.url) {
        this.client = new Redis(this.config.url, options) as unknown as RedisClient;
      } else {
        this.client = new Redis({
          host: this.config.host,
          port: this.config.port,
          ...options,
        }) as unknown as RedisClient;
      }

      // Wait for connection
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Redis connection timeout'));
        }, this.config.connectTimeout);

        this.client!.on('connect', () => {
          clearTimeout(timeout);
          this.connected = true;
          resolve();
        });

        this.client!.on('error', (err: unknown) => {
          clearTimeout(timeout);
          reject(err);
        });
      });
    } finally {
      this.connecting = false;
    }
  }

  /**
   * Ensure Redis is connected before operations
   */
  private async ensureConnected(): Promise<RedisClient> {
    if (!this.connected || !this.client) {
      await this.connect();
    }
    if (!this.client) {
      throw new Error('Redis client not initialized');
    }
    return this.client;
  }

  /**
   * Get rate limit record for a key
   */
  async get(key: string): Promise<RateLimitRecord | null> {
    const client = await this.ensureConnected();
    const prefixedKey = this.prefix + key;

    const [countStr, pttl] = await Promise.all([
      client.get(prefixedKey),
      client.pttl(prefixedKey),
    ]);

    if (!countStr || pttl < 0) {
      return null;
    }

    return {
      count: parseInt(countStr, 10),
      resetAt: Date.now() + pttl,
    };
  }

  /**
   * Set rate limit record with TTL
   */
  async set(key: string, record: RateLimitRecord, ttlMs: number): Promise<void> {
    const client = await this.ensureConnected();
    const prefixedKey = this.prefix + key;
    const ttlSeconds = Math.ceil(ttlMs / 1000);

    await client.setex(prefixedKey, ttlSeconds, record.count.toString());
  }

  /**
   * Atomically increment rate limit counter
   */
  async increment(key: string, ttlMs: number): Promise<RateLimitRecord> {
    const client = await this.ensureConnected();
    const prefixedKey = this.prefix + key;
    const ttlSeconds = Math.ceil(ttlMs / 1000);

    // Atomic increment with TTL using Lua script would be ideal,
    // but for simplicity we use multi-step with acceptable race condition
    const count = await client.incr(prefixedKey);

    // Set expiry only on first increment (when count is 1)
    if (count === 1) {
      await client.expire(prefixedKey, ttlSeconds);
    }

    // Get actual TTL for accurate resetAt
    const pttl = await client.pttl(prefixedKey);
    const resetAt = pttl > 0 ? Date.now() + pttl : Date.now() + ttlMs;

    return {
      count,
      resetAt,
    };
  }

  /**
   * Delete a rate limit key
   */
  async delete(key: string): Promise<void> {
    const client = await this.ensureConnected();
    await client.del(this.prefix + key);
  }

  /**
   * Close Redis connection
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
      this.connected = false;
    }
  }

  /**
   * Check if Redis is connected
   */
  isConnected(): boolean {
    return this.connected;
  }
}

// Singleton Redis store instance
let redisStore: RedisStore | null = null;

/**
 * Get or create Redis store singleton
 */
export function getRedisStore(config?: RedisStoreConfig): RedisStore {
  if (!redisStore) {
    redisStore = new RedisStore(config);
  }
  return redisStore;
}

/**
 * Reset Redis store singleton (for testing)
 */
export function resetRedisStore(): void {
  if (redisStore) {
    redisStore.disconnect().catch(() => {});
    redisStore = null;
  }
}
