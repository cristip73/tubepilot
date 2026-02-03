import NodeCache from 'node-cache';

// Memory safety: limit cache size to prevent unbounded growth
const DEFAULT_MAX_KEYS = 1000;

export class CacheService {
  private cache: NodeCache;
  private maxKeys: number;

  constructor(ttlSeconds: number = 300, maxKeys: number = DEFAULT_MAX_KEYS) {
    this.maxKeys = maxKeys;
    this.cache = new NodeCache({
      stdTTL: ttlSeconds,
      checkperiod: ttlSeconds * 0.2,
      useClones: false,
      maxKeys: maxKeys, // Prevent memory bloat
    });
  }

  get<T>(key: string): T | undefined {
    return this.cache.get<T>(key);
  }

  set<T>(key: string, value: T, ttl?: number): boolean {
    if (ttl !== undefined) {
      return this.cache.set(key, value, ttl);
    }
    return this.cache.set(key, value);
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  del(key: string): number {
    return this.cache.del(key);
  }

  flush(): void {
    this.cache.flushAll();
  }

  /**
   * Get or set with async function
   */
  async getOrSet<T>(key: string, fetchFn: () => Promise<T>, ttl?: number): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== undefined) {
      return cached;
    }

    const value = await fetchFn();
    this.set(key, value, ttl);
    return value;
  }

  /**
   * Generate a cache key from multiple parts
   */
  static makeKey(...parts: (string | number | undefined)[]): string {
    return parts.filter((p) => p !== undefined).join(':');
  }

  /**
   * Get cache statistics for monitoring
   */
  getStats(): { keys: number; hits: number; misses: number; maxKeys: number } {
    const stats = this.cache.getStats();
    return {
      keys: this.cache.keys().length,
      hits: stats.hits,
      misses: stats.misses,
      maxKeys: this.maxKeys,
    };
  }
}
