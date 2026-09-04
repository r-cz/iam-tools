import { afterEach, describe, expect, test } from 'bun:test'
import worker from '@/worker'
import { signToken } from '@/lib/jwt/sign-token'

const originalFetch = globalThis.fetch
const originalNow = Date.now
const env = { ASSETS: { fetch: async () => new Response('<html>app</html>') } }
const request = (path: string, init?: RequestInit) =>
  new Request(`https://audit.example${path}`, init)

afterEach(() => {
  globalThis.fetch = originalFetch
  Date.now = originalNow
})

describe('worker request boundaries', () => {
  test('returns JSON 404 for unknown API paths and keeps similar app routes separate', async () => {
    const response = await worker.fetch(request('/api/missing'), env)
    expect(response.status).toBe(404)
    expect((await response.json()).error).toBe('not_found')
    expect(await (await worker.fetch(request('/apiary'), env)).text()).toContain('<html>')
  })

  test('does not trust a localhost Origin to bypass a deployed CORS allowlist', async () => {
    const response = await worker.fetch(
      request('/api/jwks', {
        headers: { Origin: 'http://localhost:5173' },
      }),
      { ...env, CORS_ALLOWED_ORIGINS: 'https://trusted.example' }
    )
    expect(response.status).toBe(403)
    expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull()
  })

  test('rate limits a deployed request with a forged localhost Origin and resets at the boundary', async () => {
    const now = originalNow()
    Date.now = () => now
    const headers = { Origin: 'http://localhost:5173', 'CF-Connecting-IP': 'rate-limit-audit' }
    for (let i = 0; i < 120; i++) {
      expect((await worker.fetch(request('/api/jwks', { headers }), env)).status).toBe(200)
    }
    const blocked = await worker.fetch(request('/api/jwks', { headers }), env)
    expect(blocked.status).toBe(429)
    expect(blocked.headers.get('Retry-After')).toBe('60')
    Date.now = () => now + 60_000
    expect((await worker.fetch(request('/api/jwks', { headers }), env)).status).toBe(200)
  })

  test('retains cross-port local development CORS support', async () => {
    const response = await worker.fetch(
      new Request('http://localhost:8788/api/jwks', {
        headers: { Origin: 'http://127.0.0.1:5174' },
      }),
      { ...env, CORS_ALLOWED_ORIGINS: 'https://trusted.example' }
    )
    expect(response.status).toBe(200)
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://127.0.0.1:5174')
  })

  test('returns validation errors for malformed probe bodies and headers without upstream requests', async () => {
    let fetches = 0
    globalThis.fetch = (async () => {
      fetches++
      return new Response('unexpected')
    }) as typeof fetch
    const valid = { url: 'https://issuer.example/oauth/token', method: 'POST' }
    for (const payload of [
      null,
      [],
      5,
      { ...valid, headers: { Accept: 'invalid\nheader' } },
      { ...valid, body: 'é'.repeat(513) },
    ]) {
      const response = await worker.fetch(
        request('/api/oidc-preflight-probe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }),
        env
      )
      expect(response.status).toBe(400)
      expect((await response.json()).ok).toBe(false)
    }
    expect(fetches).toBe(0)
  })

  test('cancels the unused upstream probe body and returns its HTTP status', async () => {
    let canceled = false
    globalThis.fetch = (async (input: Request) => {
      expect(input.redirect).toBe('manual')
      expect(input.signal).toBeInstanceOf(AbortSignal)
      return new Response(
        new ReadableStream({
          cancel() {
            canceled = true
          },
        }),
        { status: 401 }
      )
    }) as typeof fetch
    const response = await worker.fetch(
      request('/api/oidc-preflight-probe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: 'https://issuer.example/oauth/token', method: 'POST' }),
      }),
      env
    )
    expect((await response.json()).status).toBe(401)
    expect(canceled).toBe(true)
  })

  test('reports expired, malformed, and not-yet-active signed tokens as inactive', async () => {
    const now = Math.floor(originalNow() / 1000)
    for (const claims of [
      { exp: 0 },
      { exp: now },
      { exp: 'tomorrow' },
      { nbf: now + 60 },
      { nbf: 'later' },
    ]) {
      const token = await signToken({ sub: 'audit-user', ...claims })
      const response = await worker.fetch(
        request('/api/introspect', {
          method: 'POST',
          body: new URLSearchParams({ token }),
        }),
        env
      )
      expect((await response.json()).active).toBe(false)
    }
    const active = await signToken({ sub: 'audit-user', exp: now + 60, nbf: now - 1 })
    const response = await worker.fetch(
      request('/api/introspect', {
        method: 'POST',
        body: new URLSearchParams({ token: active }),
      }),
      env
    )
    expect((await response.json()).active).toBe(true)
  })
})
