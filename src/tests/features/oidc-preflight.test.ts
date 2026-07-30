import { describe, expect, mock, test } from 'bun:test'
import {
  fetchOidcDiscoveryConfiguration,
  runOidcEndpointPreflight,
} from '@/features/oauthPlayground/utils/oidc-preflight'

function createJsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function isDiscoveryUrl(target: string): boolean {
  return target.includes('/.well-known/openid-configuration')
}

describe('OIDC endpoint preflight', () => {
  test.each(['http://10.0.0.8', 'http://idp.corp.internal'])(
    'fetches explicitly entered private issuer discovery directly for %s',
    async (issuerUrl) => {
      const originalFetch = globalThis.fetch
      const calls: string[] = []

      globalThis.fetch = mock(async (target: string | URL | Request) => {
        const url = String(target)
        calls.push(url)

        if (isDiscoveryUrl(url)) {
          return createJsonResponse({
            issuer: issuerUrl,
            authorization_endpoint: `${issuerUrl}/authorize`,
          })
        }

        return createJsonResponse({}, 200)
      }) as typeof fetch

      try {
        const report = await runOidcEndpointPreflight({
          issuerUrl,
          requiredEndpoints: ['authorization_endpoint'],
          includeOptionalEndpoints: false,
          enableServerAssistedProbes: false,
        })

        expect(calls).toEqual([
          `${issuerUrl}/.well-known/openid-configuration`,
          `${issuerUrl}/authorize`,
        ])
        expect(report.endpoints.find(({ endpoint }) => endpoint === 'discovery')?.status).toBe(
          'pass'
        )
        expect(
          report.endpoints.find(({ endpoint }) => endpoint === 'authorization_endpoint')?.status
        ).toBe('pass')
      } finally {
        globalThis.fetch = originalFetch
      }
    }
  )

  test('fetches discovery document and normalizes issuer URL', async () => {
    const fetcher = mock(async (target: string) => {
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

    const result = await fetchOidcDiscoveryConfiguration('issuer.example.com/tenant/', fetcher)

    expect(result.normalizedIssuerUrl).toBe('https://issuer.example.com/tenant')
    expect(result.discoveryUrl).toBe(
      'https://issuer.example.com/tenant/.well-known/openid-configuration'
    )
    expect(result.config.token_endpoint).toBe('https://issuer.example.com/tenant/oauth2/token')
  })

  test('fails discovery when discovery endpoint is not successful', async () => {
    const fetcher = mock(async (target: string) => {
      if (isDiscoveryUrl(target)) {
        return createJsonResponse({ error: 'unavailable' }, 503)
      }

      return createJsonResponse({}, 404)
    })

    await expect(
      fetchOidcDiscoveryConfiguration('https://issuer.example.com', fetcher)
    ).rejects.toThrow(/OIDC discovery failed: 503/)
  })

  test('bounds discovery fetch duration and aborts the underlying request', async () => {
    let discoverySignal: AbortSignal | undefined
    const fetcher = mock((_target: string, options?: RequestInit) => {
      discoverySignal = options?.signal ?? undefined
      return new Promise<Response>(() => {})
    })

    await expect(
      fetchOidcDiscoveryConfiguration('https://issuer.example.com', fetcher, {
        timeoutMs: 5,
      })
    ).rejects.toThrow(/timed out after 5ms/)

    expect(discoverySignal?.aborted).toBe(true)
  })

  test('supports caller cancellation for discovery fetches', async () => {
    const controller = new AbortController()
    const fetcher = mock(
      (_target: string, _options?: RequestInit) => new Promise<Response>(() => {})
    )
    const pending = fetchOidcDiscoveryConfiguration('https://issuer.example.com', fetcher, {
      signal: controller.signal,
    })

    controller.abort()

    await expect(pending).rejects.toThrow(/cancelled/)
  })

  test('keeps the timeout active while reading the discovery document body', async () => {
    const fetcher = mock(async () => {
      return {
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () => new Promise<unknown>(() => {}),
      } as Response
    })

    await expect(
      fetchOidcDiscoveryConfiguration('https://issuer.example.com', fetcher, {
        timeoutMs: 5,
      })
    ).rejects.toThrow(/timed out after 5ms/)
  })

  test('returns a bounded network-classified report when discovery times out', async () => {
    const fetcher = mock(
      (_target: string, _options?: RequestInit) => new Promise<Response>(() => {})
    )

    const report = await runOidcEndpointPreflight(
      {
        issuerUrl: 'https://issuer.example.com',
        timeoutMs: 5,
      },
      fetcher
    )

    expect(report.endpoints).toHaveLength(1)
    expect(report.endpoints[0]?.status).toBe('fail')
    expect(report.endpoints[0]?.reasonCode).toBe('network_or_cors')
    expect(report.endpoints[0]?.error).toContain('timed out after 5ms')
  })

  test('classifies endpoint probe results with reachability-first semantics', async () => {
    const fetcher = mock(async (target: string) => {
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

    const report = await runOidcEndpointPreflight(
      { issuerUrl: 'https://issuer.example.com' },
      fetcher
    )
    const byEndpoint = Object.fromEntries(report.endpoints.map((entry) => [entry.endpoint, entry]))

    expect(byEndpoint.discovery.status).toBe('pass')
    expect(byEndpoint.discovery.reasonCode).toBe('reachable')

    expect(byEndpoint.authorization_endpoint.status).toBe('pass')
    expect(byEndpoint.authorization_endpoint.reasonCode).toBe('reachable')

    expect(byEndpoint.token_endpoint.status).toBe('pass')
    expect(byEndpoint.token_endpoint.reasonCode).toBe('auth_required')

    expect(byEndpoint.userinfo_endpoint.status).toBe('warn')
    expect(byEndpoint.userinfo_endpoint.reasonCode).toBe('method_not_allowed')

    expect(byEndpoint.introspection_endpoint.status).toBe('warn')
    expect(byEndpoint.introspection_endpoint.reasonCode).toBe('server_error')

    expect(byEndpoint.jwks_uri.status).toBe('fail')
    expect(byEndpoint.jwks_uri.reasonCode).toBe('missing_or_unavailable')
  })

  test('uses a dedicated direct fetcher only for authorized same-origin endpoint probes', async () => {
    const discoveryFetcher = mock(async (target: string) => {
      expect(isDiscoveryUrl(target)).toBe(true)
      return createJsonResponse({
        issuer: 'http://10.0.0.8',
        authorization_endpoint: 'http://10.0.0.8/authorize',
      })
    })
    const endpointProbeFetcher = mock(async (target: string) => {
      expect(target).toBe('http://10.0.0.8/authorize')
      return new Response(null, { status: 302 })
    })

    const report = await runOidcEndpointPreflight(
      {
        issuerUrl: 'http://10.0.0.8',
        requiredEndpoints: ['authorization_endpoint'],
        includeOptionalEndpoints: false,
        endpointProbeFetcher,
        enableServerAssistedProbes: false,
      },
      discoveryFetcher
    )

    expect(discoveryFetcher).toHaveBeenCalledTimes(1)
    expect(endpointProbeFetcher).toHaveBeenCalledTimes(1)
    expect(
      report.endpoints.find((entry) => entry.endpoint === 'authorization_endpoint')?.status
    ).toBe('pass')
  })

  test('treats 404/410/5xx as fail for required endpoints and warn for optional endpoints', async () => {
    const fetcher = mock(async (target: string) => {
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
        return new Response(null, { status: 200 })
      }
      if (target.includes('/oauth2/token')) {
        return createJsonResponse({ error: 'server_error' }, 503)
      }
      if (target.includes('/oauth2/userinfo')) {
        return createJsonResponse({ error: 'gone' }, 410)
      }
      if (target.includes('/oauth2/introspect')) {
        return createJsonResponse({ error: 'missing' }, 404)
      }
      if (target.includes('/oauth2/jwks')) {
        return createJsonResponse({ keys: [] }, 200)
      }

      return createJsonResponse({}, 404)
    })

    const report = await runOidcEndpointPreflight(
      {
        issuerUrl: 'https://issuer.example.com',
        requiredEndpoints: ['token_endpoint'],
      },
      fetcher
    )

    const tokenResult = report.endpoints.find((entry) => entry.endpoint === 'token_endpoint')
    const userInfoResult = report.endpoints.find((entry) => entry.endpoint === 'userinfo_endpoint')
    const introspectionResult = report.endpoints.find(
      (entry) => entry.endpoint === 'introspection_endpoint'
    )

    expect(tokenResult?.required).toBe(true)
    expect(tokenResult?.status).toBe('fail')
    expect(tokenResult?.reasonCode).toBe('server_error')

    expect(userInfoResult?.required).toBe(false)
    expect(userInfoResult?.status).toBe('warn')
    expect(userInfoResult?.reasonCode).toBe('missing_or_unavailable')

    expect(introspectionResult?.required).toBe(false)
    expect(introspectionResult?.status).toBe('warn')
    expect(introspectionResult?.reasonCode).toBe('missing_or_unavailable')
  })

  test('marks network, CORS, and timeout probe failures as warnings', async () => {
    const fetcher = mock(async (target: string) => {
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
        throw new TypeError('NetworkError when attempting to fetch resource.')
      }

      if (target.includes('/oauth2/userinfo')) {
        throw new DOMException('Aborted', 'AbortError')
      }

      return createJsonResponse({}, 200)
    })

    const report = await runOidcEndpointPreflight(
      {
        issuerUrl: 'https://issuer.example.com',
        timeoutMs: 5,
      },
      fetcher
    )

    const tokenResult = report.endpoints.find((entry) => entry.endpoint === 'token_endpoint')
    const userInfoResult = report.endpoints.find((entry) => entry.endpoint === 'userinfo_endpoint')

    expect(tokenResult?.status).toBe('warn')
    expect(tokenResult?.reasonCode).toBe('network_or_cors')

    expect(userInfoResult?.status).toBe('warn')
    expect(userInfoResult?.reasonCode).toBe('network_or_cors')
  })

  test('uses server-assisted probe fallback when browser probe is blocked', async () => {
    const browserFetcher = mock(async (target: string) => {
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
        throw new TypeError('Failed to fetch')
      }

      return createJsonResponse({}, 200)
    })

    const serverAssistedFetcher = mock(async (target: string, options?: RequestInit) => {
      if (target.endsWith('/api/oidc-preflight-probe')) {
        const payload = JSON.parse((options?.body as string) ?? '{}') as { url?: string }
        expect(payload.url).toBe('https://issuer.example.com/oauth2/token')

        return createJsonResponse({
          ok: true,
          status: 401,
          statusText: 'Unauthorized',
        })
      }

      return createJsonResponse({ ok: false, error: 'unexpected target' }, 500)
    })

    const report = await runOidcEndpointPreflight(
      {
        issuerUrl: 'https://issuer.example.com',
        enableServerAssistedProbes: true,
        serverAssistedProbeFetcher: serverAssistedFetcher,
      },
      browserFetcher
    )

    const tokenResult = report.endpoints.find((entry) => entry.endpoint === 'token_endpoint')
    expect(tokenResult?.status).toBe('pass')
    expect(tokenResult?.reasonCode).toBe('auth_required')
    expect(tokenResult?.message).toContain('server-assisted probe')
    expect(serverAssistedFetcher).toHaveBeenCalledTimes(1)
  })

  test('fails required missing/invalid endpoints and warns for optional invalid endpoints', async () => {
    const fetcher = mock(async (target: string) => {
      if (isDiscoveryUrl(target)) {
        return createJsonResponse({
          issuer: 'https://issuer.example.com',
          authorization_endpoint: 'https://issuer.example.com/oauth2/authorize',
          userinfo_endpoint: 'not a valid url',
        })
      }

      if (target.includes('/oauth2/authorize')) {
        return createJsonResponse({}, 200)
      }

      return createJsonResponse({}, 404)
    })

    const report = await runOidcEndpointPreflight(
      {
        issuerUrl: 'https://issuer.example.com',
        requiredEndpoints: ['token_endpoint'],
      },
      fetcher
    )

    const tokenResult = report.endpoints.find((entry) => entry.endpoint === 'token_endpoint')
    const userInfoResult = report.endpoints.find((entry) => entry.endpoint === 'userinfo_endpoint')

    expect(tokenResult?.status).toBe('fail')
    expect(tokenResult?.reasonCode).toBe('missing_or_unavailable')

    expect(userInfoResult?.status).toBe('warn')
    expect(userInfoResult?.reasonCode).toBe('invalid_url')
  })

  test.each([
    'http://localhost:8080/authorize',
    'http://api.localhost/authorize',
    'http://10.0.0.8/authorize',
    'http://169.254.169.254/latest/meta-data',
    'http://172.16.0.1/authorize',
    'http://192.168.1.10/authorize',
    'http://2130706433/authorize',
    'http://[::1]/authorize',
    'http://metadata.google.internal/authorize',
    'https://auth.issuer.example.com/authorize',
    'https://issuer.example.com:8443/authorize',
    'https://attacker-controlled.example/authorize',
    'https://user:secret@public.example.com/authorize',
  ])('never probes unsafe discovery-controlled target %s', async (unsafeTarget) => {
    const browserCalls: string[] = []
    const browserFetcher = mock(async (target: string) => {
      browserCalls.push(target)
      if (isDiscoveryUrl(target)) {
        return createJsonResponse({
          issuer: 'https://issuer.example.com',
          authorization_endpoint: unsafeTarget,
        })
      }

      return createJsonResponse({}, 200)
    })
    const serverAssistedFetcher = mock(async () => createJsonResponse({ ok: true, status: 200 }))

    const report = await runOidcEndpointPreflight(
      {
        issuerUrl: 'https://issuer.example.com',
        requiredEndpoints: ['authorization_endpoint'],
        includeOptionalEndpoints: false,
        enableServerAssistedProbes: true,
        serverAssistedProbeFetcher: serverAssistedFetcher,
      },
      browserFetcher
    )

    const result = report.endpoints.find((entry) => entry.endpoint === 'authorization_endpoint')
    expect(result?.status).toBe('warn')
    expect(result?.reasonCode).toBe('unsafe_target')
    expect(result?.message).toContain('Probe blocked')
    expect(browserCalls).toEqual(['https://issuer.example.com/.well-known/openid-configuration'])
    expect(serverAssistedFetcher).not.toHaveBeenCalled()
  })

  test.each(['http://localhost:9000', 'http://10.0.0.8', 'http://issuer.corp.internal'])(
    'probes same-origin endpoints for explicitly supplied issuer %s',
    async (issuerUrl) => {
      const calls: string[] = []
      const fetcher = mock(async (target: string) => {
        calls.push(target)
        if (isDiscoveryUrl(target)) {
          return createJsonResponse({
            issuer: issuerUrl,
            authorization_endpoint: `${issuerUrl}/authorize`,
          })
        }

        return createJsonResponse({}, 200)
      })

      const report = await runOidcEndpointPreflight(
        {
          issuerUrl,
          requiredEndpoints: ['authorization_endpoint'],
          includeOptionalEndpoints: false,
          enableServerAssistedProbes: false,
        },
        fetcher
      )

      expect(calls).toEqual([
        `${issuerUrl}/.well-known/openid-configuration`,
        `${issuerUrl}/authorize`,
      ])
      expect(report.endpoints[0]?.status).toBe('pass')
      expect(
        report.endpoints.find((entry) => entry.endpoint === 'authorization_endpoint')?.reasonCode
      ).toBe('reachable')
    }
  )
})
