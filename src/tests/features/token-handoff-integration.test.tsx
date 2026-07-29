import React, { StrictMode } from 'react'
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { TokenExchange } from '@/features/oauthPlayground/components/TokenExchange'
import TokenComparisonPage from '@/features/token-comparison/pages'
import TokenInspectorPage from '@/features/tokenInspector/pages'
import { AppStateProvider } from '@/lib/state'
import {
  clearHandoffs,
  createHandoff,
  TOKEN_COMPARISON_DESTINATION,
  TOKEN_INSPECTOR_DESTINATION,
} from '@/lib/handoff'

const ACCESS_TOKEN = 'eyJhbGciOiJub25lIn0.eyJzdWIiOiJ1c2VyLTEiLCJ0b2tlbl91c2UiOiJhY2Nlc3MifQ.'
const ID_TOKEN = 'eyJhbGciOiJub25lIn0.eyJzdWIiOiJ1c2VyLTEiLCJ0b2tlbl91c2UiOiJpZCJ9.'

function LocationProbe() {
  const location = useLocation()
  return (
    <>
      <output data-testid="location-path">{location.pathname}</output>
      <output data-testid="location-search">{location.search}</output>
      <output data-testid="location-state">{JSON.stringify(location.state)}</output>
    </>
  )
}

function TokenInspectorRouteHarness() {
  const navigate = useNavigate()
  return (
    <>
      <button onClick={() => void navigate(TOKEN_INSPECTOR_DESTINATION)}>
        Open empty inspector
      </button>
      <TokenInspectorPage />
      <LocationProbe />
    </>
  )
}

function TokenComparisonRouteHarness() {
  const navigate = useNavigate()
  return (
    <>
      <button onClick={() => void navigate(TOKEN_COMPARISON_DESTINATION)}>
        Open empty comparison
      </button>
      <TokenComparisonPage />
      <LocationProbe />
    </>
  )
}

function renderTokenExchange(destination: React.ReactNode) {
  return render(
    <MemoryRouter initialEntries={['/exchange']}>
      <Routes>
        <Route
          path="/exchange"
          element={
            <TokenExchange
              config={{
                tokenEndpoint: 'http://localhost/token',
                clientId: 'client',
                redirectUri: 'http://localhost/callback',
                scopes: ['openid'],
              }}
              pkce={{
                codeVerifier: 'verifier',
                codeChallenge: 'challenge',
                state: 'state',
              }}
              authorizationCode="authorization-code"
            />
          }
        />
        <Route path={TOKEN_INSPECTOR_DESTINATION} element={destination} />
        <Route path={TOKEN_COMPARISON_DESTINATION} element={destination} />
      </Routes>
    </MemoryRouter>
  )
}

describe('secure token handoff navigation', () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    cleanup()
    clearHandoffs()
    window.sessionStorage.clear()
    window.localStorage.clear()
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          access_token: ACCESS_TOKEN,
          id_token: ID_TOKEN,
          token_type: 'Bearer',
          expires_in: 3600,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )) as typeof fetch
  })

  afterEach(() => {
    cleanup()
    clearHandoffs()
    window.sessionStorage.clear()
    window.localStorage.clear()
    globalThis.fetch = originalFetch
  })

  test('keeps an inspected token out of the URL, router state, and local storage', async () => {
    const view = renderTokenExchange(<LocationProbe />)
    fireEvent.click(view.getByRole('button', { name: 'Exchange Code for Tokens' }))

    const inspectButton = await view.findByRole('button', { name: 'Inspect Access Token' })
    fireEvent.click(inspectButton)

    await waitFor(() => {
      expect(view.getByTestId('location-path').textContent).toBe(TOKEN_INSPECTOR_DESTINATION)
    })
    expect(view.getByTestId('location-search').textContent).toBe('')
    expect(view.getByTestId('location-state').textContent).not.toContain(ACCESS_TOKEN)
    expect(window.localStorage.length).toBe(0)
    expect(window.location.href).not.toContain(ACCESS_TOKEN)
  })

  test('prefills Token Claims Diff from the access and ID token response', async () => {
    const view = render(
      <MemoryRouter initialEntries={['/exchange']}>
        <Routes>
          <Route
            path="/exchange"
            element={
              <TokenExchange
                config={{
                  tokenEndpoint: 'http://localhost/token',
                  clientId: 'client',
                  redirectUri: 'http://localhost/callback',
                  scopes: ['openid'],
                }}
                pkce={{
                  codeVerifier: 'verifier',
                  codeChallenge: 'challenge',
                  state: 'state',
                }}
                authorizationCode="authorization-code"
              />
            }
          />
          <Route path={TOKEN_COMPARISON_DESTINATION} element={<TokenComparisonPage />} />
        </Routes>
      </MemoryRouter>
    )

    fireEvent.click(view.getByRole('button', { name: 'Exchange Code for Tokens' }))
    const compareButton = await view.findByRole('button', {
      name: 'Compare Access & ID Tokens',
    })
    fireEvent.click(compareButton)

    await waitFor(() => {
      expect((view.getByTestId('token-comparison-left') as HTMLTextAreaElement).value).toBe(
        ACCESS_TOKEN
      )
      expect((view.getByTestId('token-comparison-right') as HTMLTextAreaElement).value).toBe(
        ID_TOKEN
      )
    })
    expect(window.sessionStorage.length).toBe(0)
    expect(window.localStorage.length).toBe(0)
  })

  test('consumes an inspector handoff once under React StrictMode', async () => {
    const state = createHandoff(TOKEN_INSPECTOR_DESTINATION, { token: ACCESS_TOKEN })

    const view = render(
      <StrictMode>
        <AppStateProvider>
          <MemoryRouter
            initialEntries={[
              {
                pathname: TOKEN_INSPECTOR_DESTINATION,
                state,
              },
            ]}
          >
            <Routes>
              <Route path={TOKEN_INSPECTOR_DESTINATION} element={<TokenInspectorPage />} />
            </Routes>
          </MemoryRouter>
        </AppStateProvider>
      </StrictMode>
    )

    await waitFor(() => {
      const input = view.container.querySelector('#token-input') as HTMLTextAreaElement | null
      expect(input).not.toBeNull()
      expect(input.value).toBe(ACCESS_TOKEN)
    })
    expect(window.sessionStorage.length).toBe(0)
    expect(window.localStorage.getItem('iam-tools-token-history')).toBeNull()
  })

  test('strips a legacy token query without importing or persisting it', async () => {
    const view = render(
      <AppStateProvider>
        <MemoryRouter
          initialEntries={[
            `${TOKEN_INSPECTOR_DESTINATION}?token=${encodeURIComponent(ACCESS_TOKEN)}&keep=1`,
          ]}
        >
          <Routes>
            <Route
              path={TOKEN_INSPECTOR_DESTINATION}
              element={
                <>
                  <TokenInspectorPage />
                  <LocationProbe />
                </>
              }
            />
          </Routes>
        </MemoryRouter>
      </AppStateProvider>
    )

    await waitFor(() => {
      expect(view.getByTestId('location-search').textContent).toBe('?keep=1')
    })
    const input = view.container.querySelector('#token-input') as HTMLTextAreaElement
    expect(input.value).toBe('')
    expect(window.sessionStorage.length).toBe(0)
    expect(window.localStorage.length).toBe(0)
  })

  test('clears an inspector token when navigation drops the one-time handoff state', async () => {
    const state = createHandoff(TOKEN_INSPECTOR_DESTINATION, { token: ACCESS_TOKEN })
    const view = render(
      <AppStateProvider>
        <MemoryRouter
          initialEntries={[
            {
              pathname: TOKEN_INSPECTOR_DESTINATION,
              state,
            },
          ]}
        >
          <Routes>
            <Route path={TOKEN_INSPECTOR_DESTINATION} element={<TokenInspectorRouteHarness />} />
          </Routes>
        </MemoryRouter>
      </AppStateProvider>
    )

    await waitFor(() => {
      const input = view.container.querySelector('#token-input') as HTMLTextAreaElement
      expect(input.value).toBe(ACCESS_TOKEN)
    })

    fireEvent.click(view.getByRole('button', { name: 'Open empty inspector' }))

    await waitFor(() => {
      const input = view.container.querySelector('#token-input') as HTMLTextAreaElement
      expect(input.value).toBe('')
      expect(view.getByTestId('location-state').textContent).toBe('null')
    })
  })

  test('clears both comparison tokens when navigation drops the one-time handoff state', async () => {
    const state = createHandoff(TOKEN_COMPARISON_DESTINATION, {
      leftToken: ACCESS_TOKEN,
      rightToken: ID_TOKEN,
    })
    const view = render(
      <MemoryRouter
        initialEntries={[
          {
            pathname: TOKEN_COMPARISON_DESTINATION,
            state,
          },
        ]}
      >
        <Routes>
          <Route path={TOKEN_COMPARISON_DESTINATION} element={<TokenComparisonRouteHarness />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect((view.getByTestId('token-comparison-left') as HTMLTextAreaElement).value).toBe(
        ACCESS_TOKEN
      )
      expect((view.getByTestId('token-comparison-right') as HTMLTextAreaElement).value).toBe(
        ID_TOKEN
      )
    })

    fireEvent.click(view.getByRole('button', { name: 'Open empty comparison' }))

    await waitFor(() => {
      expect((view.getByTestId('token-comparison-left') as HTMLTextAreaElement).value).toBe('')
      expect((view.getByTestId('token-comparison-right') as HTMLTextAreaElement).value).toBe('')
      expect(view.getByTestId('location-state').textContent).toBe('null')
    })
  })
})
