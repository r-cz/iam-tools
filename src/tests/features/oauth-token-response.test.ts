import { describe, expect, test } from 'bun:test'
import {
  OAuthTokenResponseError,
  readTokenResponse,
} from '@/features/oauthPlayground/utils/token-response'

describe('OAuth token endpoint responses', () => {
  const token = { access_token: 'access', token_type: 'Bearer' }

  test('rejects unsuccessful HTTP responses even when the body resembles a token response', async () => {
    await expect(readTokenResponse(Response.json(token, { status: 500 }))).rejects.toThrow(
      'HTTP 500'
    )
  })

  test('retains structured OAuth error codes and descriptions', async () => {
    const pending = readTokenResponse(
      Response.json({ error: 'invalid_grant', error_description: 'Code expired' }, { status: 400 })
    )
    await expect(pending).rejects.toBeInstanceOf(OAuthTokenResponseError)
    try {
      await pending
    } catch (error) {
      expect((error as OAuthTokenResponseError).code).toBe('invalid_grant')
      expect((error as Error).message).toBe('Code expired')
    }
  })

  test('explains non-JSON upstream errors using their HTTP status', async () => {
    await expect(
      readTokenResponse(new Response('<html>Unavailable</html>', { status: 502 }))
    ).rejects.toThrow('HTTP 502')
  })

  for (const value of [
    null,
    [],
    {},
    { ...token, access_token: 123 },
    { ...token, token_type: '' },
    { ...token, expires_in: -1 },
    { ...token, refresh_token: {} },
  ]) {
    test(`rejects malformed successful response: ${JSON.stringify(value)}`, async () => {
      await expect(readTokenResponse(Response.json(value))).rejects.toBeInstanceOf(
        OAuthTokenResponseError
      )
    })
  }

  test('accepts a valid token response with extensions and a zero second lifetime', async () => {
    const response = { ...token, expires_in: 0, scope: '', provider_extension: true }
    expect(await readTokenResponse(Response.json(response))).toEqual(response)
  })
})
