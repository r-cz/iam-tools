/**
 * Generic resource cache with memory and localStorage support
 * Supports configurable TTLs, LRU eviction, and in-flight request deduplication
 */

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

export interface CacheOptions {
  storageKey: string // Key for localStorage
  memoryTTL: number // TTL for in-memory cache in milliseconds
  storageTTL: number // TTL for localStorage cache in milliseconds
  maxEntries?: number // Maximum number of entries to store
}

const DEFAULT_MAX_ENTRIES = 50

export class ResourceCache<T> {
  private memoryCache: Map<string, CacheEntry<T>> = new Map()
  private pendingRequests: Map<string, Promise<T>> = new Map()
  private inMemoryStorage: Record<string, CacheEntry<T>> = {}
  private options: Required<CacheOptions>

  constructor(options: CacheOptions) {
    this.options = {
      ...options,
      maxEntries: options.maxEntries ?? DEFAULT_MAX_ENTRIES,
    }
    this.loadFromStorage()
  }

  /**
   * Get a resource from cache
   * Checks memory cache first, then localStorage
   */
  get(key: string): T | null {
    const normalizedKey = this.normalizeUrl(key)

    // Check memory cache first
    const memoryEntry = this.memoryCache.get(normalizedKey)
    if (memoryEntry && this.isValid(memoryEntry)) {
      return memoryEntry.data
    }

    // Check localStorage cache
    const storageCache = this.getStorageCache()
    const storageEntry = storageCache[normalizedKey]
    if (storageEntry && this.isValid(storageEntry)) {
      // Promote to memory cache with shorter TTL
      this.memoryCache.set(normalizedKey, {
        ...storageEntry,
        ttl: this.options.memoryTTL,
        timestamp: Date.now(),
      })
      return storageEntry.data
    }

    return null
  }

  /**
   * Store a resource in cache
   * Saves to both memory and localStorage
   */
  set(key: string, data: T): void {
    const normalizedKey = this.normalizeUrl(key)
    const now = Date.now()

    // Store in memory cache
    this.memoryCache.set(normalizedKey, {
      data,
      timestamp: now,
      ttl: this.options.memoryTTL,
    })

    // Store in localStorage
    const storageCache = this.getStorageCache()
    storageCache[normalizedKey] = {
      data,
      timestamp: now,
      ttl: this.options.storageTTL,
    }

    // Enforce max entries limit using LRU eviction
    this.enforceMaxEntries(storageCache)
    this.saveToStorage(storageCache)
  }

  /**
   * Remove a specific entry from cache
   * Useful when keys might have rotated or data is stale
   */
  remove(key: string): void {
    const normalizedKey = this.normalizeUrl(key)

    // Remove from memory cache
    this.memoryCache.delete(normalizedKey)

    // Remove from storage cache
    const storageCache = this.getStorageCache()
    delete storageCache[normalizedKey]
    this.saveToStorage(storageCache)
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.memoryCache.clear()
    if (this.hasStorage()) {
      window.localStorage.removeItem(this.options.storageKey)
    } else {
      this.inMemoryStorage = {}
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    memoryEntries: number
    storageEntries: number
    oldestEntry: number | null
    newestEntry: number | null
  } {
    const storageCache = this.getStorageCache()
    const allEntries = [...Array.from(this.memoryCache.values()), ...Object.values(storageCache)]

    const timestamps = allEntries.map((entry) => entry.timestamp)

    return {
      memoryEntries: this.memoryCache.size,
      storageEntries: Object.keys(storageCache).length,
      oldestEntry: timestamps.length > 0 ? Math.min(...timestamps) : null,
      newestEntry: timestamps.length > 0 ? Math.max(...timestamps) : null,
    }
  }

  /**
   * Store a pending request to prevent duplicate fetches
   */
  setPendingRequest(key: string, promise: Promise<T>): void {
    const normalizedKey = this.normalizeUrl(key)
    this.pendingRequests.set(normalizedKey, promise)
  }

  /**
   * Get a pending request
   */
  getPendingRequest(key: string): Promise<T> | null {
    const normalizedKey = this.normalizeUrl(key)
    return this.pendingRequests.get(normalizedKey) || null
  }

  /**
   * Remove a pending request
   */
  removePendingRequest(key: string): void {
    const normalizedKey = this.normalizeUrl(key)
    this.pendingRequests.delete(normalizedKey)
  }

  // Private helper methods

  private normalizeUrl(url: string): string {
    try {
      const parsed = new URL(url)
      // Remove trailing slash from pathname if present
      let normalizedPath = parsed.pathname
      if (normalizedPath.endsWith('/') && normalizedPath.length > 1) {
        normalizedPath = normalizedPath.slice(0, -1)
      }
      // Reconstruct URL without query params or hash
      return `${parsed.protocol}//${parsed.host}${normalizedPath}`
    } catch {
      // If URL parsing fails, return as-is
      return url
    }
  }

  private isValid(entry: CacheEntry<T>): boolean {
    const now = Date.now()
    return now - entry.timestamp < entry.ttl
  }

  private getStorageCache(): Record<string, CacheEntry<T>> {
    if (this.hasStorage()) {
      try {
        const stored = window.localStorage.getItem(this.options.storageKey)
        if (!stored) return {}

        const parsed = JSON.parse(stored)
        // Filter out invalid entries
        const valid: Record<string, CacheEntry<T>> = {}
        for (const [key, entry] of Object.entries(parsed)) {
          if (this.isValid(entry as CacheEntry<T>)) {
            valid[key] = entry as CacheEntry<T>
          }
        }
        return valid
      } catch {
        return {}
      }
    }

    return { ...this.inMemoryStorage }
  }

  private saveToStorage(cache: Record<string, CacheEntry<T>>): void {
    if (this.hasStorage()) {
      try {
        window.localStorage.setItem(this.options.storageKey, JSON.stringify(cache))
      } catch (e) {
        console.warn(`Failed to save ${this.options.storageKey} to localStorage:`, e)
      }
      return
    }

    this.inMemoryStorage = { ...cache }
  }

  private loadFromStorage(): void {
    const storageCache = this.getStorageCache()
    // Load valid entries into memory cache with updated TTL
    for (const [key, entry] of Object.entries(storageCache)) {
      if (this.isValid(entry)) {
        this.memoryCache.set(key, {
          ...entry,
          ttl: this.options.memoryTTL,
          timestamp: Date.now(),
        })
      }
    }

    if (!this.hasStorage()) {
      this.inMemoryStorage = storageCache
    }
  }

  private hasStorage(): boolean {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
  }

  private enforceMaxEntries(cache: Record<string, CacheEntry<T>>): void {
    const entries = Object.entries(cache)
    if (entries.length <= this.options.maxEntries) return

    // Sort by timestamp (oldest first) for LRU eviction
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp)

    // Remove oldest entries to stay within limit
    const toRemove = entries.length - this.options.maxEntries
    for (let i = 0; i < toRemove; i++) {
      delete cache[entries[i][0]]
    }
  }
}
