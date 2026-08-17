import { describe, expect, test } from 'bun:test'
import { DEMO_JWKS, DEMO_PRIVATE_KEY, DEMO_PUBLIC_KEY } from '@/lib/jwt/demo-key'

describe('demo key projections', () => {
  test('derives signing and JWKS views from one public key', () => {
    expect(DEMO_PRIVATE_KEY.n).toBe(DEMO_PUBLIC_KEY.n)
    expect(DEMO_PRIVATE_KEY.e).toBe(DEMO_PUBLIC_KEY.e)
    expect(DEMO_PRIVATE_KEY.kid).toBe(DEMO_PUBLIC_KEY.kid)
    expect(DEMO_JWKS.keys).toEqual([DEMO_PUBLIC_KEY])
    expect(Object.keys(DEMO_PUBLIC_KEY).sort()).toEqual(
      ['alg', 'e', 'kid', 'kty', 'n', 'use'].sort()
    )
    expect('d' in DEMO_PUBLIC_KEY).toBe(false)
  })
})
