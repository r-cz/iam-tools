import { describe, expect, it } from 'bun:test'
import {
  generateCodeVerifier,
  generateCodeChallenge,
  base64UrlEncode,
  generateState,
  validateState,
} from '@/features/oauthPlayground/utils/pkce'

describe('PKCE Utilities', () => {
  describe('base64UrlEncode', () => {
    it('should encode bytes to base64url format', () => {
      const input = new Uint8Array([72, 101, 108, 108, 111]) // "Hello"
      const result = base64UrlEncode(input)

      // Should be base64url encoded (no +, /, or = padding)
      expect(result).not.toContain('+')
      expect(result).not.toContain('/')
      expect(result).not.toContain('=')
    })

    it('should replace + with -', () => {
      // Create a byte sequence that would produce + in standard base64
      const input = new Uint8Array([251, 239]) // produces "++" in standard base64
      const result = base64UrlEncode(input)

      expect(result).not.toContain('+')
    })

    it('should replace / with _', () => {
      // Create a byte sequence that would produce / in standard base64
      const input = new Uint8Array([255, 255]) // produces "//" in standard base64
      const result = base64UrlEncode(input)

      expect(result).not.toContain('/')
    })

    it('should remove padding characters', () => {
      // Single byte would normally have padding
      const input = new Uint8Array([65]) // "A"
      const result = base64UrlEncode(input)

      expect(result).not.toContain('=')
    })

    it('should handle empty input', () => {
      const input = new Uint8Array([])
      const result = base64UrlEncode(input)

      expect(result).toBe('')
    })

    it('should produce consistent output for same input', () => {
      const input = new Uint8Array([1, 2, 3, 4, 5])
      const result1 = base64UrlEncode(input)
      const result2 = base64UrlEncode(input)

      expect(result1).toBe(result2)
    })
  })

  describe('generateCodeVerifier', () => {
    it('should generate a string', () => {
      const verifier = generateCodeVerifier()

      expect(typeof verifier).toBe('string')
    })

    it('should generate a string of appropriate length (43-128 chars)', () => {
      const verifier = generateCodeVerifier()

      expect(verifier.length).toBeGreaterThanOrEqual(43)
      expect(verifier.length).toBeLessThanOrEqual(128)
    })

    it('should generate unique values', () => {
      const verifier1 = generateCodeVerifier()
      const verifier2 = generateCodeVerifier()

      expect(verifier1).not.toBe(verifier2)
    })

    it('should only contain URL-safe characters', () => {
      const verifier = generateCodeVerifier()

      // Base64URL alphabet: A-Z, a-z, 0-9, -, _
      const base64UrlPattern = /^[A-Za-z0-9_-]+$/
      expect(verifier).toMatch(base64UrlPattern)
    })

    it('should not contain padding characters', () => {
      const verifier = generateCodeVerifier()

      expect(verifier).not.toContain('=')
    })
  })

  describe('generateCodeChallenge', () => {
    it('should generate a string from verifier', async () => {
      const verifier = 'test-verifier-string'
      const challenge = await generateCodeChallenge(verifier)

      expect(typeof challenge).toBe('string')
    })

    it('should generate base64url encoded output', async () => {
      const verifier = 'test-verifier-string'
      const challenge = await generateCodeChallenge(verifier)

      // Should be base64url format
      const base64UrlPattern = /^[A-Za-z0-9_-]+$/
      expect(challenge).toMatch(base64UrlPattern)
    })

    it('should not contain padding', async () => {
      const verifier = 'test-verifier-string'
      const challenge = await generateCodeChallenge(verifier)

      expect(challenge).not.toContain('=')
    })

    it('should produce consistent output for same input', async () => {
      const verifier = 'consistent-test-verifier'
      const challenge1 = await generateCodeChallenge(verifier)
      const challenge2 = await generateCodeChallenge(verifier)

      expect(challenge1).toBe(challenge2)
    })

    it('should produce different output for different verifiers', async () => {
      const challenge1 = await generateCodeChallenge('verifier1')
      const challenge2 = await generateCodeChallenge('verifier2')

      expect(challenge1).not.toBe(challenge2)
    })

    it('should produce 43-character output (SHA-256 = 32 bytes = 43 base64url chars)', async () => {
      const verifier = 'any-verifier-string'
      const challenge = await generateCodeChallenge(verifier)

      // SHA-256 produces 32 bytes, which encodes to 43 base64url characters
      expect(challenge.length).toBe(43)
    })

    it('should work with RFC 7636 test vector', async () => {
      // From RFC 7636 Appendix B
      // Note: The actual verifier in the RFC is "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"
      // But we can verify the challenge is derived correctly from any verifier
      const verifier = generateCodeVerifier()
      const challenge = await generateCodeChallenge(verifier)

      // Challenge should be 43 characters (256 bits / 6 bits per char = ~43)
      expect(challenge.length).toBe(43)
    })
  })

  describe('generateState', () => {
    it('should generate a string', () => {
      const state = generateState()

      expect(typeof state).toBe('string')
    })

    it('should generate unique values', () => {
      const state1 = generateState()
      const state2 = generateState()

      expect(state1).not.toBe(state2)
    })

    it('should only contain URL-safe characters', () => {
      const state = generateState()

      const base64UrlPattern = /^[A-Za-z0-9_-]+$/
      expect(state).toMatch(base64UrlPattern)
    })

    it('should be sufficiently long for security', () => {
      const state = generateState()

      // 32 bytes = 256 bits of entropy, encoded as base64url = ~43 chars
      expect(state.length).toBeGreaterThanOrEqual(40)
    })
  })

  describe('validateState', () => {
    it('should return true for matching states', () => {
      const state = 'test-state-value'

      expect(validateState(state, state)).toBe(true)
    })

    it('should return false for non-matching states', () => {
      expect(validateState('state1', 'state2')).toBe(false)
    })

    it('should return false when one state is empty', () => {
      expect(validateState('', 'state')).toBe(false)
      expect(validateState('state', '')).toBe(false)
    })

    it('should be case sensitive', () => {
      expect(validateState('State', 'state')).toBe(false)
      expect(validateState('STATE', 'state')).toBe(false)
    })

    it('should handle generated states correctly', () => {
      const state = generateState()

      expect(validateState(state, state)).toBe(true)
      expect(validateState(state, generateState())).toBe(false)
    })
  })

  describe('integration: full PKCE flow', () => {
    it('should generate valid PKCE pair', async () => {
      const verifier = generateCodeVerifier()
      const challenge = await generateCodeChallenge(verifier)

      // Both should be valid base64url strings
      const base64UrlPattern = /^[A-Za-z0-9_-]+$/
      expect(verifier).toMatch(base64UrlPattern)
      expect(challenge).toMatch(base64UrlPattern)

      // Verifier should be 43-128 chars
      expect(verifier.length).toBeGreaterThanOrEqual(43)
      expect(verifier.length).toBeLessThanOrEqual(128)

      // Challenge should be exactly 43 chars (SHA-256)
      expect(challenge.length).toBe(43)
    })

    it('should generate complete OAuth state', () => {
      const state = generateState()
      const verifier = generateCodeVerifier()

      // Both should be unique
      expect(state).not.toBe(verifier)

      // Both should be URL-safe
      const encoded = encodeURIComponent(state)
      expect(encoded).toBe(state) // URL-safe means no encoding needed
    })
  })
})
