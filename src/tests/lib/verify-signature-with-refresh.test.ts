import { describe, expect, test, beforeEach, mock } from 'bun:test'
import { verifySignatureWithRefresh } from '@/lib/jwt/verify-signature-with-refresh'
import { jwksCache } from '@/lib/cache/jwks-cache'
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

// Mock response type
interface MockResponse {
  ok: boolean
  status: number
  statusText: string
  json?: () => Promise<any>
}

// Create a mockable proxyFetch function
const mockProxyFetch = mock((): Promise<MockResponse> => {
  return Promise.resolve({
    ok: false,
    status: 404,
    statusText: 'Not Found',
  })
})

// Mock the proxyFetch module
mock.module('@/lib/proxy-fetch', () => ({
  proxyFetch: mockProxyFetch,
}))

// Mock jwtVerify to avoid actual crypto operations in tests
const mockJwtVerify = mock(async () => {
  throw new Error('Signature verification failed')
})

// Mock jose module
mock.module('jose', () => ({
  jwtVerify: mockJwtVerify,
  JSONWebKeySet: {}, // Type definition
}))

describe('verifySignatureWithRefresh', () => {
  const mockToken =
    'eyJhbGciOiJSUzI1NiIsImtpZCI6InRlc3Qta2V5LTEifQ.eyJpc3MiOiJodHRwczovL2V4YW1wbGUuY29tIiwic3ViIjoidGVzdC11c2VyIn0.signature'
  const mockJwksUri = 'https://example.com/jwks'

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
    ],
  }

  const mockJwksRotated: JSONWebKeySet = {
    keys: [
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
    // Clear the cache before each test
    jwksCache.clear()

    // Reset mocks
    mockProxyFetch.mockReset()
    mockJwtVerify.mockReset()

    // Default mock implementations
    mockProxyFetch.mockImplementation((): Promise<MockResponse> => {
      return Promise.resolve({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      })
    })

    mockJwtVerify.mockImplementation(async () => {
      throw new Error('Signature verification failed')
    })
  })

  test('should return error when no keys found in JWKS', async () => {
    const emptyJwks: JSONWebKeySet = { keys: [] }

    const result = await verifySignatureWithRefresh(mockToken, mockJwksUri, emptyJwks)

    expect(result.valid).toBe(false)
    expect(result.error).toBe('No keys found in the JWKS data')
  })

  test('should return error when token has no kid', async () => {
    const tokenWithoutKid = 'eyJhbGciOiJSUzI1NiJ9.eyJpc3MiOiJodHRwczovL2V4YW1wbGUuY29tIn0.signature'

    const result = await verifySignatureWithRefresh(tokenWithoutKid, mockJwksUri, mockJwks)

    expect(result.valid).toBe(false)
    expect(result.error).toBe('Token header does not contain a key ID (kid)')
  })

  test('should return error when key not found in JWKS', async () => {
    const tokenWithWrongKid =
      'eyJhbGciOiJSUzI1NiIsImtpZCI6Indyb25nLWtleSJ9.eyJpc3MiOiJodHRwczovL2V4YW1wbGUuY29tIn0.signature'

    const result = await verifySignatureWithRefresh(tokenWithWrongKid, mockJwksUri, mockJwks)

    expect(result.valid).toBe(false)
    expect(result.error).toContain('No key with ID "wrong-key" found in the JWKS')
  })

  test('should handle cache refresh on verification failure', async () => {
    const tokenNewKey =
      'eyJhbGciOiJSUzI1NiIsImtpZCI6InRlc3Qta2V5LTIifQ.eyJpc3MiOiJodHRwczovL2V4YW1wbGUuY29tIn0.signature'
    let refreshCalled = false

    // Mock the proxyFetch to return the rotated JWKS
    mockProxyFetch.mockImplementation((): Promise<MockResponse> => {
      return Promise.resolve({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () => Promise.resolve(mockJwksRotated),
      })
    })

    // Verify with old JWKS that doesn't have the new key
    const result = await verifySignatureWithRefresh(
      tokenNewKey,
      mockJwksUri,
      mockJwks,
      (newJwks: JSONWebKeySet) => {
        refreshCalled = true
        expect(newJwks).toEqual(mockJwksRotated)
      }
    )

    // The verification will still fail due to invalid test keys,
    // but the important part is that refresh was attempted
    expect(result.valid).toBe(false)
    expect(refreshCalled).toBe(true)
    // The error could be about key modulus or signature verification
    expect(result.error).toBeDefined()
  })

  test('should handle network error during refresh', async () => {
    const tokenNewKey =
      'eyJhbGciOiJSUzI1NiIsImtpZCI6InRlc3Qta2V5LTMifQ.eyJpc3MiOiJodHRwczovL2V4YW1wbGUuY29tIn0.signature'

    // Mock proxyFetch to fail
    mockProxyFetch.mockImplementation((): Promise<MockResponse> => {
      return Promise.resolve({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      })
    })

    const result = await verifySignatureWithRefresh(tokenNewKey, mockJwksUri, mockJwks)

    expect(result.valid).toBe(false)
    expect(result.error).toContain('JWKS refresh also failed')
  })

  test('should handle invalid JWKS format during refresh', async () => {
    const tokenNewKey =
      'eyJhbGciOiJSUzI1NiIsImtpZCI6InRlc3Qta2V5LTQifQ.eyJpc3MiOiJodHRwczovL2V4YW1wbGUuY29tIn0.signature'

    // Mock proxyFetch to return invalid JWKS
    mockProxyFetch.mockImplementation((): Promise<MockResponse> => {
      return Promise.resolve({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () => Promise.resolve({ invalid: 'jwks' }),
      })
    })

    const result = await verifySignatureWithRefresh(tokenNewKey, mockJwksUri, mockJwks)

    expect(result.valid).toBe(false)
    expect(result.error).toContain('JWKS refresh also failed')
  })
})
