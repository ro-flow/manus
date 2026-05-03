import { describe, it, expect, vi, beforeEach } from 'vitest';
import { cacheGet, cacheSet, makeCacheKey, clearCache, getCacheStats, fetchWithRetry } from './apiUtils';

describe('apiUtils', () => {
  beforeEach(() => {
    clearCache();
  });

  describe('cacheGet / cacheSet', () => {
    it('should cache and retrieve values', () => {
      cacheSet('test-key', { data: 'hello' });
      const result = cacheGet('test-key');
      expect(result).toEqual({ data: 'hello' });
    });

    it('should return undefined for missing keys', () => {
      const result = cacheGet('nonexistent');
      expect(result).toBeUndefined();
    });

    it('should expire entries after TTL', async () => {
      cacheSet('expiring', 'value', 5); // 5ms TTL
      await new Promise(resolve => setTimeout(resolve, 20));
      const result = cacheGet('expiring');
      expect(result).toBeUndefined();
    });

    it('should not expire entries within TTL', () => {
      cacheSet('alive', 'value', 60000); // 60s TTL
      const result = cacheGet('alive');
      expect(result).toBe('value');
    });
  });

  describe('clearCache', () => {
    it('should clear all entries', () => {
      cacheSet('key1', 'val1');
      cacheSet('key2', 'val2');
      clearCache();
      expect(cacheGet('key1')).toBeUndefined();
      expect(cacheGet('key2')).toBeUndefined();
    });
  });

  describe('getCacheStats', () => {
    it('should report correct size', () => {
      expect(getCacheStats().size).toBe(0);
      cacheSet('k1', 'v1');
      expect(getCacheStats().size).toBe(1);
      cacheSet('k2', 'v2');
      expect(getCacheStats().size).toBe(2);
    });

    it('should clean expired entries during stats check', async () => {
      cacheSet('expired1', 'v1', 5);
      cacheSet('alive1', 'v2', 60000);
      await new Promise(resolve => setTimeout(resolve, 20));
      const stats = getCacheStats();
      expect(stats.size).toBe(1); // only alive1 remains
    });
  });

  describe('makeCacheKey', () => {
    it('should generate consistent keys', () => {
      const key1 = makeCacheKey('wfs', 'natura2000', '50.78', '5.69');
      const key2 = makeCacheKey('wfs', 'natura2000', '50.78', '5.69');
      expect(key1).toBe(key2);
    });

    it('should filter null/undefined parts', () => {
      const key = makeCacheKey('wfs', 'test', undefined, null, '5.69');
      expect(key).toBe('wfs:test:5.69');
    });
  });

  describe('fetchWithRetry', () => {
    it('should succeed on first try when fetch works', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ result: 'success' }),
      });
      vi.stubGlobal('fetch', mockFetch);

      const response = await fetchWithRetry('https://example.com/api');
      expect(response.ok).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      vi.unstubAllGlobals();
    });

    it('should retry on 429 status and eventually succeed', async () => {
      let callCount = 0;
      const mockFetch = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount < 3) {
          return Promise.resolve({
            ok: false,
            status: 429,
            json: () => Promise.resolve({}),
          });
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ result: 'success' }),
        });
      });
      vi.stubGlobal('fetch', mockFetch);

      const response = await fetchWithRetry('https://example.com/api', {
        retryOptions: { maxRetries: 3, baseDelayMs: 10, maxDelayMs: 50 },
      });
      expect(response.ok).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(3);

      vi.unstubAllGlobals();
    });

    it('should retry on ECONNRESET errors', async () => {
      let callCount = 0;
      const mockFetch = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount < 2) {
          const err = new Error('ECONNRESET');
          (err as any).code = 'ECONNRESET';
          return Promise.reject(err);
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ result: 'success' }),
        });
      });
      vi.stubGlobal('fetch', mockFetch);

      const response = await fetchWithRetry('https://example.com/api', {
        retryOptions: { maxRetries: 3, baseDelayMs: 10, maxDelayMs: 50 },
      });
      expect(response.ok).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(2);

      vi.unstubAllGlobals();
    });

    it('should throw non-retryable errors immediately', async () => {
      const mockFetch = vi.fn().mockRejectedValue(new TypeError('Invalid URL'));
      vi.stubGlobal('fetch', mockFetch);

      await expect(
        fetchWithRetry('invalid-url', {
          retryOptions: { maxRetries: 3, baseDelayMs: 10 },
        })
      ).rejects.toThrow('Invalid URL');
      expect(mockFetch).toHaveBeenCalledTimes(1);

      vi.unstubAllGlobals();
    });
  });
});
