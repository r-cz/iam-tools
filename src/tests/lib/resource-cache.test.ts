import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { ResourceCache } from '@/lib/cache/resource-cache'

const BASE_TIME = 1_700_000_000_000
const originalDateNow = Date.now

let now = BASE_TIME

const advanceTime = (ms: number) => {
  now += ms
}

describe('ResourceCache', () => {
  beforeEach(() => {
    now = BASE_TIME
    Date.now = () => now
    globalThis.window?.localStorage?.clear()
  })

  afterEach(() => {
    Date.now = originalDateNow
  })

  test('stores and retrieves values from memory cache when valid', () => {
    const cache = new ResourceCache<{ value: number }>({
      storageKey: 'resource-cache-memory',
      memoryTTL: 5_000,
      storageTTL: 10_000,
    })

    const data = { value: 42 }
    cache.set('https://example.com/resource', data)

    const cached = cache.get('https://example.com/resource')
    expect(cached).toEqual(data)
  })

  test('promotes storage entries back into memory when memory TTL expires', () => {
    const cache = new ResourceCache<{ value: string }>({
      storageKey: 'resource-cache-storage-promotion',
      memoryTTL: 1_000,
      storageTTL: 30_000,
    })

    cache.set('https://example.com/settings', { value: 'from-storage' })

    advanceTime(1_100) // expire memory entry
    const result = cache.get('https://example.com/settings')

    expect(result).toEqual({ value: 'from-storage' })

    const stats = cache.getStats()
    expect(stats.memoryEntries).toBe(1)
    expect(stats.storageEntries).toBe(1)
  })

  test('falls back to in-memory storage when localStorage is unavailable', () => {
    const originalHasStorage = (ResourceCache.prototype as any).hasStorage
    try {
      ;(ResourceCache.prototype as any).hasStorage = () => false

      const cache = new ResourceCache<string>({
        storageKey: 'resource-cache-memory-only',
        memoryTTL: 5_000,
        storageTTL: 5_000,
      })

      cache.set('https://example.com/data', 'value')
      expect(cache.get('https://example.com/data')).toBe('value')

      cache.remove('https://example.com/data')
      expect(cache.get('https://example.com/data')).toBeNull()
    } finally {
      ;(ResourceCache.prototype as any).hasStorage = originalHasStorage
    }
  })

  test('enforces max entries limit with least recently used eviction', () => {
    const cacheKey = 'resource-cache-lru'
    const cache = new ResourceCache<string>({
      storageKey: cacheKey,
      memoryTTL: 60_000,
      storageTTL: 60_000,
      maxEntries: 2,
    })

    cache.set('https://example.com/a', 'A')
    advanceTime(10)
    cache.set('https://example.com/b', 'B')
    advanceTime(10)
    cache.set('https://example.com/c', 'C')

    const stored = JSON.parse(window.localStorage.getItem(cacheKey) || '{}')
    expect(Object.keys(stored)).toContain('https://example.com/b')
    expect(Object.keys(stored)).toContain('https://example.com/c')
    expect(Object.keys(stored)).not.toContain('https://example.com/a')
  })

  test('manages pending request lifecycle', async () => {
    const cache = new ResourceCache<string>({
      storageKey: 'resource-cache-pending',
      memoryTTL: 5_000,
      storageTTL: 5_000,
    })

    const promise = Promise.resolve('done')
    cache.setPendingRequest('https://example.com/pending', promise)

    expect(cache.getPendingRequest('https://example.com/pending')).toBe(promise)

    cache.removePendingRequest('https://example.com/pending')
    expect(cache.getPendingRequest('https://example.com/pending')).toBeNull()
  })
})
