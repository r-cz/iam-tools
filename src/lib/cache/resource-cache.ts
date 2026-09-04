/**
 * Generic resource cache with memory and localStorage support
 * Supports configurable TTLs, LRU eviction, and in-flight request deduplication
 */

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
  lastAccess?: number
}

export interface CacheOptions {
  storageKey: string // Key for localStorage
  memoryTTL: number // TTL for in-memory cache in milliseconds
  storageTTL: number // TTL for localStorage cache in milliseconds
  maxEntries?: number // Maximum number of entries to store
}

const DEFAULT_MAX_ENTRIES = 50
const CACHE_STORAGE_VERSION = 1

interface StoredCache<T> {
  version: typeof CACHE_STORAGE_VERSION
  entries: Record<string, CacheEntry<T>>
}

export class ResourceCache<T> {
  private memoryCache: Map<string, CacheEntry<T>> = new Map()
  private pendingRequests: Map<string, Promise<T>> = new Map()
  private inMemoryStorage: Record<string, CacheEntry<T>> = {}
  private storageFailed = false
  private options: Required<CacheOptions>

  constructor(options: CacheOptions) {
    this.options = {
      ...options,
      maxEntries: Number.isFinite(options.maxEntries)
        ? Math.max(1, Math.floor(options.maxEntries!))
        : DEFAULT_MAX_ENTRIES,
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
      memoryEntry.lastAccess = Date.now()
      return memoryEntry.data
    }
    this.memoryCache.delete(normalizedKey)

    // Check localStorage cache
    const storageCache = this.getStorageCache()
    const storageEntry = storageCache[normalizedKey]
    if (storageEntry && this.isValid(storageEntry)) {
      // Promote to memory cache with shorter TTL
      this.promoteToMemory(normalizedKey, storageEntry)
      return storageEntry.data
    }

    return null
  }

  /**
   * Store a resource in cache
   * Saves to both memory and localStorage
   */
  set(key: string, data: T): void {
    this.pruneMemory()
    const normalizedKey = this.normalizeUrl(key)
    const now = Date.now()
    this.pendingRequests.delete(normalizedKey)

    // Store in memory cache
    this.memoryCache.set(normalizedKey, {
      data,
      timestamp: now,
      ttl: Math.min(this.options.memoryTTL, this.options.storageTTL),
      lastAccess: now,
    })

    // Store in localStorage
    const storageCache = this.getStorageCache()
    storageCache[normalizedKey] = {
      data,
      timestamp: now,
      ttl: this.options.storageTTL,
      lastAccess: now,
    }

    // Enforce max entries limit using LRU eviction
    this.enforceMaxEntries(storageCache)
    this.enforceMemoryLimit()
    this.saveToStorage(storageCache)
  }

  /**
   * Remove a specific entry from cache
   * Useful when keys might have rotated or data is stale
   */
  remove(key: string): void {
    const normalizedKey = this.normalizeUrl(key)

    // Invalidate pending loaders too, so an old result cannot repopulate removed data.
    this.pendingRequests.delete(normalizedKey)
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
    this.pendingRequests.clear()
    this.inMemoryStorage = {}
    try {
      if (this.hasStorage()) window.localStorage.removeItem(this.options.storageKey)
    } catch {
      // Storage may be disabled or inaccessible; the session cache is still cleared.
      this.storageFailed = true
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
    this.pruneMemory()
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

  async getOrLoad(
    key: string,
    loader: () => Promise<T>,
    options: { forceRefresh?: boolean } = {}
  ): Promise<T> {
    const normalizedKey = this.normalizeUrl(key)
    if (!options.forceRefresh) {
      const cached = this.get(normalizedKey)
      if (cached !== null) return cached
      const pending = this.pendingRequests.get(normalizedKey)
      if (pending) return pending
    }

    const promise = loader()
    this.pendingRequests.set(normalizedKey, promise)
    try {
      const value = await promise
      if (this.pendingRequests.get(normalizedKey) === promise) this.set(normalizedKey, value)
      return value
    } finally {
      if (this.pendingRequests.get(normalizedKey) === promise) {
        this.pendingRequests.delete(normalizedKey)
      }
    }
  }

  // Private helper methods

  private normalizeUrl(url: string): string {
    try {
      const parsed = new URL(url)
      parsed.hash = ''
      return parsed.toString()
    } catch {
      // If URL parsing fails, return as-is
      return url
    }
  }

  private isValid(entry: unknown): entry is CacheEntry<T> {
    if (!entry || typeof entry !== 'object') return false
    const value = entry as Partial<CacheEntry<T>>
    return (
      'data' in value &&
      typeof value.timestamp === 'number' &&
      Number.isFinite(value.timestamp) &&
      typeof value.ttl === 'number' &&
      Number.isFinite(value.ttl) &&
      value.ttl > 0 &&
      Date.now() >= value.timestamp &&
      Date.now() - value.timestamp < value.ttl
    )
  }

  private promoteToMemory(key: string, entry: CacheEntry<T>): void {
    const now = Date.now()
    this.memoryCache.set(key, {
      ...entry,
      timestamp: now,
      ttl: Math.min(this.options.memoryTTL, entry.timestamp + entry.ttl - now),
      lastAccess: now,
    })
    this.enforceMemoryLimit()
  }

  private enforceMemoryLimit(): void {
    while (this.memoryCache.size > this.options.maxEntries) {
      const oldest = [...this.memoryCache.entries()].sort(
        (a, b) => (a[1].lastAccess ?? a[1].timestamp) - (b[1].lastAccess ?? b[1].timestamp)
      )[0]
      this.memoryCache.delete(oldest[0])
    }
  }

  private pruneMemory(): void {
    for (const [key, entry] of this.memoryCache) {
      if (!this.isValid(entry)) this.memoryCache.delete(key)
    }
  }

  private getStorageCache(): Record<string, CacheEntry<T>> {
    if (this.hasStorage()) {
      let stored: string | null = null
      try {
        stored = window.localStorage.getItem(this.options.storageKey)
      } catch {
        // Only an actual storage I/O failure disables persistence for this session.
        this.storageFailed = true
      }

      if (!this.storageFailed) {
        if (!stored) return Object.create(null)
        let parsed: Partial<StoredCache<T>>
        try {
          parsed = JSON.parse(stored) as Partial<StoredCache<T>>
        } catch {
          // Malformed data can be replaced by the next successful cache write.
          return Object.create(null)
        }
        if (
          parsed?.version !== CACHE_STORAGE_VERSION ||
          !parsed.entries ||
          typeof parsed.entries !== 'object' ||
          Array.isArray(parsed.entries)
        )
          return Object.create(null)

        const valid: Record<string, CacheEntry<T>> = Object.create(null)
        for (const [key, entry] of Object.entries(parsed.entries)) {
          if (this.isValid(entry)) valid[key] = entry
        }
        return valid
      }
    }

    return Object.fromEntries(
      Object.entries(this.inMemoryStorage).filter(([, entry]) => this.isValid(entry))
    )
  }

  private saveToStorage(cache: Record<string, CacheEntry<T>>): void {
    this.inMemoryStorage = { ...cache }
    if (this.hasStorage()) {
      try {
        const stored: StoredCache<T> = { version: CACHE_STORAGE_VERSION, entries: cache }
        window.localStorage.setItem(this.options.storageKey, JSON.stringify(stored))
      } catch {
        this.storageFailed = true
      }
    }
  }

  private loadFromStorage(): void {
    const storageCache = this.getStorageCache()
    // Load valid entries into memory cache with updated TTL
    for (const [key, entry] of Object.entries(storageCache)) {
      if (this.isValid(entry)) {
        this.promoteToMemory(key, entry)
      }
    }

    if (!this.hasStorage()) {
      this.inMemoryStorage = storageCache
    }
  }

  private hasStorage(): boolean {
    try {
      return (
        !this.storageFailed &&
        typeof window !== 'undefined' &&
        typeof window.localStorage !== 'undefined'
      )
    } catch {
      return false
    }
  }

  private enforceMaxEntries(cache: Record<string, CacheEntry<T>>): void {
    const entries = Object.entries(cache)
    if (entries.length <= this.options.maxEntries) return

    // Prefer recent memory reads without writing localStorage on every cache hit.
    const accessedAt = ([key, entry]: [string, CacheEntry<T>]) =>
      this.memoryCache.get(key)?.lastAccess ?? entry.lastAccess ?? entry.timestamp
    entries.sort((a, b) => accessedAt(a) - accessedAt(b))

    // Remove oldest entries to stay within limit
    const toRemove = entries.length - this.options.maxEntries
    for (let i = 0; i < toRemove; i++) {
      delete cache[entries[i][0]]
      this.memoryCache.delete(entries[i][0])
    }
  }
}
