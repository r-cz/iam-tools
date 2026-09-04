import { afterEach, describe, expect, test } from 'bun:test'
import { act, cleanup, renderHook } from '@testing-library/react'
import { useTokenDecoder } from '@/features/tokenInspector/hooks/useTokenDecoder'
import { signToken } from '@/lib/jwt/sign-token'
import { DEMO_PUBLIC_KEY } from '@/lib/jwt/demo-key'

afterEach(cleanup)

describe('token inspector signature verification', () => {
  test('cryptographically verifies demo tokens and rejects a forged demo marker', async () => {
    const { result } = renderHook(() => useTokenDecoder())
    const token = await signToken({ sub: 'user', is_demo_token: true })
    const jwks = { keys: [{ ...DEMO_PUBLIC_KEY }] }
    await act(() => result.current.decodeToken(token, jwks))
    expect(result.current.decodedToken?.signature.valid).toBe(true)

    const parts = token.split('.')
    parts[1] = Buffer.from(JSON.stringify({ sub: 'attacker', is_demo_token: true })).toString(
      'base64url'
    )
    await act(() => result.current.decodeToken(parts.join('.'), jwks))
    expect(result.current.isDemoToken).toBe(true)
    expect(result.current.decodedToken?.signature.valid).toBe(false)
  })
})
