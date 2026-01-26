// Cloudflare Worker entry for IAM Tools
// Serves API routes and static assets (dist/) with SPA fallback

import { DEMO_JWKS } from './lib/jwt/demo-key'
import { signToken } from './lib/jwt/sign-token'
import { CSP_INLINE_SCRIPT_SHA256 } from './csp-hashes'

type AssetsBinding = { fetch: (request: Request) => Promise<Response> }
interface Env {
  ASSETS: AssetsBinding
  CORS_ALLOWED_ORIGINS?: string
}

type RateLimitBucket = { count: number; resetAt: number }
type RateLimitConfig = { max: number; windowMs: number }

const rateLimitBuckets = new Map<string, RateLimitBucket>()
const CORS_PROXY_RATE_LIMIT: RateLimitConfig = { max: 60, windowMs: 60_000 }
const DEMO_RATE_LIMIT: RateLimitConfig = { max: 120, windowMs: 60_000 }

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    const { pathname } = url
    const normalizedPath = pathname.replace(/\/+$/, '')

    // CORS preflight for API
    if (request.method === 'OPTIONS' && normalizedPath.startsWith('/api')) {
      const corsBlock = enforceCorsAllowed(request, env)
      if (corsBlock) return corsBlock
      return new Response(null, {
        status: 204,
        headers: corsHeaders(request, env),
      })
    }

    // API routes
    if (normalizedPath.startsWith('/api')) {
      const corsBlock = enforceCorsAllowed(request, env)
      if (corsBlock) return corsBlock

      if (pathname.startsWith('/api/cors-proxy/')) {
        const rateLimited = enforceRateLimit(request, env, 'cors-proxy', CORS_PROXY_RATE_LIMIT)
        if (rateLimited) return rateLimited
        return handleCorsProxy(request, env)
      }

      if (isDemoEndpoint(normalizedPath)) {
        const rateLimited = enforceRateLimit(request, env, 'demo', DEMO_RATE_LIMIT)
        if (rateLimited) return rateLimited
      }

      if (normalizedPath === '/api/.well-known/openid-configuration') {
        return handleOpenIdConfiguration(request, env)
      }
      if (normalizedPath === '/api/jwks') {
        return json(DEMO_JWKS, undefined, request, env)
      }
      if (normalizedPath === '/api/auth') {
        return handleAuthorization(request, env)
      }
      if (normalizedPath === '/api/token') {
        return handleToken(request, env)
      }
      if (normalizedPath === '/api/token/generate') {
        return handleTokenGeneration(request, env)
      }
      if (normalizedPath === '/api/userinfo') {
        return handleUserInfo(request, env)
      }
      if (normalizedPath === '/api/introspect') {
        return handleIntrospection(request, env)
      }
      if (normalizedPath === '/api/revoke') {
        return handleTokenRevocation(request, env)
      }
    }

    // Default: serve static assets with SPA fallback, add security headers
    const assetResp = await env.ASSETS.fetch(request)
    return withSecurityHeaders(assetResp)
  },
}

function parseAllowedOrigins(env?: Env): string[] {
  const raw = env?.CORS_ALLOWED_ORIGINS
  if (!raw) return []
  return raw
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
}

function resolveCorsOrigin(request?: Request, env?: Env): string | null {
  const allowedOrigins = parseAllowedOrigins(env)
  const originHeader = request?.headers.get('Origin')

  if (request && originHeader && isLocalRequest(request)) {
    return originHeader
  }

  if (allowedOrigins.length === 0 || allowedOrigins.includes('*')) {
    return '*'
  }

  if (!originHeader) return null

  return allowedOrigins.includes(originHeader) ? originHeader : null
}

function enforceCorsAllowed(request: Request, env: Env): Response | null {
  const allowedOrigins = parseAllowedOrigins(env)
  if (allowedOrigins.length === 0 || allowedOrigins.includes('*')) return null
  if (isLocalRequest(request)) return null
  const origin = request.headers.get('Origin')
  if (!origin) return null
  if (allowedOrigins.includes(origin)) return null

  return new Response('Origin not allowed', {
    status: 403,
    headers: corsHeaders(request, env),
  })
}

function corsHeaders(request?: Request, env?: Env) {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS, POST',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  }

  const origin = resolveCorsOrigin(request, env)
  if (origin) {
    headers['Access-Control-Allow-Origin'] = origin
  }

  if (request?.headers.get('Origin')) {
    headers['Vary'] = 'Origin'
  }

  return headers
}

function json(body: unknown, init?: ResponseInit, request?: Request, env?: Env) {
  const headers = new Headers({
    'Content-Type': 'application/json',
    ...corsHeaders(request, env),
  })

  if (init?.headers) {
    const initHeaders = new Headers(init.headers)
    initHeaders.forEach((value, key) => {
      headers.set(key, value)
    })
  }

  return new Response(JSON.stringify(body, null, 2), {
    ...init,
    headers,
  })
}

const demoEndpoints = new Set([
  '/api/.well-known/openid-configuration',
  '/api/jwks',
  '/api/auth',
  '/api/token',
  '/api/token/generate',
  '/api/userinfo',
  '/api/introspect',
  '/api/revoke',
])

function isDemoEndpoint(pathname: string): boolean {
  return demoEndpoints.has(pathname)
}

function getClientId(request: Request): string {
  const cfConnectingIp =
    request.headers.get('CF-Connecting-IP') || request.headers.get('cf-connecting-ip')
  if (cfConnectingIp) return cfConnectingIp
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) return forwardedFor.split(',')[0]?.trim() || 'unknown'
  return 'unknown'
}

function isLocalHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1'
}

function isLocalRequest(request: Request): boolean {
  const url = new URL(request.url)
  if (isLocalHost(url.hostname)) return true

  const origin = request.headers.get('Origin')
  if (!origin) return false

  try {
    const originHost = new URL(origin).hostname
    return isLocalHost(originHost)
  } catch {
    return false
  }
}

function enforceRateLimit(
  request: Request,
  env: Env,
  bucket: string,
  config: RateLimitConfig
): Response | null {
  if (isLocalRequest(request)) return null

  const clientId = getClientId(request)
  const key = `${bucket}:${clientId}`
  const now = Date.now()
  const current = rateLimitBuckets.get(key)

  if (!current || now > current.resetAt) {
    rateLimitBuckets.set(key, { count: 1, resetAt: now + config.windowMs })
    return null
  }

  if (current.count >= config.max) {
    const retryAfterSeconds = Math.max(1, Math.ceil((current.resetAt - now) / 1000))
    const headers = new Headers({
      ...corsHeaders(request, env),
      'Retry-After': String(retryAfterSeconds),
    })
    return new Response('Too many requests', { status: 429, headers })
  }

  current.count += 1
  return null
}

async function handleOpenIdConfiguration(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url)
  const baseUrl = `${url.protocol}//${url.host}`
  const issuer = `${baseUrl}/api`
  const configuration = {
    issuer,
    jwks_uri: `${issuer}/jwks`,
    authorization_endpoint: `${issuer}/auth`,
    token_endpoint: `${issuer}/token`,
    userinfo_endpoint: `${issuer}/userinfo`,
    introspection_endpoint: `${issuer}/introspect`,
    revocation_endpoint: `${issuer}/revoke`,
    response_types_supported: ['code'],
    response_modes_supported: ['query'],
    grant_types_supported: ['authorization_code', 'refresh_token', 'client_credentials'],
    code_challenge_methods_supported: ['S256'],
    subject_types_supported: ['public'],
    id_token_signing_alg_values_supported: ['RS256'],
    scopes_supported: ['openid', 'profile', 'email', 'offline_access', 'api'],
    token_endpoint_auth_methods_supported: ['none', 'client_secret_basic', 'client_secret_post'],
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
      'roles',
    ],
    claims_parameter_supported: true,
  }
  return json(
    configuration,
    { headers: { 'Cache-Control': 'public, max-age=86400' } },
    request,
    env
  )
}

const ACCESS_TOKEN_TTL = 60 * 60
const AUTH_CODE_TTL = 5 * 60
const REFRESH_TOKEN_TTL = 60 * 60 * 24 * 30
const DEFAULT_OPENID_SCOPE = 'openid profile email'
const DEFAULT_API_SCOPE = 'api'

type AuthCodePayload = {
  client_id: string
  redirect_uri: string
  scope?: string
  code_challenge?: string
  code_challenge_method?: string
  nonce?: string
  sub: string
  issued_at: number
  exp: number
}

type RefreshTokenPayload = {
  client_id: string
  sub: string
  scope?: string
  issued_at: number
  exp: number
}

async function handleAuthorization(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'GET') {
    return oauthError(
      'invalid_request',
      'Authorization endpoint only supports GET',
      request,
      env,
      405
    )
  }

  const url = new URL(request.url)
  const params = url.searchParams
  const responseType = params.get('response_type')
  const clientId = params.get('client_id')
  const redirectUri = params.get('redirect_uri')
  const state = params.get('state')
  const scope = params.get('scope')?.trim() || DEFAULT_OPENID_SCOPE
  const codeChallenge = params.get('code_challenge') || undefined
  const codeChallengeMethod = params.get('code_challenge_method') || undefined
  const nonce = params.get('nonce') || undefined

  if (!clientId || !redirectUri) {
    return buildAuthorizationError(
      {
        redirectUri,
        state,
        error: 'invalid_request',
        description: 'client_id and redirect_uri are required',
      },
      request,
      env
    )
  }

  try {
    new URL(redirectUri)
  } catch {
    return buildAuthorizationError(
      {
        redirectUri: null,
        state,
        error: 'invalid_request',
        description: 'redirect_uri is invalid',
      },
      request,
      env
    )
  }

  if (responseType !== 'code') {
    return buildAuthorizationError(
      {
        redirectUri,
        state,
        error: 'unsupported_response_type',
        description: 'Only response_type=code is supported',
      },
      request,
      env
    )
  }

  if (codeChallengeMethod && codeChallengeMethod !== 'S256') {
    return buildAuthorizationError(
      {
        redirectUri,
        state,
        error: 'invalid_request',
        description: 'Only code_challenge_method=S256 is supported',
      },
      request,
      env
    )
  }

  const now = Math.floor(Date.now() / 1000)
  const payload: AuthCodePayload = {
    client_id: clientId,
    redirect_uri: redirectUri,
    scope,
    code_challenge: codeChallenge,
    code_challenge_method: codeChallengeMethod,
    nonce,
    sub: 'demo-user',
    issued_at: now,
    exp: now + AUTH_CODE_TTL,
  }

  const code = encodeAuthCode(payload)
  const redirect = new URL(redirectUri)
  redirect.searchParams.set('code', code)
  if (state) {
    redirect.searchParams.set('state', state)
  }

  return Response.redirect(redirect.toString(), 302)
}

async function handleToken(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') {
    return oauthError('invalid_request', 'Token endpoint only supports POST', request, env, 405)
  }

  const params = await parseRequestBody(request)
  const grantType = getString(params, 'grant_type')
  if (!grantType) {
    return oauthError('invalid_request', 'grant_type is required', request, env)
  }

  const { clientId } = parseClientCredentials(params, request.headers)
  if (!clientId) {
    return oauthError('invalid_client', 'client_id is required', request, env)
  }

  const issuer = getIssuer(request)
  const customClaims = sanitizeCustomClaims(parseCustomClaims(params.claims))

  if (grantType === 'authorization_code') {
    const code = getString(params, 'code')
    const redirectUri = getString(params, 'redirect_uri')
    const codeVerifier = getString(params, 'code_verifier')

    if (!code || !redirectUri) {
      return oauthError('invalid_request', 'code and redirect_uri are required', request, env)
    }

    const authCode = decodeAuthCode(code)
    if (!authCode) {
      return oauthError('invalid_grant', 'Authorization code is invalid', request, env)
    }

    const now = Math.floor(Date.now() / 1000)
    if (authCode.exp && authCode.exp < now) {
      return oauthError('invalid_grant', 'Authorization code has expired', request, env)
    }

    if (authCode.client_id !== clientId) {
      return oauthError(
        'invalid_grant',
        'Authorization code was issued to a different client',
        request,
        env
      )
    }

    if (authCode.redirect_uri !== redirectUri) {
      return oauthError('invalid_grant', 'redirect_uri mismatch', request, env)
    }

    if (authCode.code_challenge) {
      if (!codeVerifier) {
        return oauthError(
          'invalid_request',
          'code_verifier is required for this authorization code',
          request,
          env
        )
      }
      const expected = await computeCodeChallenge(codeVerifier)
      if (expected !== authCode.code_challenge) {
        return oauthError('invalid_grant', 'code_verifier is invalid', request, env)
      }
    }

    const resolvedScope = normalizeScope(
      getString(params, 'scope') || authCode.scope || DEFAULT_OPENID_SCOPE
    )
    const scopeList = splitScopes(resolvedScope)
    const tokenResponse = await issueTokenResponse({
      issuer,
      clientId,
      subject: authCode.sub,
      scope: resolvedScope,
      includeIdToken: scopeList.includes('openid'),
      includeRefreshToken: scopeList.includes('offline_access'),
      nonce: authCode.nonce,
      customClaims,
    })

    return oauthJson(tokenResponse, undefined, request, env)
  }

  if (grantType === 'refresh_token') {
    const refreshToken = getString(params, 'refresh_token')
    if (!refreshToken) {
      return oauthError('invalid_request', 'refresh_token is required', request, env)
    }

    const refreshPayload = decodeRefreshToken(refreshToken)
    if (!refreshPayload) {
      return oauthError('invalid_grant', 'refresh_token is invalid', request, env)
    }

    const now = Math.floor(Date.now() / 1000)
    if (refreshPayload.exp && refreshPayload.exp < now) {
      return oauthError('invalid_grant', 'refresh_token has expired', request, env)
    }

    if (refreshPayload.client_id !== clientId) {
      return oauthError(
        'invalid_grant',
        'refresh_token was issued to a different client',
        request,
        env
      )
    }

    const resolvedScope = normalizeScope(
      getString(params, 'scope') || refreshPayload.scope || DEFAULT_OPENID_SCOPE
    )
    const scopeList = splitScopes(resolvedScope)
    const tokenResponse = await issueTokenResponse({
      issuer,
      clientId,
      subject: refreshPayload.sub,
      scope: resolvedScope,
      includeIdToken: scopeList.includes('openid'),
      includeRefreshToken: scopeList.includes('offline_access'),
      customClaims,
    })

    return oauthJson(tokenResponse, undefined, request, env)
  }

  if (grantType === 'client_credentials') {
    const resolvedScope = normalizeScope(getString(params, 'scope') || DEFAULT_API_SCOPE)
    const tokenResponse = await issueTokenResponse({
      issuer,
      clientId,
      subject: clientId,
      scope: resolvedScope,
      includeIdToken: false,
      includeRefreshToken: false,
      customClaims,
    })

    return oauthJson(tokenResponse, undefined, request, env)
  }

  return oauthError('unsupported_grant_type', `Unsupported grant_type: ${grantType}`, request, env)
}

async function handleTokenGeneration(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') {
    return oauthError(
      'invalid_request',
      'Token generation endpoint only supports POST',
      request,
      env,
      405
    )
  }

  const params = await parseRequestBody(request)
  const subject = getString(params, 'subject') || 'demo-user'
  const audience = getString(params, 'audience') || getString(params, 'client_id') || 'iam-tools'
  const scope = normalizeScope(getString(params, 'scope') || DEFAULT_OPENID_SCOPE)
  const expiresIn = Number(getString(params, 'expires_in'))
  const ttl = Number.isFinite(expiresIn) && expiresIn > 0 ? expiresIn : ACCESS_TOKEN_TTL
  const issuer = getIssuer(request)
  const customClaims = sanitizeCustomClaims(parseCustomClaims(params.claims))
  const now = Math.floor(Date.now() / 1000)

  const payload = {
    iss: issuer,
    sub: subject,
    aud: audience,
    iat: now,
    exp: now + ttl,
    scope,
    ...customClaims,
  }

  const token = await signToken(payload)
  return oauthJson(
    {
      access_token: token,
      token_type: 'Bearer',
      expires_in: ttl,
      scope,
    },
    undefined,
    request,
    env
  )
}

async function handleUserInfo(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'GET') {
    return oauthError('invalid_request', 'UserInfo endpoint only supports GET', request, env, 405)
  }

  const token = extractBearerToken(request.headers)
  if (!token) {
    return oauthError('invalid_token', 'Missing bearer token', request, env, 401)
  }

  const payload = decodeJwtPayload(token)
  if (!payload) {
    return oauthError('invalid_token', 'Token is not a valid JWT', request, env, 401)
  }

  if (!isTokenActive(payload)) {
    return oauthError('invalid_token', 'Token has expired', request, env, 401)
  }

  return oauthJson(buildUserInfoResponse(payload), undefined, request, env)
}

async function handleIntrospection(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') {
    return oauthError(
      'invalid_request',
      'Introspection endpoint only supports POST',
      request,
      env,
      405
    )
  }

  const params = await parseRequestBody(request)
  const token = getString(params, 'token')
  if (!token) {
    return oauthError('invalid_request', 'token is required', request, env)
  }

  const jwtPayload = decodeJwtPayload(token)
  const refreshPayload = jwtPayload ? null : decodeRefreshToken(token)
  const payload = (jwtPayload || refreshPayload) as Record<string, unknown>

  if (!payload) {
    return oauthJson({ active: false }, undefined, request, env)
  }

  const active = isTokenActive(payload)

  return oauthJson(
    {
      active,
      scope: typeof payload.scope === 'string' ? payload.scope : undefined,
      client_id: typeof payload.client_id === 'string' ? payload.client_id : undefined,
      username: typeof payload.sub === 'string' ? payload.sub : undefined,
      token_type: jwtPayload ? 'Bearer' : 'refresh_token',
      exp: typeof payload.exp === 'number' ? payload.exp : undefined,
      iat: typeof payload.iat === 'number' ? payload.iat : undefined,
      nbf: typeof payload.nbf === 'number' ? payload.nbf : undefined,
      sub: typeof payload.sub === 'string' ? payload.sub : undefined,
      aud: payload.aud,
      iss: typeof payload.iss === 'string' ? payload.iss : undefined,
      jti: typeof payload.jti === 'string' ? payload.jti : undefined,
    },
    undefined,
    request,
    env
  )
}

async function handleTokenRevocation(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') {
    return oauthError(
      'invalid_request',
      'Revocation endpoint only supports POST',
      request,
      env,
      405
    )
  }

  return new Response(null, { status: 200, headers: corsHeaders(request, env) })
}

function buildAuthorizationError(
  opts: {
    redirectUri: string | null | undefined
    state?: string | null
    error: string
    description: string
  },
  request: Request,
  env: Env
): Response {
  if (opts.redirectUri) {
    try {
      const redirect = new URL(opts.redirectUri)
      redirect.searchParams.set('error', opts.error)
      redirect.searchParams.set('error_description', opts.description)
      if (opts.state) {
        redirect.searchParams.set('state', opts.state)
      }
      return Response.redirect(redirect.toString(), 302)
    } catch {
      // fall through to JSON error
    }
  }

  return oauthError(opts.error, opts.description, request, env)
}

function oauthJson(
  body: Record<string, unknown>,
  init: ResponseInit | undefined,
  request: Request,
  env: Env
): Response {
  return json(
    body,
    {
      ...init,
      headers: {
        'Cache-Control': 'no-store',
        Pragma: 'no-cache',
        ...(init?.headers ?? {}),
      },
    },
    request,
    env
  )
}

function oauthError(
  code: string,
  description: string,
  request: Request,
  env: Env,
  status = 400
): Response {
  return oauthJson(
    {
      error: code,
      error_description: description,
    },
    { status },
    request,
    env
  )
}

async function issueTokenResponse(opts: {
  issuer: string
  clientId: string
  subject: string
  scope: string
  includeIdToken: boolean
  includeRefreshToken: boolean
  nonce?: string
  customClaims?: Record<string, unknown>
}): Promise<Record<string, unknown>> {
  const now = Math.floor(Date.now() / 1000)
  const claims = sanitizeCustomClaims(opts.customClaims)

  const accessTokenPayload = {
    iss: opts.issuer,
    sub: opts.subject,
    aud: opts.clientId,
    iat: now,
    exp: now + ACCESS_TOKEN_TTL,
    scope: opts.scope,
    client_id: opts.clientId,
    token_use: 'access_token',
    ...claims,
  }

  const accessToken = await signToken(accessTokenPayload)
  const response: Record<string, unknown> = {
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: ACCESS_TOKEN_TTL,
    scope: opts.scope,
  }

  if (opts.includeIdToken) {
    const idTokenPayload = {
      iss: opts.issuer,
      sub: opts.subject,
      aud: opts.clientId,
      iat: now,
      exp: now + ACCESS_TOKEN_TTL,
      auth_time: now,
      ...(opts.nonce ? { nonce: opts.nonce } : {}),
      ...claims,
    }
    response.id_token = await signToken(idTokenPayload)
  }

  if (opts.includeRefreshToken) {
    response.refresh_token = encodeRefreshToken({
      client_id: opts.clientId,
      sub: opts.subject,
      scope: opts.scope,
      issued_at: now,
      exp: now + REFRESH_TOKEN_TTL,
    })
  }

  return response
}

function normalizeScope(scope: string): string {
  const cleaned = scope
    .split(/\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
  if (cleaned.length === 0) {
    return DEFAULT_OPENID_SCOPE
  }
  return cleaned.join(' ')
}

function splitScopes(scope: string): string[] {
  return scope.split(/\s+/).filter(Boolean)
}

function encodeAuthCode(payload: AuthCodePayload): string {
  return encodeJson(payload)
}

function decodeAuthCode(value: string): AuthCodePayload | null {
  return decodeJson<AuthCodePayload>(value)
}

function encodeRefreshToken(payload: RefreshTokenPayload): string {
  return `rt_${encodeJson(payload)}`
}

function decodeRefreshToken(token: string): RefreshTokenPayload | null {
  const raw = token.startsWith('rt_') ? token.slice(3) : token
  return decodeJson<RefreshTokenPayload>(raw)
}

function extractBearerToken(headers: Headers): string | null {
  const authHeader = headers.get('Authorization') || headers.get('authorization')
  if (!authHeader) return null
  const [scheme, credentials] = authHeader.split(' ')
  if (!scheme || scheme.toLowerCase() !== 'bearer' || !credentials) return null
  return credentials.trim()
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split('.')
  if (parts.length < 2) return null
  return decodeJson<Record<string, unknown>>(parts[1])
}

function isTokenActive(payload: Record<string, unknown>): boolean {
  const exp = typeof payload.exp === 'number' ? payload.exp : undefined
  if (!exp) return true
  const now = Math.floor(Date.now() / 1000)
  return exp > now
}

const RESERVED_CLAIMS = new Set([
  'iss',
  'sub',
  'aud',
  'exp',
  'iat',
  'nbf',
  'jti',
  'nonce',
  'scope',
  'client_id',
  'token_use',
  'auth_time',
])

const USERINFO_EXCLUDED_CLAIMS = new Set([
  'iss',
  'aud',
  'exp',
  'iat',
  'nbf',
  'jti',
  'client_id',
  'token_use',
  'scope',
])

function buildUserInfoResponse(payload: Record<string, unknown>): Record<string, unknown> {
  const response: Record<string, unknown> = {
    sub: typeof payload.sub === 'string' ? payload.sub : 'demo-user',
  }

  for (const [key, value] of Object.entries(payload)) {
    if (USERINFO_EXCLUDED_CLAIMS.has(key)) continue
    if (value === undefined || value === null) continue
    response[key] = value
  }

  return response
}

function parseCustomClaims(input: unknown): Record<string, unknown> {
  if (!input) return {}
  if (typeof input === 'string') {
    try {
      const parsed = JSON.parse(input)
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>
      }
    } catch {
      return {}
    }
  }
  if (typeof input === 'object' && !Array.isArray(input)) {
    return input as Record<string, unknown>
  }
  return {}
}

function sanitizeCustomClaims(input?: Record<string, unknown>): Record<string, unknown> {
  if (!input) return {}
  return Object.fromEntries(Object.entries(input).filter(([key]) => !RESERVED_CLAIMS.has(key)))
}

function parseClientCredentials(
  params: Record<string, unknown>,
  headers: Headers
): {
  clientId?: string
  clientSecret?: string
} {
  const basic = parseBasicAuth(headers)
  const clientId = getString(params, 'client_id') || basic.clientId
  const clientSecret = getString(params, 'client_secret') || basic.clientSecret
  return { clientId, clientSecret }
}

function parseBasicAuth(headers: Headers): { clientId?: string; clientSecret?: string } {
  const authHeader = headers.get('Authorization') || headers.get('authorization')
  if (!authHeader || !authHeader.toLowerCase().startsWith('basic ')) return {}
  const encoded = authHeader.slice(6).trim()
  try {
    const decoded = atob(encoded)
    const [clientId, clientSecret] = decoded.split(':')
    return { clientId, clientSecret }
  } catch {
    return {}
  }
}

async function parseRequestBody(request: Request): Promise<Record<string, unknown>> {
  const contentType = request.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    const parsed = await request.json().catch(() => ({}))
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>
    }
    return {}
  }

  const text = await request.text()
  if (!text) return {}
  return Object.fromEntries(new URLSearchParams(text).entries())
}

function getString(params: Record<string, unknown>, key: string): string | undefined {
  const value = params[key]
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return undefined
}

function getIssuer(request: Request): string {
  const url = new URL(request.url)
  return `${url.protocol}//${url.host}/api`
}

function encodeJson(value: unknown): string {
  const json = JSON.stringify(value)
  return base64UrlEncode(new TextEncoder().encode(json))
}

function decodeJson<T>(value: string): T | null {
  try {
    const raw = base64UrlDecode(value)
    const json = new TextDecoder().decode(raw)
    return JSON.parse(json) as T
  } catch {
    return null
  }
}

function base64UrlEncode(data: Uint8Array): string {
  const encoded = btoa(String.fromCharCode(...data))
  return encoded.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function base64UrlDecode(value: string): Uint8Array {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
  const binary = atob(padded)
  return Uint8Array.from(binary, (c) => c.charCodeAt(0))
}

async function computeCodeChallenge(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return base64UrlEncode(new Uint8Array(digest))
}

async function handleCorsProxy(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url)
  const rest = url.pathname.replace('/api/cors-proxy/', '')
  if (!rest) {
    return new Response('No URL provided', { status: 400, headers: corsHeaders(request, env) })
  }

  try {
    const targetUrl = decodeURIComponent(rest)
    // Validate URL
    new URL(targetUrl)

    // Only allow well-known/JWKS-like endpoints; restrict to safe methods
    if (!isAllowedEndpoint(targetUrl)) {
      return new Response('This endpoint is not allowed', {
        status: 403,
        headers: corsHeaders(request, env),
      })
    }
    if (!['GET', 'HEAD'].includes(request.method)) {
      return new Response('Method not allowed', { status: 405, headers: corsHeaders(request, env) })
    }

    const forward = new Request(targetUrl, {
      method: request.method,
      headers: filterHeaders(request.headers),
    })

    const resp = await fetch(forward)
    const headers = new Headers(resp.headers)
    const proxyCorsHeaders = corsHeaders(request, env)
    for (const [key, value] of Object.entries(proxyCorsHeaders)) {
      headers.set(key, value)
    }
    headers.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS')

    return new Response(resp.body, {
      status: resp.status,
      statusText: resp.statusText,
      headers,
    })
  } catch (e) {
    const message = (e as Error)?.message ?? 'Unknown error'
    return new Response(`Error proxying request: ${message}`, {
      status: 500,
      headers: corsHeaders(request, env),
    })
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

  // Allow SAML metadata (commonly XML) with safe path patterns
  const lower = parsed.pathname.toLowerCase()
  const isSamlMeta =
    lower.endsWith('/federationmetadata/2007-06/federationmetadata.xml') ||
    lower.includes('/saml/metadata') ||
    (lower.endsWith('.xml') && (lower.includes('saml') || lower.includes('metadata')))

  return isWellKnown || isJwks || isSamlMeta
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
