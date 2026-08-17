import { beforeEach, describe, expect, it } from 'bun:test'
import {
  OAUTH_AUTH_CODE_FLOW_PATH,
  OAUTH_PLAYGROUND_REDIRECT_STATE_KEY,
  OAUTH_REDIRECT_TRANSACTION_TTL_MS,
  consumeOAuthRedirectTransaction,
  createOAuthRedirectTransaction,
  decodeOAuthRedirectTransaction,
  storeOAuthRedirectTransaction,
} from '@/features/oauthPlayground/utils/redirect-transaction'

const config = {
  authEndpoint: 'https://idp.example/authorize',
  tokenEndpoint: 'https://idp.example/token',
  clientId: 'client',
  clientSecret: 'must-not-persist',
  redirectUri: 'http://localhost:3000/oauth-playground/callback',
  scopes: ['openid'],
}
const pkce = { codeVerifier: 'verifier', codeChallenge: 'challenge', state: 'expected-state' }

describe('OAuth redirect transaction', () => {
  beforeEach(() => sessionStorage.clear())

  it('stores a versioned secret-free transaction and consumes it once', () => {
    storeOAuthRedirectTransaction(createOAuthRedirectTransaction(config, pkce, 1_000))
    const serialized = sessionStorage.getItem(OAUTH_PLAYGROUND_REDIRECT_STATE_KEY)!
    expect(serialized).not.toContain('must-not-persist')

    const transaction = consumeOAuthRedirectTransaction({
      state: 'expected-state',
      origin: 'http://localhost:3000',
      now: 1_001,
    })
    expect(transaction?.flowPath).toBe(OAUTH_AUTH_CODE_FLOW_PATH)
    expect(
      consumeOAuthRedirectTransaction({ state: 'expected-state', origin: 'http://localhost:3000' })
    ).toBeNull()
  })

  it('rejects and consumes mismatched, expired, or malformed transactions', () => {
    storeOAuthRedirectTransaction(createOAuthRedirectTransaction(config, pkce, 1_000))
    expect(
      consumeOAuthRedirectTransaction({
        state: 'wrong',
        origin: 'http://localhost:3000',
        now: 1_001,
      })
    ).toBeNull()
    expect(sessionStorage.getItem(OAUTH_PLAYGROUND_REDIRECT_STATE_KEY)).toBeNull()

    storeOAuthRedirectTransaction(createOAuthRedirectTransaction(config, pkce, 1_000))
    expect(
      consumeOAuthRedirectTransaction({
        state: 'expected-state',
        origin: 'http://localhost:3000',
        now: 1_000 + OAUTH_REDIRECT_TRANSACTION_TTL_MS + 1,
      })
    ).toBeNull()
    expect(decodeOAuthRedirectTransaction({ version: 2 })).toBeNull()
  })
})
