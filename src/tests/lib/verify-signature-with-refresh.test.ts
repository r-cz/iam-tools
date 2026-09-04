import { beforeEach, describe, expect, test, mock } from 'bun:test'
import { exportJWK, generateKeyPair, SignJWT, type JSONWebKeySet } from 'jose'
import { verifySignatureWithRefresh } from '@/lib/jwt/verify-signature-with-refresh'
import { jwksCache } from '@/lib/cache/jwks-cache'

const uri = 'https://identity.example/jwks'

async function signedToken(alg = 'ES256', kid: string | undefined = 'current') {
  const { privateKey, publicKey } = await generateKeyPair(alg)
  const jwk = { ...(await exportJWK(publicKey)), alg, kid, use: 'sig' }
  const token = await new SignJWT({ sub: 'user', exp: 0, nbf: 4_000_000_000 })
    .setProtectedHeader({ alg, ...(kid ? { kid } : {}) })
    .sign(privateKey)
  return { token, jwks: { keys: [jwk] } satisfies JSONWebKeySet }
}

describe('verifySignatureWithRefresh', () => {
  beforeEach(() => jwksCache.clear())

  for (const alg of ['RS256', 'PS256', 'ES256', 'ES384', 'ES512', 'EdDSA']) {
    test(`verifies real ${alg} signatures independently of expired/not-before claims`, async () => {
      const { token, jwks } = await signedToken(alg)
      const fetcher = mock(async () => Response.error())
      expect(await verifySignatureWithRefresh(token, uri, jwks, undefined, fetcher)).toEqual({
        valid: true,
      })
      expect(fetcher).not.toHaveBeenCalled()
    })
  }

  test('selects a unique suitable key without requiring the optional kid header', async () => {
    const { token, jwks } = await signedToken('ES256', '')
    expect(await verifySignatureWithRefresh(token, '', jwks)).toEqual({ valid: true })
  })

  test('rejects a tampered payload with a matching key ID', async () => {
    const { token, jwks } = await signedToken()
    const parts = token.split('.')
    parts[1] = Buffer.from(JSON.stringify({ sub: 'attacker' })).toString('base64url')
    expect((await verifySignatureWithRefresh(parts.join('.'), '', jwks)).valid).toBe(false)
  })

  test('honors key use and algorithm instead of choosing the first matching kid', async () => {
    const { token, jwks } = await signedToken()
    const encryptionKey = { ...jwks.keys[0], use: 'enc' }
    expect(
      await verifySignatureWithRefresh(token, '', { keys: [encryptionKey, ...jwks.keys] })
    ).toEqual({ valid: true })
    expect((await verifySignatureWithRefresh(token, '', { keys: [encryptionKey] })).valid).toBe(
      false
    )
  })

  test('refreshes an empty or rotated keyset and caches the verified replacement', async () => {
    const { token, jwks } = await signedToken()
    const fetcher = mock(async () => Response.json(jwks))
    const refreshed = mock(() => {})
    expect(await verifySignatureWithRefresh(token, uri, { keys: [] }, refreshed, fetcher)).toEqual({
      valid: true,
    })
    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(refreshed).toHaveBeenCalledWith(jwks)
    expect(jwksCache.get(uri)).toEqual(jwks)
  })

  test('does not refresh malformed tokens or unsupported algorithms', async () => {
    const { jwks } = await signedToken()
    const fetcher = mock(async () => Response.error())
    expect(
      (await verifySignatureWithRefresh('not-a-jwt', uri, jwks, undefined, fetcher)).valid
    ).toBe(false)
    const unsigned = `${Buffer.from('{"alg":"none"}').toString('base64url')}.e30.`
    expect((await verifySignatureWithRefresh(unsigned, uri, jwks, undefined, fetcher)).valid).toBe(
      false
    )
    expect(fetcher).not.toHaveBeenCalled()
  })

  test('preserves the verification failure and explains network refresh failures', async () => {
    const { token } = await signedToken()
    const result = await verifySignatureWithRefresh(
      token,
      uri,
      { keys: [] },
      undefined,
      async () => new Response(null, { status: 503 })
    )
    expect(result.valid).toBe(false)
    expect(result.error).toContain('JWKS refresh also failed: Failed to fetch JWKS: 503')
  })

  test('rejects malformed refreshed key entries before caching them', async () => {
    const { token } = await signedToken()
    const result = await verifySignatureWithRefresh(token, uri, { keys: [] }, undefined, async () =>
      Response.json({ keys: [null] })
    )
    expect(result.valid).toBe(false)
    expect(result.error).toContain('JWKS refresh also failed')
    expect(jwksCache.get(uri)).toBeNull()
  })
})
