import { JSONWebKeySet } from 'jose';

interface CacheEntry {
  data: JSONWebKeySet;
  timestamp: number;
  ttl: number;
}

interface CacheOptions {
  memoryTTL?: number; // TTL for in-memory cache in milliseconds
  storageTTL?: number; // TTL for localStorage cache in milliseconds
  maxEntries?: number; // Maximum number of entries to store
}

const DEFAULT_OPTIONS: Required<CacheOptions> = {
  memoryTTL: 1000 * 60 * 5, // 5 minutes for memory (shorter than OIDC config)
  storageTTL: 1000 * 60 * 60, // 1 hour for storage (shorter than OIDC config)
  maxEntries: 50,
};

const STORAGE_KEY = 'jwks-cache';

export class JwksCache {
  private memoryCache: Map<string, CacheEntry> = new Map();
  private options: Required<CacheOptions>;
  private pendingRequests: Map<string, Promise<JSONWebKeySet>> = new Map();

  constructor(options: CacheOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.loadFromStorage();
  }

  // Get a JWKS from cache
  get(jwksUri: string): JSONWebKeySet | null {
    const normalizedUrl = this.normalizeUrl(jwksUri);

    // Check memory cache first
    const memoryEntry = this.memoryCache.get(normalizedUrl);
    if (memoryEntry && this.isValid(memoryEntry)) {
      return memoryEntry.data;
    }

    // Check localStorage cache
    const storageCache = this.getStorageCache();
    const storageEntry = storageCache[normalizedUrl];
    if (storageEntry && this.isValid(storageEntry)) {
      // Promote to memory cache with shorter TTL
      this.memoryCache.set(normalizedUrl, {
        ...storageEntry,
        ttl: this.options.memoryTTL,
        timestamp: Date.now(),
      });
      return storageEntry.data;
    }

    return null;
  }

  // Store a JWKS in cache
  set(jwksUri: string, jwks: JSONWebKeySet): void {
    const normalizedUrl = this.normalizeUrl(jwksUri);
    const now = Date.now();

    // Store in memory cache
    this.memoryCache.set(normalizedUrl, {
      data: jwks,
      timestamp: now,
      ttl: this.options.memoryTTL,
    });

    // Store in localStorage
    const storageCache = this.getStorageCache();
    storageCache[normalizedUrl] = {
      data: jwks,
      timestamp: now,
      ttl: this.options.storageTTL,
    };

    // Enforce max entries limit using LRU eviction
    this.enforceMaxEntries(storageCache);
    this.saveToStorage(storageCache);
  }

  // Remove a specific entry from cache (useful when keys might have rotated)
  remove(jwksUri: string): void {
    const normalizedUrl = this.normalizeUrl(jwksUri);
    
    // Remove from memory cache
    this.memoryCache.delete(normalizedUrl);
    
    // Remove from storage cache
    const storageCache = this.getStorageCache();
    delete storageCache[normalizedUrl];
    this.saveToStorage(storageCache);
  }

  // Clear all cache entries
  clear(): void {
    this.memoryCache.clear();
    localStorage.removeItem(STORAGE_KEY);
  }

  // Get cache statistics
  getStats(): {
    memoryEntries: number;
    storageEntries: number;
    oldestEntry: number | null;
    newestEntry: number | null;
  } {
    const storageCache = this.getStorageCache();
    const allEntries = [
      ...Array.from(this.memoryCache.values()),
      ...Object.values(storageCache),
    ];

    const timestamps = allEntries.map(entry => entry.timestamp);
    
    return {
      memoryEntries: this.memoryCache.size,
      storageEntries: Object.keys(storageCache).length,
      oldestEntry: timestamps.length > 0 ? Math.min(...timestamps) : null,
      newestEntry: timestamps.length > 0 ? Math.max(...timestamps) : null,
    };
  }

  // Store a pending request
  setPendingRequest(jwksUri: string, promise: Promise<JSONWebKeySet>): void {
    const normalizedUrl = this.normalizeUrl(jwksUri);
    this.pendingRequests.set(normalizedUrl, promise);
  }

  // Get a pending request
  getPendingRequest(jwksUri: string): Promise<JSONWebKeySet> | null {
    const normalizedUrl = this.normalizeUrl(jwksUri);
    return this.pendingRequests.get(normalizedUrl) || null;
  }

  // Remove a pending request
  removePendingRequest(jwksUri: string): void {
    const normalizedUrl = this.normalizeUrl(jwksUri);
    this.pendingRequests.delete(normalizedUrl);
  }

  // Private helper methods
  private normalizeUrl(url: string): string {
    try {
      const parsed = new URL(url);
      // Remove trailing slash from pathname if present
      let normalizedPath = parsed.pathname;
      if (normalizedPath.endsWith('/') && normalizedPath.length > 1) {
        normalizedPath = normalizedPath.slice(0, -1);
      }
      // Reconstruct URL without query params or hash
      return `${parsed.protocol}//${parsed.host}${normalizedPath}`;
    } catch {
      // If URL parsing fails, return as-is
      return url;
    }
  }

  private isValid(entry: CacheEntry): boolean {
    const now = Date.now();
    return now - entry.timestamp < entry.ttl;
  }

  private getStorageCache(): Record<string, CacheEntry> {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return {};
      
      const parsed = JSON.parse(stored);
      // Filter out invalid entries
      const valid: Record<string, CacheEntry> = {};
      for (const [key, entry] of Object.entries(parsed)) {
        if (this.isValid(entry as CacheEntry)) {
          valid[key] = entry as CacheEntry;
        }
      }
      return valid;
    } catch {
      return {};
    }
  }

  private saveToStorage(cache: Record<string, CacheEntry>): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
    } catch (e) {
      console.warn('Failed to save JWKS cache to localStorage:', e);
    }
  }

  private loadFromStorage(): void {
    const storageCache = this.getStorageCache();
    // Load valid entries into memory cache with updated TTL
    for (const [key, entry] of Object.entries(storageCache)) {
      if (this.isValid(entry)) {
        this.memoryCache.set(key, {
          ...entry,
          ttl: this.options.memoryTTL,
          timestamp: Date.now(),
        });
      }
    }
  }

  private enforceMaxEntries(cache: Record<string, CacheEntry>): void {
    const entries = Object.entries(cache);
    if (entries.length <= this.options.maxEntries) return;

    // Sort by timestamp (oldest first) for LRU eviction
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    // Remove oldest entries to stay within limit
    const toRemove = entries.length - this.options.maxEntries;
    for (let i = 0; i < toRemove; i++) {
      delete cache[entries[i][0]];
    }
  }
}

// Export a singleton instance
export const jwksCache = new JwksCache();