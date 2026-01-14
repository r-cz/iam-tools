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

const createEnv = () => ({
  ASSETS: {
    fetch: async () =>
      new Response('<html>ok</html>', {
        status: 200,
        headers: { 'Content-Type': 'text/html' },
      }),
  },
})

const buildRequest = (path: string, init?: RequestInit) =>
  new Request(`https://app.test${path}`, init)

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
})
