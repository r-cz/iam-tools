import { describe, expect, it } from 'bun:test'
import {
  base64UrlDecode,
  decodeJWT,
  decodeJwtPayload,
  decodeJwtHeader,
  isJwtExpired,
  getJwtExpiration,
} from '@/lib/jwt/decode-token'

describe('JWT Decode Utilities', () => {
  // Helper to create a test JWT
  function createTestJwt(
    header: Record<string, unknown>,
    payload: Record<string, unknown>
  ): string {
    const encodeBase64Url = (obj: Record<string, unknown>) => {
      const json = JSON.stringify(obj)
      const base64 = btoa(json)
      return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
    }

    const encodedHeader = encodeBase64Url(header)
    const encodedPayload = encodeBase64Url(payload)
    const signature = 'fake-signature-for-testing'

    return `${encodedHeader}.${encodedPayload}.${signature}`
  }

  describe('base64UrlDecode', () => {
    it('should decode a standard base64url string', () => {
      // "Hello" in base64url
      const encoded = 'SGVsbG8'
      const result = base64UrlDecode(encoded)

      expect(result).toBe('Hello')
    })

    it('should handle URL-safe characters (- instead of +)', () => {
      // Base64url uses - instead of +
      const encoded = 'YWJjZA' // "abcd" - no special chars but validates decoding
      const result = base64UrlDecode(encoded)

      expect(result).toBe('abcd')
    })

    it('should handle URL-safe characters (_ instead of /)', () => {
      // Base64url uses _ instead of /
      const encoded = 'PDw_Pz4-' // "<<??>>", contains chars that would be / in standard base64
      const result = base64UrlDecode(encoded)

      expect(result).toBe('<<??>>')
    })

    it('should add padding when needed', () => {
      // "a" encodes to "YQ" in base64url (needs == padding for standard base64)
      const encoded = 'YQ'
      const result = base64UrlDecode(encoded)

      expect(result).toBe('a')
    })

    it('should handle strings that need single padding', () => {
      // "ab" encodes to "YWI" (needs = padding)
      const encoded = 'YWI'
      const result = base64UrlDecode(encoded)

      expect(result).toBe('ab')
    })

    it('should handle empty string', () => {
      const result = base64UrlDecode('')

      expect(result).toBe('')
    })

    it('should decode JSON object strings', () => {
      // {"alg":"HS256"} in base64url
      const encoded = 'eyJhbGciOiJIUzI1NiJ9'
      const result = base64UrlDecode(encoded)

      expect(result).toBe('{"alg":"HS256"}')
    })
  })

  describe('decodeJWT', () => {
    it('should decode a valid JWT', () => {
      const header = { alg: 'RS256', typ: 'JWT' }
      const payload = { sub: 'user123', name: 'Test User' }
      const token = createTestJwt(header, payload)

      const result = decodeJWT(token)

      expect(result).not.toBeNull()
      expect(result?.header.alg).toBe('RS256')
      expect(result?.header.typ).toBe('JWT')
      expect(result?.payload.sub).toBe('user123')
      expect(result?.payload.name).toBe('Test User')
    })

    it('should include raw encoded parts', () => {
      const header = { alg: 'RS256' }
      const payload = { sub: 'user123' }
      const token = createTestJwt(header, payload)

      const result = decodeJWT(token)
      const parts = token.split('.')

      expect(result?.raw.header).toBe(parts[0])
      expect(result?.raw.payload).toBe(parts[1])
      expect(result?.raw.signature).toBe(parts[2])
    })

    it('should return null for empty string', () => {
      const result = decodeJWT('')

      expect(result).toBeNull()
    })

    it('should return null for null input', () => {
      const result = decodeJWT(null as unknown as string)

      expect(result).toBeNull()
    })

    it('should return null for non-string input', () => {
      const result = decodeJWT(123 as unknown as string)

      expect(result).toBeNull()
    })

    it('should return null for token with wrong number of parts', () => {
      // Two parts
      expect(decodeJWT('part1.part2')).toBeNull()

      // Four parts
      expect(decodeJWT('part1.part2.part3.part4')).toBeNull()

      // One part
      expect(decodeJWT('singlepart')).toBeNull()
    })

    it('should return null for invalid base64 in header', () => {
      const result = decodeJWT('!!!invalid!!!.eyJzdWIiOiJ0ZXN0In0.sig')

      expect(result).toBeNull()
    })

    it('should return null for invalid JSON in header', () => {
      // Valid base64 but not valid JSON
      const invalidJson = btoa('not json').replace(/=+$/, '')
      const result = decodeJWT(`${invalidJson}.eyJzdWIiOiJ0ZXN0In0.sig`)

      expect(result).toBeNull()
    })

    it('should return null for invalid base64 in payload', () => {
      const validHeader = btoa('{"alg":"RS256"}').replace(/=+$/, '')
      const result = decodeJWT(`${validHeader}.!!!invalid!!!.sig`)

      expect(result).toBeNull()
    })

    it('should handle complex payload claims', () => {
      const payload = {
        sub: 'user123',
        iss: 'https://issuer.example.com',
        aud: ['client1', 'client2'],
        exp: 1704067200,
        iat: 1704063600,
        roles: ['admin', 'user'],
        metadata: { department: 'engineering' },
      }
      const token = createTestJwt({ alg: 'RS256' }, payload)

      const result = decodeJWT(token)

      expect(result?.payload.sub).toBe('user123')
      expect(result?.payload.iss).toBe('https://issuer.example.com')
      expect(result?.payload.aud).toEqual(['client1', 'client2'])
      expect(result?.payload.exp).toBe(1704067200)
      expect(result?.payload.roles).toEqual(['admin', 'user'])
      expect((result?.payload.metadata as { department: string }).department).toBe('engineering')
    })
  })

  describe('decodeJwtPayload', () => {
    it('should return only the payload', () => {
      const payload = { sub: 'user123', name: 'Test' }
      const token = createTestJwt({ alg: 'RS256' }, payload)

      const result = decodeJwtPayload(token)

      expect(result).toEqual(payload)
    })

    it('should return null for invalid token', () => {
      const result = decodeJwtPayload('invalid-token')

      expect(result).toBeNull()
    })
  })

  describe('decodeJwtHeader', () => {
    it('should return only the header', () => {
      const header = { alg: 'RS256', typ: 'JWT', kid: 'key-123' }
      const token = createTestJwt(header, { sub: 'user' })

      const result = decodeJwtHeader(token)

      expect(result).toEqual(header)
    })

    it('should return null for invalid token', () => {
      const result = decodeJwtHeader('invalid-token')

      expect(result).toBeNull()
    })
  })

  describe('isJwtExpired', () => {
    it('should return true for expired token', () => {
      // Expired 1 hour ago
      const exp = Math.floor(Date.now() / 1000) - 3600
      const token = createTestJwt({ alg: 'RS256' }, { sub: 'user', exp })

      const result = isJwtExpired(token)

      expect(result).toBe(true)
    })

    it('should return false for valid token', () => {
      // Expires in 1 hour
      const exp = Math.floor(Date.now() / 1000) + 3600
      const token = createTestJwt({ alg: 'RS256' }, { sub: 'user', exp })

      const result = isJwtExpired(token)

      expect(result).toBe(false)
    })

    it('should return false when no exp claim', () => {
      const token = createTestJwt({ alg: 'RS256' }, { sub: 'user' })

      const result = isJwtExpired(token)

      expect(result).toBe(false)
    })

    it('should return false for invalid token', () => {
      const result = isJwtExpired('invalid-token')

      expect(result).toBe(false)
    })

    it('should return false when exp is not a number', () => {
      const token = createTestJwt({ alg: 'RS256' }, { sub: 'user', exp: 'not-a-number' })

      const result = isJwtExpired(token)

      expect(result).toBe(false)
    })

    it('should handle token expiring exactly now', () => {
      // Token with exp exactly at current time - the implementation uses < (not <=)
      // so exactly now is NOT expired
      const exp = Math.floor(Date.now() / 1000)
      const token = createTestJwt({ alg: 'RS256' }, { sub: 'user', exp })

      const result = isJwtExpired(token)

      // Implementation uses exp < now, so equal time is NOT expired
      expect(result).toBe(false)
    })
  })

  describe('getJwtExpiration', () => {
    it('should return expiration date', () => {
      const exp = 1704067200 // 2024-01-01 00:00:00 UTC
      const token = createTestJwt({ alg: 'RS256' }, { sub: 'user', exp })

      const result = getJwtExpiration(token)

      expect(result).toBeInstanceOf(Date)
      expect(result?.getTime()).toBe(exp * 1000)
    })

    it('should return null when no exp claim', () => {
      const token = createTestJwt({ alg: 'RS256' }, { sub: 'user' })

      const result = getJwtExpiration(token)

      expect(result).toBeNull()
    })

    it('should return null for invalid token', () => {
      const result = getJwtExpiration('invalid-token')

      expect(result).toBeNull()
    })

    it('should return null when exp is not a number', () => {
      const token = createTestJwt({ alg: 'RS256' }, { sub: 'user', exp: 'invalid' })

      const result = getJwtExpiration(token)

      expect(result).toBeNull()
    })

    it('should handle far future expiration', () => {
      const exp = 4102444800 // 2100-01-01 00:00:00 UTC
      const token = createTestJwt({ alg: 'RS256' }, { sub: 'user', exp })

      const result = getJwtExpiration(token)

      expect(result).toBeInstanceOf(Date)
      expect(result?.getFullYear()).toBe(2100)
    })
  })

  describe('integration: real-world JWT scenarios', () => {
    it('should decode a typical ID token', () => {
      const idToken = createTestJwt(
        { alg: 'RS256', typ: 'JWT', kid: 'key-abc123' },
        {
          iss: 'https://accounts.google.com',
          sub: '110169484474386276334',
          aud: 'my-client-id.apps.googleusercontent.com',
          exp: Math.floor(Date.now() / 1000) + 3600,
          iat: Math.floor(Date.now() / 1000),
          email: 'user@example.com',
          email_verified: true,
          name: 'Test User',
          picture: 'https://example.com/photo.jpg',
        }
      )

      const decoded = decodeJWT(idToken)

      expect(decoded?.header.alg).toBe('RS256')
      expect(decoded?.payload.iss).toBe('https://accounts.google.com')
      expect(decoded?.payload.email).toBe('user@example.com')
      expect(isJwtExpired(idToken)).toBe(false)
    })

    it('should decode a typical access token', () => {
      const accessToken = createTestJwt(
        { alg: 'RS256', typ: 'at+jwt' },
        {
          iss: 'https://auth.example.com',
          sub: 'user123',
          client_id: 'my-client',
          aud: 'https://api.example.com',
          exp: Math.floor(Date.now() / 1000) + 3600,
          iat: Math.floor(Date.now() / 1000),
          scope: 'openid profile email',
        }
      )

      const decoded = decodeJWT(accessToken)
      const expiration = getJwtExpiration(accessToken)

      expect(decoded?.header.typ).toBe('at+jwt')
      expect(decoded?.payload.scope).toBe('openid profile email')
      expect(expiration).not.toBeNull()
    })
  })
})
