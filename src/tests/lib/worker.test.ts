import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import worker from '@/worker'
import { CSP_INLINE_SCRIPT_SHA256 } from '@/csp-hashes'

const originalFetch = globalThis.fetch
let fetchCalls: Array<Request | string> = []

const fetchSpy = async (request: Request | string) => {
  fetchCalls.push(request)
  return new Response('proxied', {
    status: 200,
    headers: { 'Content-Type': 'text/plain' },
  })
}

const createEnv = (
  overrides: {
    CORS_ALLOWED_ORIGINS?: string
    DEMO_REDIRECT_URIS?: string
    DEMO_TOKEN_SIGNING_SECRET?: string
  } = {}
) => ({
  ASSETS: {
    fetch: async () =>
      new Response('<html>ok</html>', {
        status: 200,
        headers: { 'Content-Type': 'text/html' },
      }),
  },
  ...overrides,
})

const buildRequest = (path: string, init?: RequestInit) =>
  new Request(`https://app.test${path}`, init)

const mutateSegment = (segment: string): string => {
  if (!segment) {
    return 'A'
  }

  // Avoid mutating the final base64url character where padding bits can be ignored.
  const indexToMutate = segment.length > 1 ? 1 : 0
  const current = segment[indexToMutate]
  const replacement = current === 'A' ? 'B' : 'A'
  return `${segment.slice(0, indexToMutate)}${replacement}${segment.slice(indexToMutate + 1)}`
}

const tamperToken = (value: string) => {
  const parts = value.split('.')
  if (parts.length === 3) {
    parts[2] = mutateSegment(parts[2])
    return parts.join('.')
  }

  return mutateSegment(value)
}

describe('worker api', () => {
  beforeEach(() => {
    fetchCalls = []
    globalThis.fetch = fetchSpy as typeof fetch
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  test('responds to api preflight', async () => {
    const response = await worker.fetch(
      buildRequest('/api/anything', { method: 'OPTIONS' }),
      createEnv()
    )

    expect(response.status).toBe(204)
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*')
    expect(response.headers.get('Access-Control-Allow-Methods')).toContain('OPTIONS')
  })

  test('returns openid configuration', async () => {
    const response = await worker.fetch(
      buildRequest('/api/.well-known/openid-configuration'),
      createEnv()
    )

    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*')
    expect(response.headers.get('Cache-Control')).toContain('max-age=86400')

    const data = await response.json()
    expect(data.issuer).toBe('https://app.test/api')
    expect(data.jwks_uri).toBe('https://app.test/api/jwks')
  })

  test('returns jwks', async () => {
    const response = await worker.fetch(buildRequest('/api/jwks'), createEnv())
    const data = await response.json()

    expect(Array.isArray(data.keys)).toBe(true)
  })

  test('rejects unregistered external demo authorization redirects', async () => {
    const redirectUri = 'https://evil.example/callback'
    const response = await worker.fetch(
      buildRequest(
        `/api/auth?response_type=code&client_id=demo-client&redirect_uri=${encodeURIComponent(redirectUri)}`
      ),
      createEnv()
    )

    expect(response.status).toBe(400)
    expect(response.headers.get('Location')).toBeNull()
    const data = await response.json()
    expect(data.error).toBe('invalid_request')
  })

  test('allows exact configured demo authorization redirects', async () => {
    const redirectUri = 'https://client.example.com/oauth/callback'
    const response = await worker.fetch(
      buildRequest(
        `/api/auth?response_type=code&client_id=demo-client&redirect_uri=${encodeURIComponent(redirectUri)}`
      ),
      createEnv({ DEMO_REDIRECT_URIS: redirectUri })
    )

    expect(response.status).toBe(302)
    expect(response.headers.get('Location')?.startsWith(redirectUri)).toBe(true)
  })

  test('allows the local app callback across development ports', async () => {
    const redirectUri = 'http://127.0.0.1:5173/oauth-playground/callback'
    const request = new Request(
      `http://localhost:8788/api/auth?response_type=code&client_id=demo-client&redirect_uri=${encodeURIComponent(redirectUri)}`
    )
    const response = await worker.fetch(request, createEnv())

    expect(response.status).toBe(302)
    expect(response.headers.get('Location')?.startsWith(redirectUri)).toBe(true)
  })

  test('echoes allowed origin when allowlist is set', async () => {
    const allowedOrigin = 'https://allowed.example'
    const response = await worker.fetch(
      buildRequest('/api/jwks', { headers: { Origin: allowedOrigin } }),
      createEnv({ CORS_ALLOWED_ORIGINS: `${allowedOrigin},https://other.example` })
    )

    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(allowedOrigin)
  })

  test('rejects disallowed origin when allowlist is set', async () => {
    const response = await worker.fetch(
      buildRequest('/api/jwks', { headers: { Origin: 'https://blocked.example' } }),
      createEnv({ CORS_ALLOWED_ORIGINS: 'https://allowed.example' })
    )

    expect(response.status).toBe(403)
    expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull()
  })

  test('rejects cors proxy with empty target', async () => {
    const response = await worker.fetch(buildRequest('/api/cors-proxy/'), createEnv())

    expect(response.status).toBe(400)
  })

  test('rejects cors proxy disallowed target', async () => {
    const target = encodeURIComponent('https://example.com/not-allowed')
    const response = await worker.fetch(buildRequest(`/api/cors-proxy/${target}`), createEnv())

    expect(response.status).toBe(403)
    expect(fetchCalls.length).toBe(0)
  })

  test('rejects insecure, local, private, and IP-literal cors proxy targets', async () => {
    const blockedTargets = [
      'http://issuer.example.com/.well-known/openid-configuration',
      'https://localhost/.well-known/openid-configuration',
      'https://127.0.0.1/.well-known/openid-configuration',
      'https://10.0.0.8/.well-known/openid-configuration',
      'https://169.254.169.254/.well-known/openid-configuration',
      'https://203.0.113.10/.well-known/openid-configuration',
      'https://issuer.example.com:8443/.well-known/openid-configuration',
    ]

    for (const targetUrl of blockedTargets) {
      const response = await worker.fetch(
        buildRequest(`/api/cors-proxy/${encodeURIComponent(targetUrl)}`),
        createEnv()
      )
      expect(response.status).toBe(403)
    }

    expect(fetchCalls.length).toBe(0)
  })

  test('proxies allowed target', async () => {
    const targetUrl = 'https://issuer.example.com/.well-known/openid-configuration'
    const response = await worker.fetch(
      buildRequest(`/api/cors-proxy/${encodeURIComponent(targetUrl)}`),
      createEnv()
    )

    expect(fetchCalls.length).toBe(1)

    const requestArg = fetchCalls[0]
    const requestUrl = requestArg instanceof Request ? requestArg.url : requestArg
    expect(requestUrl).toBe(targetUrl)

    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*')
    expect(response.headers.get('Access-Control-Allow-Methods')).toContain('GET')
  })

  test('strips credentials and arbitrary headers from cors proxy requests', async () => {
    const targetUrl = 'https://issuer.example.com/.well-known/openid-configuration'
    const response = await worker.fetch(
      buildRequest(`/api/cors-proxy/${encodeURIComponent(targetUrl)}`, {
        headers: {
          Accept: 'application/json',
          Authorization: 'Bearer browser-secret',
          Cookie: 'session=browser-secret',
          'X-Forwarded-For': '127.0.0.1',
        },
      }),
      createEnv()
    )

    expect(response.status).toBe(200)
    const forwardedRequest = fetchCalls[0] as Request
    expect(forwardedRequest.headers.get('Accept')).toBe('application/json')
    expect(forwardedRequest.headers.get('Authorization')).toBeNull()
    expect(forwardedRequest.headers.get('Cookie')).toBeNull()
    expect(forwardedRequest.headers.get('X-Forwarded-For')).toBeNull()
    expect(forwardedRequest.redirect).toBe('manual')
  })

  test('blocks cors proxy redirects to unsafe targets', async () => {
    const targetUrl = 'https://issuer.example.com/.well-known/openid-configuration'
    globalThis.fetch = (async (request: Request | string) => {
      fetchCalls.push(request)
      return new Response(null, {
        status: 302,
        headers: { Location: 'http://127.0.0.1/.well-known/openid-configuration' },
      })
    }) as typeof fetch

    const response = await worker.fetch(
      buildRequest(`/api/cors-proxy/${encodeURIComponent(targetUrl)}`),
      createEnv()
    )

    expect(response.status).toBe(403)
    expect(fetchCalls.length).toBe(1)
  })

  test('revalidates safe cors proxy redirects and strips unsafe response headers', async () => {
    const targetUrl = 'https://issuer.example.com/.well-known/openid-configuration'
    globalThis.fetch = (async (request: Request | string) => {
      fetchCalls.push(request)
      if (fetchCalls.length === 1) {
        return new Response(null, {
          status: 302,
          headers: { Location: '/tenant/discovery.json' },
        })
      }

      return new Response('{"issuer":"https://issuer.example.com"}', {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': 'upstream=secret',
          'X-Upstream-Internal': 'hidden',
        },
      })
    }) as typeof fetch

    const response = await worker.fetch(
      buildRequest(`/api/cors-proxy/${encodeURIComponent(targetUrl)}`),
      createEnv()
    )

    expect(response.status).toBe(200)
    expect(fetchCalls.length).toBe(2)
    expect((fetchCalls[1] as Request).url).toBe('https://issuer.example.com/tenant/discovery.json')
    expect(response.headers.get('Content-Type')).toBe('application/json')
    expect(response.headers.get('Set-Cookie')).toBeNull()
    expect(response.headers.get('X-Upstream-Internal')).toBeNull()
  })

  test('rate limits cors proxy requests', async () => {
    const targetUrl = 'https://issuer.example.com/.well-known/openid-configuration'
    const headers = { 'CF-Connecting-IP': '203.0.113.10' }
    let response: Response | undefined

    for (let i = 0; i < 60; i += 1) {
      response = await worker.fetch(
        buildRequest(`/api/cors-proxy/${encodeURIComponent(targetUrl)}`, { headers }),
        createEnv()
      )
    }

    response = await worker.fetch(
      buildRequest(`/api/cors-proxy/${encodeURIComponent(targetUrl)}`, { headers }),
      createEnv()
    )

    expect(response.status).toBe(429)
    expect(response.headers.get('Retry-After')).toBeTruthy()
  })

  test('rejects OIDC preflight probe for disallowed targets', async () => {
    const response = await worker.fetch(
      buildRequest('/api/oidc-preflight-probe', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          url: 'http://localhost:8080/oauth2/token',
          method: 'POST',
        }),
      }),
      createEnv()
    )

    expect(response.status).toBe(403)
    const data = await response.json()
    expect(data.ok).toBe(false)
    expect(fetchCalls.length).toBe(0)
  })

  test('probes allowed endpoint via OIDC preflight probe route', async () => {
    const targetUrl = 'https://issuer.example.com/oauth2/token'
    const response = await worker.fetch(
      buildRequest('/api/oidc-preflight-probe', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          url: targetUrl,
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: 'grant_type=client_credentials&client_id=oidc_preflight',
        }),
      }),
      createEnv()
    )

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.ok).toBe(true)
    expect(data.status).toBe(200)
    expect(fetchCalls.length).toBe(1)

    const requestArg = fetchCalls[0]
    expect(requestArg instanceof Request).toBe(true)
    const forwardedRequest = requestArg as Request
    expect(forwardedRequest.url).toBe(targetUrl)
    expect(forwardedRequest.method).toBe('POST')
  })

  test('adds security headers to assets', async () => {
    const response = await worker.fetch(buildRequest('/'), createEnv())

    expect(response.headers.get('Referrer-Policy')).toBe('no-referrer')
    expect(response.headers.get('X-Frame-Options')).toBe('DENY')
    expect(response.headers.get('Permissions-Policy')).toContain('geolocation=()')

    const csp = response.headers.get('Content-Security-Policy') ?? ''
    expect(csp).toContain("default-src 'self'")
    expect(csp).toContain("script-src 'self'")
    if (CSP_INLINE_SCRIPT_SHA256) {
      expect(csp).toContain(CSP_INLINE_SCRIPT_SHA256)
    }
  })

  test('accepts signed auth code and rejects tampered auth code in strict mode', async () => {
    const env = createEnv({ DEMO_TOKEN_SIGNING_SECRET: 'strict-signing-secret' })
    const redirectUri = 'https://app.test/oauth-playground/callback'

    const authResponse = await worker.fetch(
      buildRequest(
        `/api/auth?response_type=code&client_id=demo-client&redirect_uri=${encodeURIComponent(redirectUri)}&scope=openid%20offline_access`
      ),
      env
    )
    expect(authResponse.status).toBe(302)

    const location = authResponse.headers.get('Location')
    expect(location).toBeTruthy()
    const redirect = new URL(location!)
    const authorizationCode = redirect.searchParams.get('code')
    expect(authorizationCode).toBeTruthy()

    const tokenRequestBody = new URLSearchParams({
      grant_type: 'authorization_code',
      code: authorizationCode!,
      redirect_uri: redirectUri,
      client_id: 'demo-client',
    }).toString()

    const tokenResponse = await worker.fetch(
      buildRequest('/api/token', {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: tokenRequestBody,
      }),
      env
    )
    expect(tokenResponse.status).toBe(200)
    const tokenData = await tokenResponse.json()
    expect(typeof tokenData.access_token).toBe('string')

    const tamperedCode = tamperToken(authorizationCode!)
    const tamperedTokenResponse = await worker.fetch(
      buildRequest('/api/token', {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code: tamperedCode,
          redirect_uri: redirectUri,
          client_id: 'demo-client',
        }).toString(),
      }),
      env
    )
    expect(tamperedTokenResponse.status).toBe(400)
    const tamperedData = await tamperedTokenResponse.json()
    expect(tamperedData.error).toBe('invalid_grant')
  })

  test('accepts signed refresh token and rejects tampered refresh token in strict mode', async () => {
    const env = createEnv({ DEMO_TOKEN_SIGNING_SECRET: 'strict-signing-secret' })
    const redirectUri = 'https://app.test/oauth-playground/callback'

    const authResponse = await worker.fetch(
      buildRequest(
        `/api/auth?response_type=code&client_id=demo-client&redirect_uri=${encodeURIComponent(redirectUri)}&scope=openid%20offline_access`
      ),
      env
    )
    const authLocation = authResponse.headers.get('Location')
    const authCode = authLocation ? new URL(authLocation).searchParams.get('code') : null
    expect(authCode).toBeTruthy()

    const exchangeResponse = await worker.fetch(
      buildRequest('/api/token', {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code: authCode!,
          redirect_uri: redirectUri,
          client_id: 'demo-client',
        }).toString(),
      }),
      env
    )
    const exchangeData = await exchangeResponse.json()
    expect(exchangeResponse.status).toBe(200)
    expect(typeof exchangeData.refresh_token).toBe('string')

    const refreshResponse = await worker.fetch(
      buildRequest('/api/token', {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: exchangeData.refresh_token,
          client_id: 'demo-client',
        }).toString(),
      }),
      env
    )
    expect(refreshResponse.status).toBe(200)
    const refreshedData = await refreshResponse.json()
    expect(typeof refreshedData.access_token).toBe('string')

    const tamperedRefreshToken = tamperToken(exchangeData.refresh_token)
    const invalidRefreshResponse = await worker.fetch(
      buildRequest('/api/token', {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: tamperedRefreshToken,
          client_id: 'demo-client',
        }).toString(),
      }),
      env
    )
    expect(invalidRefreshResponse.status).toBe(400)
    const invalidRefreshData = await invalidRefreshResponse.json()
    expect(invalidRefreshData.error).toBe('invalid_grant')
  })

  test('rejects invalid JWT signatures for userinfo and introspection in strict mode', async () => {
    const env = createEnv({ DEMO_TOKEN_SIGNING_SECRET: 'strict-signing-secret' })

    const tokenGenerationResponse = await worker.fetch(
      buildRequest('/api/token/generate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          subject: 'demo-user',
          client_id: 'demo-client',
          scope: 'openid profile email',
        }),
      }),
      env
    )
    expect(tokenGenerationResponse.status).toBe(200)
    const generatedToken = await tokenGenerationResponse.json()
    const tamperedAccessToken = tamperToken(generatedToken.access_token)

    const userInfoResponse = await worker.fetch(
      buildRequest('/api/userinfo', {
        method: 'GET',
        headers: { Authorization: `Bearer ${tamperedAccessToken}` },
      }),
      env
    )
    expect(userInfoResponse.status).toBe(401)
    const userInfoData = await userInfoResponse.json()
    expect(userInfoData.error).toBe('invalid_token')

    const introspectionResponse = await worker.fetch(
      buildRequest('/api/introspect', {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ token: tamperedAccessToken }).toString(),
      }),
      env
    )
    expect(introspectionResponse.status).toBe(200)
    const introspectionData = await introspectionResponse.json()
    expect(introspectionData.active).toBe(false)
  })

  test('keeps legacy auth-code and refresh-token behavior when strict secret is unset', async () => {
    const env = createEnv()
    const redirectUri = 'https://app.test/oauth-playground/callback'

    const authResponse = await worker.fetch(
      buildRequest(
        `/api/auth?response_type=code&client_id=demo-client&redirect_uri=${encodeURIComponent(redirectUri)}&scope=openid%20offline_access`
      ),
      env
    )
    expect(authResponse.status).toBe(302)
    const authLocation = authResponse.headers.get('Location')
    const authCode = authLocation ? new URL(authLocation).searchParams.get('code') : null
    expect(authCode).toBeTruthy()

    const exchangeResponse = await worker.fetch(
      buildRequest('/api/token', {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code: authCode!,
          redirect_uri: redirectUri,
          client_id: 'demo-client',
        }).toString(),
      }),
      env
    )
    expect(exchangeResponse.status).toBe(200)
    const exchangeData = await exchangeResponse.json()
    expect(typeof exchangeData.refresh_token).toBe('string')
    expect(exchangeData.refresh_token.startsWith('rt_')).toBe(true)

    const refreshResponse = await worker.fetch(
      buildRequest('/api/token', {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: exchangeData.refresh_token,
          client_id: 'demo-client',
        }).toString(),
      }),
      env
    )
    expect(refreshResponse.status).toBe(200)
    const refreshedData = await refreshResponse.json()
    expect(typeof refreshedData.access_token).toBe('string')
  })
})
