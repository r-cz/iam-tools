import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test'
import { act, renderHook } from '@testing-library/react'
import { useOidcConfig } from '@/hooks/data-fetching/useOidcConfig'
import { oidcConfigCache } from '@/lib/cache/oidc-config-cache'

const originalFetch = globalThis.fetch

function createJsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function resolveTargetUrl(input: Request | string): string {
  const url = typeof input === 'string' ? input : input.url
  const proxyPrefix = '/api/cors-proxy/'
  const proxyIndex = url.indexOf(proxyPrefix)
  if (proxyIndex === -1) {
    return url
  }

  const encodedTarget = url.slice(proxyIndex + proxyPrefix.length)
  return decodeURIComponent(encodedTarget)
}

function isTenantDiscoveryUrl(target: string): boolean {
  return target.endsWith('/tenant/.well-known/openid-configuration')
}

function isIssuerDiscoveryUrl(target: string): boolean {
  return target.includes('/.well-known/openid-configuration')
}

describe('useOidcConfig', () => {
  beforeEach(() => {
    oidcConfigCache.clear()
  })

  afterEach(() => {
    oidcConfigCache.clear()
    globalThis.fetch = originalFetch
  })

  test('normalizes issuer URLs and reuses cached discovery responses', async () => {
    const fetchCalls: string[] = []
    globalThis.fetch = mock(async (input: Request | string) => {
      const target = resolveTargetUrl(input)
      fetchCalls.push(target)

      if (isTenantDiscoveryUrl(target)) {
        return createJsonResponse({
          issuer: 'https://issuer.example.com/tenant',
          authorization_endpoint: 'https://issuer.example.com/tenant/oauth2/authorize',
          token_endpoint: 'https://issuer.example.com/tenant/oauth2/token',
          jwks_uri: 'https://issuer.example.com/tenant/oauth2/jwks',
        })
      }

      return createJsonResponse({ error: 'not found' }, 404)
    }) as any

    const { result } = renderHook(() => useOidcConfig())

    await act(async () => {
      await result.current.fetchConfig('issuer.example.com/tenant/')
    })

    expect(result.current.data?.issuer).toBe('https://issuer.example.com/tenant')
    expect(result.current.currentIssuer).toBe('https://issuer.example.com/tenant')
    expect(fetchCalls.some((target) => isTenantDiscoveryUrl(target))).toBe(true)

    await act(async () => {
      await result.current.fetchConfig('https://issuer.example.com/tenant')
    })

    expect(fetchCalls.length).toBe(1)
    expect(result.current.error).toBeNull()
  })

  test('captures response errors from discovery fetch failures', async () => {
    globalThis.fetch = mock(async (input: Request | string) => {
      const target = resolveTargetUrl(input)
      if (isIssuerDiscoveryUrl(target)) {
        return createJsonResponse({ error: 'server unavailable' }, 500)
      }

      return createJsonResponse({ error: 'not found' }, 404)
    }) as any

    const { result } = renderHook(() => useOidcConfig())

    await act(async () => {
      await result.current.fetchConfig('https://issuer.example.com')
    })

    expect(result.current.error).toBeTruthy()
    expect(result.current.data).toBeNull()
    expect(result.current.error?.message).toContain('OIDC discovery failed: 500')
  })

  test('handles invalid issuer URLs without attempting discovery', async () => {
    const fetchMock = mock(async () => createJsonResponse({}))
    globalThis.fetch = fetchMock as any

    const { result } = renderHook(() => useOidcConfig())

    await act(async () => {
      await result.current.fetchConfig('%%%%')
    })

    expect(fetchMock).toHaveBeenCalledTimes(0)
    expect(result.current.data).toBeNull()
    expect(result.current.error?.message).toContain('Invalid Issuer URL format.')
  })
})
