import React from 'react'
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { cleanup, fireEvent, render } from '@testing-library/react'
import ConfigurationForm from '@/features/oauthPlayground/components/ConfigurationForm'
import { TokenSignature } from '@/features/tokenInspector/components/TokenSignature'
import { STORAGE_KEYS } from '@/lib/state/constants'
import { oidcConfigCache } from '@/lib/cache/oidc-config-cache'
import { jwksCache } from '@/lib/cache/jwks-cache'
import {
  findButtonByName,
  findElementsByRole,
  renderWithProviders,
  waitForCondition,
} from '../utils/test-utils'
import {
  sampleJwksResponse,
  sampleJwt,
  sampleOidcConfigResponse,
  setupApiMocks,
} from '../utils/test-api-mocks'

const savedEnvironment = {
  id: 'example-environment',
  name: 'Example Environment',
  issuerUrl: 'https://example.com',
  authorizationEndpoint: 'https://example.com/oauth2/authorize',
  tokenEndpoint: 'https://example.com/oauth2/token',
  jwksEndpoint: 'https://example.com/.well-known/jwks.json',
  clientId: 'spa-client',
  scopes: ['openid', 'profile'],
  createdAt: 10,
  updatedAt: 10,
  lastUsedAt: 10,
}

describe('saved environments integrations', () => {
  let apiMocks: ReturnType<typeof setupApiMocks>

  beforeEach(() => {
    apiMocks = setupApiMocks()
    cleanup()
    window.localStorage.clear()
    oidcConfigCache.clear()
    jwksCache.clear()
    window.localStorage.setItem(
      STORAGE_KEYS.ENVIRONMENT_PROFILES,
      JSON.stringify([savedEnvironment])
    )
  })

  afterEach(() => {
    cleanup()
    window.localStorage.clear()
    oidcConfigCache.clear()
    jwksCache.clear()
    apiMocks.restore()
  })

  test('prefills the auth code configuration form and keeps fields editable', async () => {
    apiMocks
      .mockSuccess('openid-configuration', sampleOidcConfigResponse)
      .mockSuccess('jwks', sampleJwksResponse)

    const view = renderWithProviders(<ConfigurationForm onConfigComplete={() => {}} />)

    fireEvent.click(findButtonByName('Environments', view.container)!)
    expect(
      await waitForCondition(() =>
        findElementsByRole('menuitem').some((item) =>
          (item.textContent || '').includes('Example Environment')
        )
      )
    ).toBe(true)
    fireEvent.click(
      findElementsByRole('menuitem').find((item) =>
        (item.textContent || '').includes('Example Environment')
      )!
    )

    expect(
      await waitForCondition(
        () =>
          (document.getElementById('issuer-url-discovery') as HTMLInputElement).value ===
          'https://example.com'
      )
    ).toBe(true)

    expect(
      (document.getElementById('oauth-authcode-authorization-endpoint') as HTMLInputElement).value
    ).toBe('https://example.com/oauth2/authorize')
    expect(
      (document.getElementById('oauth-authcode-token-endpoint') as HTMLInputElement).value
    ).toBe('https://example.com/oauth2/token')
    expect((document.getElementById('oauth-client-id') as HTMLInputElement).value).toBe(
      'spa-client'
    )
    expect((document.getElementById('oauth-scopes') as HTMLInputElement).value).toBe(
      'openid profile'
    )
    expect((document.getElementById('oauth-client-secret') as HTMLInputElement).value).toBe('')

    fireEvent.change(
      document.getElementById('oauth-authcode-authorization-endpoint') as HTMLInputElement,
      {
        target: { value: 'https://custom.example.com/authorize' },
      }
    )
    expect(
      (document.getElementById('oauth-authcode-authorization-endpoint') as HTMLInputElement).value
    ).toBe('https://custom.example.com/authorize')

    fireEvent.click(findButtonByName('Discover')!)

    expect(
      await waitForCondition(
        () =>
          (document.getElementById('oauth-authcode-authorization-endpoint') as HTMLInputElement)
            .value === sampleOidcConfigResponse.authorization_endpoint
      )
    ).toBe(true)
  })

  test('uses a saved JWKS endpoint in token signature resolution without falling back to discovery', async () => {
    apiMocks.mockSuccess('jwks\\.json', sampleJwksResponse)
    const fetchMock = apiMocks.getMockedFetch()
    const tokenHeader = JSON.parse(Buffer.from(sampleJwt.split('.')[0], 'base64').toString())

    render(
      <TokenSignature
        token={sampleJwt}
        header={tokenHeader}
        jwks={null}
        issuerUrl={savedEnvironment.issuerUrl}
        setIssuerUrl={() => {}}
        onJwksResolved={() => {}}
        oidcConfig={{
          issuer: savedEnvironment.issuerUrl,
          jwks_uri: savedEnvironment.jwksEndpoint,
        }}
        preferredJwksUri={savedEnvironment.jwksEndpoint}
      />
    )

    expect(
      await waitForCondition(() => {
        const fetchUrls = fetchMock.mock.calls.map((call: unknown[]) => String(call[0]))
        return fetchUrls.some(
          (url) =>
            url.includes(savedEnvironment.jwksEndpoint) ||
            url.includes(encodeURIComponent(savedEnvironment.jwksEndpoint))
        )
      })
    ).toBe(true)

    const fetchUrls = fetchMock.mock.calls.map((call: unknown[]) => String(call[0]))
    expect(fetchUrls.some((url) => url.includes('openid-configuration'))).toBe(false)
  })
})
