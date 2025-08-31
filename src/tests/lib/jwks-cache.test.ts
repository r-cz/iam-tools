import { describe, expect, test, beforeEach } from 'bun:test'
import { JwksCache } from '@/lib/cache/jwks-cache'
import { JSONWebKeySet } from 'jose'

// Mock localStorage for testing
global.localStorage = {
  store: {} as Record<string, string>,
  getItem(key: string) {
    return this.store[key] || null
  },
  setItem(key: string, value: string) {
    this.store[key] = value
  },
  removeItem(key: string) {
    delete this.store[key]
  },
  clear() {
    this.store = {}
  },
} as any

describe('JwksCache', () => {
  let cache: JwksCache

  const mockJwks: JSONWebKeySet = {
    keys: [
      {
        kty: 'RSA',
        kid: 'test-key-1',
        use: 'sig',
        alg: 'RS256',
        n: 'mock-n-value',
        e: 'AQAB',
      },
      {
        kty: 'RSA',
        kid: 'test-key-2',
        use: 'sig',
        alg: 'RS256',
        n: 'mock-n-value-2',
        e: 'AQAB',
      },
    ],
  }

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear()
    // Create a fresh cache instance with short TTLs for testing
    cache = new JwksCache({
      memoryTTL: 1000, // 1 second for testing
      storageTTL: 2000, // 2 seconds for testing
    })
  })

  test('should store and retrieve JWKS from cache', () => {
    cache.set('https://example.com/jwks', mockJwks)
    const retrieved = cache.get('https://example.com/jwks')
    expect(retrieved).toEqual(mockJwks)
  })

  test('should normalize URLs when storing and retrieving', () => {
    // Store with trailing slash
    cache.set('https://example.com/jwks/', mockJwks)
    // Retrieve without trailing slash
    const retrieved = cache.get('https://example.com/jwks')
    expect(retrieved).toEqual(mockJwks)
  })

  test('should return null for non-existent entries', () => {
    const retrieved = cache.get('https://nonexistent.com/jwks')
    expect(retrieved).toBeNull()
  })

  test('should remove specific entries from cache', () => {
    cache.set('https://example.com/jwks', mockJwks)
    expect(cache.get('https://example.com/jwks')).toEqual(mockJwks)

    cache.remove('https://example.com/jwks')
    expect(cache.get('https://example.com/jwks')).toBeNull()
  })

  test('should clear cache properly', () => {
    cache.set('https://example.com/jwks', mockJwks)
    cache.clear()
    const retrieved = cache.get('https://example.com/jwks')
    expect(retrieved).toBeNull()
  })

  test('should return correct stats', () => {
    cache.set('https://example.com/jwks', mockJwks)
    cache.set('https://another.com/jwks', mockJwks)

    const stats = cache.getStats()
    expect(stats.memoryEntries).toBe(2)
    expect(stats.storageEntries).toBe(2)
    expect(stats.oldestEntry).toBeTruthy()
    expect(stats.newestEntry).toBeTruthy()
  })

  test('should handle TTL expiration', async () => {
    cache.set('https://example.com/jwks', mockJwks)

    // Should be available immediately
    expect(cache.get('https://example.com/jwks')).toEqual(mockJwks)

    // Wait for memory TTL to expire
    await new Promise((resolve) => setTimeout(resolve, 1100))

    // Should still be available from storage
    expect(cache.get('https://example.com/jwks')).toEqual(mockJwks)

    // Wait for storage TTL to expire
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // Should no longer be available
    expect(cache.get('https://example.com/jwks')).toBeNull()
  })

  test('should validate JWKS structure', () => {
    const invalidJwks = { keys: [] } // Empty keys array is still valid
    cache.set('https://example.com/jwks', invalidJwks)
    const retrieved = cache.get('https://example.com/jwks')
    expect(retrieved).toEqual(invalidJwks)
  })

  test('should handle concurrent access correctly', () => {
    const url = 'https://example.com/jwks'

    // Set initial value
    cache.set(url, mockJwks)

    // Simulate concurrent reads
    const result1 = cache.get(url)
    const result2 = cache.get(url)
    const result3 = cache.get(url)

    expect(result1).toEqual(mockJwks)
    expect(result2).toEqual(mockJwks)
    expect(result3).toEqual(mockJwks)
  })

  test('should handle key rotation by allowing cache refresh', () => {
    const url = 'https://example.com/jwks'
    const oldJwks = { keys: [{ kid: 'old-key', kty: 'RSA' }] }
    const newJwks = { keys: [{ kid: 'new-key', kty: 'RSA' }] }

    // Set initial JWKS
    cache.set(url, oldJwks as JSONWebKeySet)
    expect(cache.get(url)).toEqual(oldJwks)

    // Remove from cache (simulating refresh on validation failure)
    cache.remove(url)

    // Set new JWKS (simulating fresh fetch)
    cache.set(url, newJwks as JSONWebKeySet)
    expect(cache.get(url)).toEqual(newJwks)
  })
})
