import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test'
import { act, renderHook } from '@testing-library/react'
import { useOidcConfig } from '@/hooks/data-fetching/useOidcConfig'
import { oidcConfigCache } from '@/lib/cache/oidc-config-cache'

function isTenantIssuerUrl(target: string): boolean {
  return target === 'https://issuer.example.com/tenant'
}

describe('useOidcConfig', () => {
  beforeEach(() => {
    oidcConfigCache.clear()
  })

  afterEach(() => {
    oidcConfigCache.clear()
  })

  test('normalizes issuer URLs and reuses cached discovery responses', async () => {
    const fetchCalls: string[] = []
    const fetchDiscoveryConfiguration = mock(async (issuerUrl: string) => {
      fetchCalls.push(issuerUrl)
      return {
        normalizedIssuerUrl: issuerUrl,
        discoveryUrl: `${issuerUrl}/.well-known/openid-configuration`,
        config: {
          issuer: issuerUrl,
          authorization_endpoint: `${issuerUrl}/oauth2/authorize`,
          token_endpoint: `${issuerUrl}/oauth2/token`,
          jwks_uri: `${issuerUrl}/oauth2/jwks`,
        },
        status: 200,
        statusText: 'OK',
      }
    })

    const { result } = renderHook(() => useOidcConfig({ fetchDiscoveryConfiguration }))

    await act(async () => {
      await result.current.fetchConfig('issuer.example.com/tenant/')
    })

    expect(result.current.data?.issuer).toBe('https://issuer.example.com/tenant')
    expect(result.current.currentIssuer).toBe('https://issuer.example.com/tenant')
    expect(fetchCalls.some((target) => isTenantIssuerUrl(target))).toBe(true)

    await act(async () => {
      await result.current.fetchConfig('https://issuer.example.com/tenant')
    })

    expect(fetchCalls.length).toBe(1)
    expect(result.current.error).toBeNull()
  })

  test('captures response errors from discovery fetch failures', async () => {
    const fetchDiscoveryConfiguration = mock(async () => {
      throw new Error('OIDC discovery failed: 500 Internal Server Error')
    })

    const { result } = renderHook(() => useOidcConfig({ fetchDiscoveryConfiguration }))

    await act(async () => {
      await result.current.fetchConfig('https://issuer.example.com')
    })

    expect(result.current.error).toBeTruthy()
    expect(result.current.data).toBeNull()
    expect(result.current.error?.message).toContain('OIDC discovery failed: 500')
  })

  test('handles invalid issuer URLs without attempting discovery', async () => {
    const fetchDiscoveryConfiguration = mock(async () => {
      throw new Error('Discovery should not be called')
    })
    const { result } = renderHook(() => useOidcConfig({ fetchDiscoveryConfiguration }))

    await act(async () => {
      await result.current.fetchConfig('%%%%')
    })

    expect(fetchDiscoveryConfiguration).toHaveBeenCalledTimes(0)
    expect(result.current.data).toBeNull()
    expect(result.current.error?.message).toContain('Invalid Issuer URL format.')
  })
})
