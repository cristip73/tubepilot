import { describe, it, expect, beforeEach } from 'vitest';
import { CacheService } from '../src/services/cache';

describe('CacheService', () => {
  let cache: CacheService;

  beforeEach(() => {
    cache = new CacheService(300);
  });

  describe('get/set', () => {
    it('stores and retrieves values', () => {
      cache.set('key1', 'value1');
      expect(cache.get('key1')).toBe('value1');
    });

    it('returns undefined for missing keys', () => {
      expect(cache.get('nonexistent')).toBeUndefined();
    });

    it('stores complex objects', () => {
      const obj = { name: 'test', count: 42, nested: { a: 1 } };
      cache.set('obj', obj);
      expect(cache.get('obj')).toEqual(obj);
    });
  });

  describe('has', () => {
    it('returns true for existing keys', () => {
      cache.set('key', 'value');
      expect(cache.has('key')).toBe(true);
    });

    it('returns false for missing keys', () => {
      expect(cache.has('missing')).toBe(false);
    });
  });

  describe('del', () => {
    it('deletes existing keys', () => {
      cache.set('key', 'value');
      expect(cache.del('key')).toBe(1);
      expect(cache.has('key')).toBe(false);
    });

    it('returns 0 for missing keys', () => {
      expect(cache.del('missing')).toBe(0);
    });
  });

  describe('flush', () => {
    it('clears all cached values', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.flush();
      expect(cache.has('key1')).toBe(false);
      expect(cache.has('key2')).toBe(false);
    });
  });

  describe('getOrSet', () => {
    it('returns cached value if exists', async () => {
      cache.set('cached', 'existing');
      let fetchCalled = false;
      const result = await cache.getOrSet('cached', async () => {
        fetchCalled = true;
        return 'new';
      });
      expect(result).toBe('existing');
      expect(fetchCalled).toBe(false);
    });

    it('fetches and caches if not exists', async () => {
      let fetchCount = 0;
      const result = await cache.getOrSet('new', async () => {
        fetchCount++;
        return 'fetched';
      });
      expect(result).toBe('fetched');
      expect(fetchCount).toBe(1);
      expect(cache.get('new')).toBe('fetched');
    });

    it('only fetches once for same key', async () => {
      let fetchCount = 0;
      await cache.getOrSet('key', async () => {
        fetchCount++;
        return 'value';
      });
      await cache.getOrSet('key', async () => {
        fetchCount++;
        return 'value2';
      });
      expect(fetchCount).toBe(1);
    });
  });

  describe('makeKey', () => {
    it('joins parts with colon', () => {
      expect(CacheService.makeKey('a', 'b', 'c')).toBe('a:b:c');
    });

    it('handles numbers', () => {
      expect(CacheService.makeKey('search', 'query', 10)).toBe('search:query:10');
    });

    it('filters out undefined values', () => {
      expect(CacheService.makeKey('a', undefined, 'b')).toBe('a:b');
    });

    it('handles all undefined', () => {
      expect(CacheService.makeKey(undefined, undefined)).toBe('');
    });
  });
});
