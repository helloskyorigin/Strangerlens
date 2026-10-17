import { FetchResult } from "./website-fetcher";

interface CacheEntry {
  result: FetchResult;
  timestamp: number;
}

const fetchCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60 * 1000; // 60 seconds TTL
const MAX_CACHE_ENTRIES = 25; // Hard cap on cached HTML payloads per container instance

function canonicalizeUrlKey(url: string): string {
  const trimmed = (url || "").trim().toLowerCase();
  try {
    const withProto = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const parsed = new URL(withProto);
    const host = parsed.hostname.replace(/^www\./, "");
    const cleanPath = parsed.pathname.replace(/\/+$/, "");
    return `${host}${cleanPath}`;
  } catch {
    return trimmed.replace(/^https?:\/\//i, "").replace(/^www\./, "").replace(/\/+$/, "");
  }
}

/**
 * Retrieves a recently fetched website result by normalized URL if fresh
 */
export function getCachedFetch(normalizedUrl: string): FetchResult | null {
  const now = Date.now();
  let entry = fetchCache.get(normalizedUrl);

  // If not found by direct key, search bounded entries by canonical URL
  if (!entry) {
    const targetCanon = canonicalizeUrlKey(normalizedUrl);
    for (const [key, val] of fetchCache.entries()) {
      if (canonicalizeUrlKey(key) === targetCanon) {
        entry = val;
        break;
      }
    }
  }

  if (!entry) return null;

  if (now - entry.timestamp > CACHE_TTL_MS) {
    fetchCache.delete(normalizedUrl);
    return null;
  }

  return entry.result;
}

/**
 * Stores a fetch result in the memory cache with TTL pruning and bounded capacity
 */
export function setCachedFetch(normalizedUrl: string, result: FetchResult): void {
  const now = Date.now();

  // 1. Always prune expired entries first
  for (const [key, value] of fetchCache.entries()) {
    if (now - value.timestamp > CACHE_TTL_MS) {
      fetchCache.delete(key);
    }
  }

  // 2. If updating an existing key, delete first so re-insertion updates Map insertion order
  if (fetchCache.has(normalizedUrl)) {
    fetchCache.delete(normalizedUrl);
  }

  // 3. Enforce strict upper bound (FIFO eviction of oldest entry)
  while (fetchCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = fetchCache.keys().next().value;
    if (oldestKey === undefined) break;
    fetchCache.delete(oldestKey);
  }

  fetchCache.set(normalizedUrl, {
    result,
    timestamp: now,
  });
}

export function _clearFetchCacheForTesting(): void {
  fetchCache.clear();
}

export function _getFetchCacheSizeForTesting(): number {
  return fetchCache.size;
}
