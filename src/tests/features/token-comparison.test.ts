import { describe, expect, it } from 'bun:test'
import {
  compareTokens,
  createExampleComparisonTokens,
  decodeTokenForComparison,
} from '@/features/token-comparison/utils/token-comparison'

function encode(value: unknown): string {
  const bytes = new TextEncoder().encode(JSON.stringify(value))
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function token(payload: unknown, header: unknown = { alg: 'RS256' }) {
  return `${encode(header)}.${encode(payload)}.signature`
}

describe('token claims comparison', () => {
  it('rejects empty and malformed compact tokens', () => {
    expect(decodeTokenForComparison('').ok).toBe(false)
    expect(decodeTokenForComparison('not-a-jwt').ok).toBe(false)
  })

  it('rejects decoded headers and payloads that are not JSON objects', () => {
    for (const invalidValue of [null, true, 42, 'claims', []]) {
      const invalidHeader = decodeTokenForComparison(token({}, invalidValue))
      const invalidPayload = decodeTokenForComparison(token(invalidValue))

      expect(invalidHeader).toEqual({
        ok: false,
        error: 'The JWT header must be a JSON object.',
      })
      expect(invalidPayload).toEqual({
        ok: false,
        error: 'The JWT payload must be a JSON object.',
      })
    }

    expect(() => compareTokens(token(null), token({}))).toThrow(
      'Both values must be decodable compact JWTs before they can be compared.'
    )
  })

  it('compares nested, added, removed, and changed claims', () => {
    const result = compareTokens(
      token({ sub: 'user-1', profile: { department: 'Support', region: 'us' }, legacy: true }),
      token({ sub: 'user-1', profile: { department: 'Finance', region: 'us' }, active: true })
    )

    expect(result.differences).toContainEqual(
      expect.objectContaining({ section: 'payload', path: 'profile.department', kind: 'changed' })
    )
    expect(result.differences).toContainEqual(
      expect.objectContaining({ path: 'active', kind: 'added' })
    )
    expect(result.differences).toContainEqual(
      expect.objectContaining({ path: 'legacy', kind: 'removed' })
    )
    expect(result.differences).toContainEqual(
      expect.objectContaining({ path: 'profile.region', kind: 'unchanged' })
    )
  })

  it('treats set-like claims as order-insensitive and reports member drift', () => {
    const result = compareTokens(
      token({ aud: ['orders', 'billing'], scope: 'openid profile', roles: ['reader'] }),
      token({
        aud: ['billing', 'orders'],
        scope: 'profile openid email',
        roles: ['reader', 'admin'],
      })
    )

    expect(result.differences).toContainEqual(
      expect.objectContaining({ path: 'aud', kind: 'unchanged' })
    )
    expect(result.differences).toContainEqual(
      expect.objectContaining({ path: 'scope', addedValues: ['email'], removedValues: [] })
    )
    expect(result.differences).toContainEqual(
      expect.objectContaining({ path: 'roles', addedValues: ['admin'], removedValues: [] })
    )
  })

  it('summarizes identity and time deltas', () => {
    const result = compareTokens(
      token({ iss: 'https://id.example', sub: '123', aud: 'api', iat: 100, exp: 3700 }),
      token({ iss: 'https://id.example', sub: '123', aud: 'api', iat: 220, exp: 2020 })
    )

    expect(result.metadata.issuedAtDeltaSeconds).toBe(120)
    expect(result.metadata.expiresAtDeltaSeconds).toBe(-1680)
    expect(result.metadata.lifetimeDeltaSeconds).toBe(-1800)
    expect(result.metadata.left.audiences).toEqual(['api'])
  })

  it('creates a meaningful, decodable comparison example', () => {
    const example = createExampleComparisonTokens(1_700_000_000)
    const result = compareTokens(example.left, example.right)

    expect(result.counts.changed).toBeGreaterThan(3)
    expect(result.differences).toContainEqual(
      expect.objectContaining({ path: 'authentication_method', kind: 'added' })
    )
  })
})
