import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test'
import {
  fetchOidcDiscoveryConfiguration,
  runOidcEndpointPreflight,
} from '@/features/oauthPlayground/utils/oidc-preflight'

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

function isDiscoveryUrl(target: string): boolean {
  return target.includes('/.well-known/openid-configuration')
}

describe('OIDC endpoint preflight', () => {
  beforeEach(() => {
    globalThis.fetch = mock(async () => createJsonResponse({ error: 'not mocked' }, 404)) as any
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  test('fetches discovery document and normalizes issuer URL', async () => {
    ;(globalThis.fetch as any).mockImplementation(async (input: Request | string) => {
      const target = resolveTargetUrl(input)
      if (target.endsWith('/tenant/.well-known/openid-configuration')) {
        return createJsonResponse({
          issuer: 'https://issuer.example.com/tenant',
          authorization_endpoint: 'https://issuer.example.com/tenant/oauth2/authorize',
          token_endpoint: 'https://issuer.example.com/tenant/oauth2/token',
          jwks_uri: 'https://issuer.example.com/tenant/oauth2/jwks',
        })
      }

      return createJsonResponse({}, 404)
    })

    const result = await fetchOidcDiscoveryConfiguration('issuer.example.com/tenant/')

    expect(result.normalizedIssuerUrl).toBe('https://issuer.example.com/tenant')
    expect(result.discoveryUrl).toBe(
      'https://issuer.example.com/tenant/.well-known/openid-configuration'
    )
    expect(result.config.token_endpoint).toBe('https://issuer.example.com/tenant/oauth2/token')
  })

  test('fails discovery when discovery endpoint is not successful', async () => {
    ;(globalThis.fetch as any).mockImplementation(async (input: Request | string) => {
      const target = resolveTargetUrl(input)
      if (isDiscoveryUrl(target)) {
        return createJsonResponse({ error: 'unavailable' }, 503)
      }

      return createJsonResponse({}, 404)
    })

    await expect(fetchOidcDiscoveryConfiguration('https://issuer.example.com')).rejects.toThrow(
      /OIDC discovery failed: 503/
    )
  })

  test('classifies endpoint probe results across status classes', async () => {
    ;(globalThis.fetch as any).mockImplementation(async (input: Request | string) => {
      const target = resolveTargetUrl(input)

      if (isDiscoveryUrl(target)) {
        return createJsonResponse({
          issuer: 'https://issuer.example.com',
          authorization_endpoint: 'https://issuer.example.com/oauth2/authorize',
          token_endpoint: 'https://issuer.example.com/oauth2/token',
          userinfo_endpoint: 'https://issuer.example.com/oauth2/userinfo',
          introspection_endpoint: 'https://issuer.example.com/oauth2/introspect',
          jwks_uri: 'https://issuer.example.com/oauth2/jwks',
        })
      }

      if (target.includes('/oauth2/authorize')) {
        return new Response(null, { status: 302, headers: { Location: '/login' } })
      }
      if (target.includes('/oauth2/token')) {
        return createJsonResponse({ error: 'invalid_client' }, 401)
      }
      if (target.includes('/oauth2/userinfo')) {
        return new Response(null, { status: 405 })
      }
      if (target.includes('/oauth2/introspect')) {
        return createJsonResponse({ error: 'server_error' }, 503)
      }
      if (target.includes('/oauth2/jwks')) {
        return createJsonResponse({ error: 'missing' }, 404)
      }

      return createJsonResponse({}, 404)
    })

    const report = await runOidcEndpointPreflight({ issuerUrl: 'https://issuer.example.com' })
    const statuses = Object.fromEntries(
      report.endpoints.map((entry) => [entry.endpoint, entry.status])
    )

    expect(statuses.discovery).toBe('pass')
    expect(statuses.authorization_endpoint).toBe('pass')
    expect(statuses.token_endpoint).toBe('pass')
    expect(statuses.userinfo_endpoint).toBe('warn')
    expect(statuses.introspection_endpoint).toBe('fail')
    expect(statuses.jwks_uri).toBe('fail')
  })

  test('marks network, CORS, and timeout probe failures as warnings', async () => {
    ;(globalThis.fetch as any).mockImplementation(async (input: Request | string) => {
      const target = resolveTargetUrl(input)

      if (isDiscoveryUrl(target)) {
        return createJsonResponse({
          issuer: 'https://issuer.example.com',
          authorization_endpoint: 'https://issuer.example.com/oauth2/authorize',
          token_endpoint: 'https://issuer.example.com/oauth2/token',
          userinfo_endpoint: 'https://issuer.example.com/oauth2/userinfo',
          introspection_endpoint: 'https://issuer.example.com/oauth2/introspect',
          jwks_uri: 'https://issuer.example.com/oauth2/jwks',
        })
      }

      if (target.includes('/oauth2/token')) {
        throw new Error('Failed to fetch')
      }

      if (target.includes('/oauth2/userinfo')) {
        throw new DOMException('Aborted', 'AbortError')
      }

      return createJsonResponse({}, 200)
    })

    const report = await runOidcEndpointPreflight({
      issuerUrl: 'https://issuer.example.com',
      timeoutMs: 5,
    })

    const tokenResult = report.endpoints.find((entry) => entry.endpoint === 'token_endpoint')
    const userInfoResult = report.endpoints.find((entry) => entry.endpoint === 'userinfo_endpoint')

    expect(tokenResult?.status).toBe('warn')
    expect(userInfoResult?.status).toBe('warn')
    expect(report.summary.warn).toBeGreaterThanOrEqual(2)
  })
})
