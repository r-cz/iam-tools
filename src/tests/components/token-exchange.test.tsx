import { afterEach, describe, expect, mock, test } from 'bun:test'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { TokenExchange } from '@/features/oauthPlayground/components/TokenExchange'

const originalFetch = globalThis.fetch
afterEach(() => {
  cleanup()
  globalThis.fetch = originalFetch
})

describe('TokenExchange endpoint failures', () => {
  test('keeps the exchange available and never reports completion for an HTTP failure', async () => {
    globalThis.fetch = mock(async () =>
      Response.json({ access_token: 'invalid', token_type: 'Bearer' }, { status: 500 })
    ) as typeof fetch
    const completed = mock(() => {})
    render(
      <MemoryRouter>
        <TokenExchange
          config={{
            clientId: 'client',
            redirectUri: 'http://localhost/callback',
            tokenEndpoint: 'http://localhost/token',
            scopes: [],
          }}
          pkce={{ codeVerifier: 'verifier', codeChallenge: 'challenge', state: 'state' }}
          authorizationCode="code"
          onTokenExchangeComplete={completed}
        />
      </MemoryRouter>
    )
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Exchange Code for Tokens' }))
    })
    expect(completed).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Exchange Code for Tokens' })).toBeDefined()
  })
})
