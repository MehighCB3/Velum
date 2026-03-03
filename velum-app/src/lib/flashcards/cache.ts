/**
 * Server-side in-memory cache for flashcard data.
 * Avoids re-reading JSON files from disk on every API request.
 * Cache auto-invalidates after TTL or on writes.
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const DEFAULT_TTL = 30_000; // 30 seconds

class MemoryCache {
  private store = new Map<string, CacheEntry<unknown>>();

  get<T>(key: string, ttl = DEFAULT_TTL): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > ttl) {
      this.store.delete(key);
      return null;
    }
    return entry.data as T;
  }

  set<T>(key: string, data: T): void {
    this.store.set(key, { data, timestamp: Date.now() });
  }

  invalidate(key: string): void {
    this.store.delete(key);
  }

  invalidateAll(): void {
    this.store.clear();
  }
}

// Singleton — survives across requests in the same server process
export const cache = new MemoryCache();

export const CACHE_KEYS = {
  CARDS: 'flashcards:cards',
  STATS: 'flashcards:stats',
} as const;
