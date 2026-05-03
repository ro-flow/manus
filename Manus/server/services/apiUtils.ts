/**
 * Shared API utilities: fetchWithRetry + in-memory cache
 * H5: API caching for PDOK/RIVM responses
 * H7: Uniform retry logic across all services
 */

// ============ FETCH WITH RETRY (H7) ============

export interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  timeoutMs?: number;
}

const DEFAULT_RETRY: Required<RetryOptions> = {
  maxRetries: 3,
  baseDelayMs: 500,
  maxDelayMs: 5000,
  timeoutMs: 15000,
};

/**
 * Fetch with exponential backoff retry logic.
 * Handles ECONNRESET, ETIMEDOUT, rate limiting (429), and server errors (5xx).
 */
export async function fetchWithRetry(
  url: string,
  options?: RequestInit & { retryOptions?: RetryOptions },
): Promise<Response> {
  const { retryOptions, ...fetchOptions } = options || {};
  const config = { ...DEFAULT_RETRY, ...retryOptions };

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      // Retry on rate limiting or server errors
      if ((response.status === 429 || response.status >= 500) && attempt < config.maxRetries) {
        const delay = Math.min(config.baseDelayMs * Math.pow(2, attempt), config.maxDelayMs);
        const jitter = Math.random() * delay * 0.3;
        console.warn(`[fetchWithRetry] ${response.status} for ${url.substring(0, 80)}..., retry ${attempt + 1}/${config.maxRetries}`);
        await new Promise(r => setTimeout(r, delay + jitter));
        continue;
      }

      return response;
    } catch (error: any) {
      const isRetryable = error?.code === 'ECONNRESET' ||
        error?.code === 'ETIMEDOUT' ||
        error?.code === 'ECONNREFUSED' ||
        error?.code === 'UND_ERR_SOCKET' ||
        error?.name === 'AbortError' ||
        error?.cause?.code === 'ECONNRESET';

      if (isRetryable && attempt < config.maxRetries) {
        const delay = Math.min(config.baseDelayMs * Math.pow(2, attempt), config.maxDelayMs);
        const jitter = Math.random() * delay * 0.3;
        console.warn(`[fetchWithRetry] ${error.code || error.name} for ${url.substring(0, 80)}..., retry ${attempt + 1}/${config.maxRetries}`);
        await new Promise(r => setTimeout(r, delay + jitter));
        continue;
      }

      throw error;
    }
  }

  throw new Error('fetchWithRetry: unreachable');
}


// ============ IN-MEMORY API CACHE (H5) ============

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry<any>>();

// Default TTL: 5 minutes for PDOK/RIVM data (doesn't change frequently)
const DEFAULT_TTL_MS = 5 * 60 * 1000;

// Maximum cache size to prevent memory leaks
const MAX_CACHE_SIZE = 500;

/**
 * Get a cached value by key.
 * Returns undefined if not found or expired.
 */
export function cacheGet<T>(key: string): T | undefined {
  const entry = cache.get(key);
  if (!entry) return undefined;
  
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return undefined;
  }
  
  return entry.data as T;
}

/**
 * Set a cached value with optional TTL.
 */
export function cacheSet<T>(key: string, data: T, ttlMs: number = DEFAULT_TTL_MS): void {
  // Evict oldest entries if cache is too large
  if (cache.size >= MAX_CACHE_SIZE) {
    const keys = Array.from(cache.keys());
    const toRemove = keys.slice(0, Math.floor(MAX_CACHE_SIZE / 4));
    toRemove.forEach(k => cache.delete(k));
  }

  cache.set(key, {
    data,
    expiresAt: Date.now() + ttlMs,
  });
}

/**
 * Generate a cache key from URL and parameters.
 */
export function makeCacheKey(prefix: string, ...parts: (string | number | undefined | null)[]): string {
  return `${prefix}:${parts.filter(p => p != null).join(':')}`;
}

/**
 * Cached fetch: check cache first, then fetch with retry.
 * Returns parsed JSON response.
 */
export async function cachedFetchJSON<T>(
  cacheKey: string,
  url: string,
  options?: RequestInit & { retryOptions?: RetryOptions; ttlMs?: number },
): Promise<T> {
  // Check cache first
  const cached = cacheGet<T>(cacheKey);
  if (cached !== undefined) {
    return cached;
  }

  // Fetch with retry
  const { ttlMs, ...fetchOptions } = options || {};
  const response = await fetchWithRetry(url, fetchOptions);
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${url.substring(0, 100)}`);
  }

  const data = await response.json() as T;
  
  // Cache the result
  cacheSet(cacheKey, data, ttlMs);
  
  return data;
}

/**
 * Get cache statistics for monitoring.
 */
export function getCacheStats(): { size: number; maxSize: number } {
  // Clean expired entries
  const now = Date.now();
  Array.from(cache.entries()).forEach(([key, entry]) => {
    if (now > entry.expiresAt) {
      cache.delete(key);
    }
  });
  
  return {
    size: cache.size,
    maxSize: MAX_CACHE_SIZE,
  };
}

/**
 * Clear all cache entries.
 */
export function clearCache(): void {
  cache.clear();
}
