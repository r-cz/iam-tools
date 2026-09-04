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
    expect(stored.version).toBe(1)
    expect(Object.keys(stored.entries)).toContain('https://example.com/b')
    expect(Object.keys(stored.entries)).toContain('https://example.com/c')
    expect(Object.keys(stored.entries)).not.toContain('https://example.com/a')
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

  test('keeps query identity while discarding fragments', () => {
    const cache = new ResourceCache<string>({
      storageKey: 'resource-cache-url-identity',
      memoryTTL: 5_000,
      storageTTL: 5_000,
    })
    cache.set('https://example.com/data?tenant=one#first', 'one')

    expect(cache.get('https://example.com/data?tenant=one#second')).toBe('one')
    expect(cache.get('https://example.com/data?tenant=two')).toBeNull()
  })

  test('discards unversioned persisted cache records', () => {
    window.localStorage.setItem(
      'resource-cache-legacy',
      JSON.stringify({
        'https://example.com/data': { data: 'legacy', timestamp: now, ttl: 5_000 },
      })
    )
    const cache = new ResourceCache<string>({
      storageKey: 'resource-cache-legacy',
      memoryTTL: 5_000,
      storageTTL: 5_000,
    })
    expect(cache.get('https://example.com/data')).toBeNull()
  })

  test('deduplicates loads and prevents an older forced-refresh overlap from winning', async () => {
    const cache = new ResourceCache<string>({
      storageKey: 'resource-cache-fill',
      memoryTTL: 5_000,
      storageTTL: 5_000,
    })
    let loadCount = 0
    let resolveFirst!: (value: string) => void
    let resolveRefresh!: (value: string) => void
    const firstLoader = () => {
      loadCount++
      return new Promise<string>((resolve) => {
        resolveFirst = resolve
      })
    }
    const first = cache.getOrLoad('https://example.com/data', firstLoader)
    const duplicate = cache.getOrLoad('https://example.com/data', firstLoader)
    const refresh = cache.getOrLoad(
      'https://example.com/data',
      () =>
        new Promise<string>((resolve) => {
          resolveRefresh = resolve
        }),
      { forceRefresh: true }
    )

    expect(loadCount).toBe(1)
    resolveFirst('old')
    expect(await first).toBe('old')
    expect(await duplicate).toBe('old')
    expect(cache.get('https://example.com/data')).toBeNull()
    resolveRefresh('new')
    expect(await refresh).toBe('new')
    expect(cache.get('https://example.com/data')).toBe('new')
    expect(cache.getPendingRequest('https://example.com/data')).toBeNull()
  })
})

describe('ResourceCache invalidation and limits', () => {
  beforeEach(() => {
    now = BASE_TIME
    Date.now = () => now
    window.localStorage.clear()
  })
  afterEach(() => {
    Date.now = originalDateNow
  })

  const createCache = (storageKey: string, maxEntries = 2) =>
    new ResourceCache<string>({
      storageKey,
      memoryTTL: 1_000,
      storageTTL: 2_000,
      maxEntries,
    })

  test('evicts from memory too and honors recent reads without extending TTL', () => {
    const cache = createCache('lru-memory')
    cache.set('a', 'A')
    advanceTime(10)
    cache.set('b', 'B')
    advanceTime(10)
    cache.get('a')
    advanceTime(10)
    cache.set('c', 'C')
    expect(cache.get('b')).toBeNull()
    expect(cache.get('a')).toBe('A')
    expect(cache.getStats().memoryEntries).toBe(2)
  })

  test('storage promotion and cache reconstruction cannot extend the original expiration', () => {
    const cache = createCache('absolute-expiry')
    cache.set('key', 'value')
    advanceTime(1_999)
    expect(cache.get('key')).toBe('value')
    const reloaded = createCache('absolute-expiry')
    expect(reloaded.get('key')).toBe('value')
    advanceTime(1)
    expect(cache.get('key')).toBeNull()
    expect(reloaded.get('key')).toBeNull()
  })

  for (const invalidate of ['clear', 'remove', 'set'] as const) {
    test(`${invalidate} prevents a pending request from restoring invalidated content`, async () => {
      const cache = createCache(`pending-${invalidate}`)
      let resolve!: (value: string) => void
      const pending = cache.getOrLoad(
        'key',
        () =>
          new Promise<string>((done) => {
            resolve = done
          })
      )
      if (invalidate === 'clear') cache.clear()
      if (invalidate === 'remove') cache.remove('key')
      if (invalidate === 'set') cache.set('key', 'manual')
      resolve('stale')
      expect(await pending).toBe('stale')
      expect(cache.get('key')).toBe(invalidate === 'set' ? 'manual' : null)
      expect(cache.getPendingRequest('key')).toBeNull()
    })
  }

  test('discards malformed persisted records without hiding valid neighbors', () => {
    window.localStorage.setItem(
      'malformed-cache',
      JSON.stringify({
        version: 1,
        entries: {
          broken: null,
          future: { data: 'wrong', timestamp: now + 10_000, ttl: 60_000 },
          good: { data: 'good', timestamp: now, ttl: 2_000 },
        },
      })
    )
    const cache = createCache('malformed-cache')
    expect(cache.get('broken')).toBeNull()
    expect(cache.get('future')).toBeNull()
    expect(cache.get('good')).toBe('good')
  })

  test('bounds the memory cache while hydrating oversized persisted data', () => {
    window.localStorage.setItem(
      'oversized-cache',
      JSON.stringify({
        version: 1,
        entries: Object.fromEntries(
          Array.from({ length: 10 }, (_, index) => [
            String(index),
            {
              data: String(index),
              timestamp: now,
              ttl: 2_000,
            },
          ])
        ),
      })
    )
    expect(createCache('oversized-cache').getStats().memoryEntries).toBe(2)
  })
})

describe('ResourceCache restricted browser storage', () => {
  test('continues using session storage after localStorage access or writes are denied', () => {
    const descriptor = Object.getOwnPropertyDescriptor(window, 'localStorage')
    try {
      Object.defineProperty(window, 'localStorage', {
        configurable: true,
        get: () => {
          throw new DOMException('Storage denied', 'SecurityError')
        },
      })
      const cache = new ResourceCache<string>({
        storageKey: 'restricted',
        memoryTTL: 1_000,
        storageTTL: 2_000,
      })
      cache.set('key', 'value')
      expect(cache.get('key')).toBe('value')
      cache.clear()
      expect(cache.get('key')).toBeNull()
    } finally {
      if (descriptor) Object.defineProperty(window, 'localStorage', descriptor)
      else Reflect.deleteProperty(window, 'localStorage')
    }
  })
})

test('ResourceCache repairs malformed JSON without disabling future persistence', () => {
  const storageKey = 'recover-malformed-json'
  const options = { storageKey, memoryTTL: 1_000, storageTTL: 2_000 }
  window.localStorage.setItem(storageKey, '{invalid JSON')
  const cache = new ResourceCache<string>(options)
  expect(cache.get('key')).toBeNull()
  cache.set('key', 'recovered')
  const stored = JSON.parse(window.localStorage.getItem(storageKey)!)
  expect(stored.version).toBe(1)
  expect(stored.entries.key.data).toBe('recovered')
  expect(new ResourceCache<string>(options).get('key')).toBe('recovered')
})
