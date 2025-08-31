// Cloudflare Worker entry for IAM Tools
// Serves API routes and static assets (dist/) with SPA fallback

import { DEMO_JWKS } from './lib/jwt/demo-key'
import { CSP_INLINE_SCRIPT_SHA256 } from './csp-hashes'

type AssetsBinding = { fetch: (request: Request) => Promise<Response> }
interface Env {
  ASSETS: AssetsBinding
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    const { pathname } = url

    // CORS preflight for API
    if (request.method === 'OPTIONS' && pathname.startsWith('/api/')) {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(),
      })
    }

    // API routes
    if (pathname.startsWith('/api/')) {
      if (pathname.startsWith('/api/cors-proxy/')) {
        return handleCorsProxy(request)
      }
      if (pathname === '/api/.well-known/openid-configuration') {
        return handleOpenIdConfiguration(request)
      }
      if (pathname === '/api/jwks' || pathname === '/api/jwks/') {
        return json(DEMO_JWKS)
      }
    }

    // Default: serve static assets with SPA fallback, add security headers
    const assetResp = await env.ASSETS.fetch(request)
    return withSecurityHeaders(assetResp)
  },
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  }
}

function json(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body, null, 2), {
    headers: { 'Content-Type': 'application/json', ...corsHeaders() },
    ...init,
  })
}

async function handleOpenIdConfiguration(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const baseUrl = `${url.protocol}//${url.host}`
  const issuer = `${baseUrl}/api`
  const configuration = {
    issuer,
    jwks_uri: `${issuer}/jwks`,
    authorization_endpoint: `${issuer}/auth`,
    token_endpoint: `${issuer}/token`,
    userinfo_endpoint: `${issuer}/userinfo`,
    response_types_supported: [
      'code',
      'token',
      'id_token',
      'code token',
      'code id_token',
      'token id_token',
      'code token id_token',
    ],
    subject_types_supported: ['public'],
    id_token_signing_alg_values_supported: ['RS256'],
    scopes_supported: ['openid', 'profile', 'email', 'api'],
    token_endpoint_auth_methods_supported: ['client_secret_basic', 'client_secret_post'],
    claims_supported: [
      'sub',
      'name',
      'preferred_username',
      'given_name',
      'family_name',
      'email',
      'email_verified',
      'locale',
      'updated_at',
    ],
  }
  return json(configuration, { headers: { 'Cache-Control': 'public, max-age=86400' } })
}

async function handleCorsProxy(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const rest = url.pathname.replace('/api/cors-proxy/', '')
  if (!rest) return new Response('No URL provided', { status: 400 })

  try {
    const targetUrl = decodeURIComponent(rest)
    // Validate URL
    new URL(targetUrl)

    // Only allow well-known/JWKS-like endpoints; restrict to safe methods
    if (!isAllowedEndpoint(targetUrl)) {
      return new Response('This endpoint is not allowed', { status: 403 })
    }
    if (!['GET', 'HEAD'].includes(request.method)) {
      return new Response('Method not allowed', { status: 405 })
    }

    const forward = new Request(targetUrl, {
      method: request.method,
      headers: filterHeaders(request.headers),
    })

    const resp = await fetch(forward)
    const proxied = new Response(resp.body, resp)
    proxied.headers.set('Access-Control-Allow-Origin', '*')
    proxied.headers.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS')
    proxied.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    proxied.headers.set('Vary', 'Origin')
    return proxied
  } catch (e) {
    const message = (e as Error)?.message ?? 'Unknown error'
    return new Response(`Error proxying request: ${message}`, { status: 500 })
  }
}

function isAllowedEndpoint(urlStr: string): boolean {
  const parsed = new URL(urlStr)
  const isWellKnown = parsed.pathname.includes('/.well-known/')
  const up = parsed.pathname.toUpperCase()
  const isJwks =
    up.includes('/JWKS') ||
    up.includes('/JWK') ||
    parsed.pathname.includes('/keys') ||
    parsed.pathname.includes('/oauth2/v1/certs') ||
    (parsed.pathname.endsWith('.json') && up.includes('JWK'))
  return isWellKnown || isJwks
}

function filterHeaders(headers: Headers): Headers {
  const filtered = new Headers()
  for (const [k, v] of headers.entries()) {
    const key = k.toLowerCase()
    if (key.startsWith('cf-')) continue
    if (key.startsWith('cloudflare-')) continue
    if (key === 'host' || key === 'origin' || key === 'referer') continue
    filtered.set(k, v)
  }
  return filtered
}

function withSecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers)
  headers.set('Referrer-Policy', 'no-referrer')
  headers.set('X-Content-Type-Options', 'nosniff')
  headers.set('X-Frame-Options', 'DENY')
  headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()')
  const scriptDirectives = ["'self'"]
  if (CSP_INLINE_SCRIPT_SHA256 && CSP_INLINE_SCRIPT_SHA256.length > 0) {
    scriptDirectives.push(CSP_INLINE_SCRIPT_SHA256)
  } else {
    // Dev/unknown: allow inline to avoid blocking if hash missing
    scriptDirectives.push("'unsafe-inline'")
  }
  headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      `script-src ${scriptDirectives.join(' ')}`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data:",
      "font-src 'self' data:",
      "connect-src 'self' https:",
      "object-src 'none'",
      "base-uri 'self'",
      "frame-ancestors 'none'",
    ].join('; ')
  )
  return new Response(response.body, { ...response, headers })
}
