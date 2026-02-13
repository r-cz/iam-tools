import { proxyFetch } from '@/lib/proxy-fetch'
import type { OidcConfiguration } from '@/features/oidcExplorer/utils/types'

export type OidcEndpointName =
  | 'discovery'
  | 'authorization_endpoint'
  | 'token_endpoint'
  | 'userinfo_endpoint'
  | 'introspection_endpoint'
  | 'jwks_uri'

export type OidcDiscoveryEndpointName = Exclude<OidcEndpointName, 'discovery'>
export type OidcEndpointStatus = 'pass' | 'warn' | 'fail'

export interface OidcPreflightRequest {
  issuerUrl: string
  requiredEndpoints?: OidcEndpointName[]
  includeOptionalEndpoints?: boolean
  timeoutMs?: number
}

export interface OidcEndpointPreflightResult {
  endpoint: OidcEndpointName
  label: string
  method: 'GET' | 'HEAD' | 'POST'
  status: OidcEndpointStatus
  url?: string
  httpStatus?: number
  httpStatusText?: string
  message: string
  error?: string
}

export interface OidcPreflightReport {
  issuerUrl: string
  normalizedIssuerUrl: string
  discoveryUrl: string
  generatedAt: string
  summary: {
    pass: number
    warn: number
    fail: number
  }
  config?: OidcConfiguration
  endpoints: OidcEndpointPreflightResult[]
}

export interface OidcDiscoveredEndpoints {
  authorizationEndpoint?: string
  tokenEndpoint?: string
  userInfoEndpoint?: string
  introspectionEndpoint?: string
  jwksEndpoint?: string
}

interface OidcDiscoveryFetchResult {
  normalizedIssuerUrl: string
  discoveryUrl: string
  config: OidcConfiguration
  status: number
  statusText: string
}

const DEFAULT_REQUIRED_ENDPOINTS: OidcEndpointName[] = [
  'authorization_endpoint',
  'token_endpoint',
  'jwks_uri',
]

const DEFAULT_OPTIONAL_ENDPOINTS: OidcDiscoveryEndpointName[] = [
  'userinfo_endpoint',
  'introspection_endpoint',
]

const ENDPOINT_LABELS: Record<OidcEndpointName, string> = {
  discovery: 'Discovery document',
  authorization_endpoint: 'Authorization endpoint',
  token_endpoint: 'Token endpoint',
  userinfo_endpoint: 'UserInfo endpoint',
  introspection_endpoint: 'Introspection endpoint',
  jwks_uri: 'JWKS endpoint',
}

const ENDPOINT_METHODS: Record<OidcDiscoveryEndpointName, 'GET' | 'HEAD' | 'POST'> = {
  authorization_endpoint: 'HEAD',
  token_endpoint: 'POST',
  userinfo_endpoint: 'GET',
  introspection_endpoint: 'POST',
  jwks_uri: 'GET',
}

export function normalizeIssuerUrl(rawIssuerUrl: string): string {
  const trimmed = rawIssuerUrl.trim()
  if (!trimmed) {
    throw new Error('Issuer URL is required')
  }

  const withScheme = /^[a-zA-Z][a-zA-Z\d+.-]*:\/\//.test(trimmed) ? trimmed : `https://${trimmed}`

  const parsed = new URL(withScheme)
  parsed.search = ''
  parsed.hash = ''

  const normalizedPath = parsed.pathname.replace(/\/+$/, '')
  return `${parsed.protocol}//${parsed.host}${normalizedPath}`
}

export function buildOidcDiscoveryUrl(issuerUrl: string): string {
  const normalizedIssuerUrl = normalizeIssuerUrl(issuerUrl)
  const issuer = new URL(normalizedIssuerUrl)
  const basePath = issuer.pathname.endsWith('/') ? issuer.pathname : `${issuer.pathname}/`
  return new URL(`${basePath}.well-known/openid-configuration`, issuer.origin).toString()
}

export async function fetchOidcDiscoveryConfiguration(
  issuerUrl: string
): Promise<OidcDiscoveryFetchResult> {
  const normalizedIssuerUrl = normalizeIssuerUrl(issuerUrl)
  const discoveryUrl = buildOidcDiscoveryUrl(normalizedIssuerUrl)

  const response = await proxyFetch(discoveryUrl)
  if (!response.ok) {
    throw new Error(await buildResponseError(response, 'OIDC discovery failed'))
  }

  const rawBody = (await response.json()) as unknown
  if (!rawBody || typeof rawBody !== 'object') {
    throw new Error('OIDC discovery returned an invalid document')
  }

  return {
    normalizedIssuerUrl,
    discoveryUrl,
    config: rawBody as OidcConfiguration,
    status: response.status,
    statusText: response.statusText,
  }
}

export function extractDiscoveredEndpoints(
  config: Partial<OidcConfiguration>
): OidcDiscoveredEndpoints {
  return {
    authorizationEndpoint: getStringValue(config.authorization_endpoint),
    tokenEndpoint: getStringValue(config.token_endpoint),
    userInfoEndpoint: getStringValue(config.userinfo_endpoint),
    introspectionEndpoint: getStringValue(config.introspection_endpoint),
    jwksEndpoint: getStringValue(config.jwks_uri),
  }
}

export function hasUsableDiscoveredEndpoints(config: Partial<OidcConfiguration>): boolean {
  const endpoints = extractDiscoveredEndpoints(config)
  return Boolean(
    endpoints.authorizationEndpoint ||
    endpoints.tokenEndpoint ||
    endpoints.userInfoEndpoint ||
    endpoints.introspectionEndpoint ||
    endpoints.jwksEndpoint
  )
}

export async function runOidcEndpointPreflight(
  request: OidcPreflightRequest
): Promise<OidcPreflightReport> {
  const requiredEndpoints = request.requiredEndpoints?.length
    ? request.requiredEndpoints
    : DEFAULT_REQUIRED_ENDPOINTS
  const includeOptionalEndpoints = request.includeOptionalEndpoints ?? true
  const timeoutMs = request.timeoutMs ?? 8000

  const normalizedIssuerUrl = normalizeIssuerUrl(request.issuerUrl)
  const discoveryUrl = buildOidcDiscoveryUrl(normalizedIssuerUrl)
  const endpoints: OidcEndpointPreflightResult[] = []

  let discoveryResult: OidcDiscoveryFetchResult
  try {
    discoveryResult = await fetchOidcDiscoveryConfiguration(normalizedIssuerUrl)
    endpoints.push({
      endpoint: 'discovery',
      label: ENDPOINT_LABELS.discovery,
      method: 'GET',
      status: classifyStatus('discovery', discoveryResult.status),
      url: discoveryResult.discoveryUrl,
      httpStatus: discoveryResult.status,
      httpStatusText: discoveryResult.statusText,
      message: `Fetched discovery document (${discoveryResult.status})`,
    })
  } catch (error) {
    endpoints.push({
      endpoint: 'discovery',
      label: ENDPOINT_LABELS.discovery,
      method: 'GET',
      status: 'fail',
      url: discoveryUrl,
      message: 'Unable to fetch discovery document',
      error: error instanceof Error ? error.message : String(error),
    })

    return {
      issuerUrl: request.issuerUrl,
      normalizedIssuerUrl,
      discoveryUrl,
      generatedAt: new Date().toISOString(),
      summary: summarizeResults(endpoints),
      endpoints,
    }
  }

  const keysToCheck = resolveEndpointsToProbe(requiredEndpoints, includeOptionalEndpoints)

  const requiredSet = new Set(requiredEndpoints)

  for (const key of keysToCheck) {
    const endpointUrl = getStringValue(discoveryResult.config[key])
    if (!endpointUrl) {
      endpoints.push({
        endpoint: key,
        label: ENDPOINT_LABELS[key],
        method: ENDPOINT_METHODS[key],
        status: requiredSet.has(key) ? 'fail' : 'warn',
        message: requiredSet.has(key)
          ? `${ENDPOINT_LABELS[key]} is missing from discovery document`
          : `${ENDPOINT_LABELS[key]} is not published by this provider`,
      })
      continue
    }

    if (!isValidAbsoluteUrl(endpointUrl)) {
      endpoints.push({
        endpoint: key,
        label: ENDPOINT_LABELS[key],
        method: ENDPOINT_METHODS[key],
        status: requiredSet.has(key) ? 'fail' : 'warn',
        url: endpointUrl,
        message: `${ENDPOINT_LABELS[key]} is not a valid absolute URL`,
      })
      continue
    }

    const probeResult = await probeEndpoint({
      endpoint: key,
      url: endpointUrl,
      method: ENDPOINT_METHODS[key],
      timeoutMs,
    })

    endpoints.push(probeResult)
  }

  return {
    issuerUrl: request.issuerUrl,
    normalizedIssuerUrl,
    discoveryUrl,
    generatedAt: new Date().toISOString(),
    summary: summarizeResults(endpoints),
    config: discoveryResult.config,
    endpoints,
  }
}

function getStringValue(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

function isValidAbsoluteUrl(value: string): boolean {
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

function summarizeResults(results: OidcEndpointPreflightResult[]) {
  return results.reduce(
    (summary, result) => {
      summary[result.status] += 1
      return summary
    },
    { pass: 0, warn: 0, fail: 0 }
  )
}

async function buildResponseError(response: Response, prefix: string): Promise<string> {
  let details = ''
  try {
    const body = await response.clone().json()
    if (body && typeof body === 'object') {
      details = ` - ${JSON.stringify(body)}`
    }
  } catch {
    try {
      const text = await response.clone().text()
      if (text) {
        details = ` - ${text.slice(0, 160)}`
      }
    } catch {
      details = ''
    }
  }

  return `${prefix}: ${response.status} ${response.statusText}${details}`
}

async function probeEndpoint(input: {
  endpoint: OidcDiscoveryEndpointName
  url: string
  method: 'GET' | 'HEAD' | 'POST'
  timeoutMs: number
}): Promise<OidcEndpointPreflightResult> {
  const controller = new AbortController()
  const timeoutHandle = setTimeout(() => controller.abort(), input.timeoutMs)

  try {
    const requestInit = createProbeRequest(input.endpoint, input.method, controller.signal)
    const response = await proxyFetch(input.url, requestInit)

    return {
      endpoint: input.endpoint,
      label: ENDPOINT_LABELS[input.endpoint],
      method: input.method,
      status: classifyStatus(input.endpoint, response.status),
      url: input.url,
      httpStatus: response.status,
      httpStatusText: response.statusText,
      message: describeProbeResult(input.endpoint, response.status),
    }
  } catch (error) {
    return {
      endpoint: input.endpoint,
      label: ENDPOINT_LABELS[input.endpoint],
      method: input.method,
      status: classifyProbeError(error),
      url: input.url,
      message:
        classifyProbeError(error) === 'warn'
          ? 'Network/CORS prevented browser probe'
          : 'Probe failed',
      error: error instanceof Error ? error.message : String(error),
    }
  } finally {
    clearTimeout(timeoutHandle)
  }
}

function createProbeRequest(
  endpoint: OidcDiscoveryEndpointName,
  method: 'GET' | 'HEAD' | 'POST',
  signal: AbortSignal
): RequestInit {
  const headers: Record<string, string> = {
    Accept: 'application/json, text/plain, */*',
  }

  let body: string | undefined
  if (method === 'POST') {
    headers['Content-Type'] = 'application/x-www-form-urlencoded'
    if (endpoint === 'token_endpoint') {
      body = 'grant_type=client_credentials&client_id=oidc_preflight'
    } else if (endpoint === 'introspection_endpoint') {
      body = 'token=oidc_preflight'
    }
  }

  if (endpoint === 'userinfo_endpoint') {
    headers.Authorization = 'Bearer oidc-preflight-token'
  }

  return {
    method,
    headers,
    body,
    redirect: 'manual',
    signal,
  }
}

function resolveEndpointsToProbe(
  requiredEndpoints: OidcEndpointName[],
  includeOptionalEndpoints: boolean
): OidcDiscoveryEndpointName[] {
  const requiredDiscoveryEndpoints = requiredEndpoints.filter(
    (endpoint): endpoint is OidcDiscoveryEndpointName => endpoint !== 'discovery'
  )
  const discovered = new Set<OidcDiscoveryEndpointName>(requiredDiscoveryEndpoints)

  if (includeOptionalEndpoints) {
    for (const endpoint of DEFAULT_OPTIONAL_ENDPOINTS) {
      discovered.add(endpoint)
    }
  }

  for (const endpoint of ['authorization_endpoint', 'token_endpoint', 'jwks_uri'] as const) {
    discovered.add(endpoint)
  }

  return Array.from(discovered)
}

function classifyStatus(endpoint: OidcEndpointName, statusCode: number): OidcEndpointStatus {
  if (statusCode >= 200 && statusCode < 300) return 'pass'

  if (statusCode >= 300 && statusCode < 400) {
    return endpoint === 'authorization_endpoint' || endpoint === 'discovery' ? 'pass' : 'warn'
  }

  if ([400, 401, 403].includes(statusCode)) {
    return endpoint === 'discovery' ? 'warn' : 'pass'
  }

  if (statusCode === 405) return 'warn'
  if (statusCode >= 500) return 'fail'
  if (statusCode === 404 || statusCode === 410) return 'fail'

  return 'warn'
}

function describeProbeResult(endpoint: OidcEndpointName, statusCode: number): string {
  if (statusCode >= 200 && statusCode < 300) {
    return `${ENDPOINT_LABELS[endpoint]} is reachable`
  }

  if (statusCode >= 300 && statusCode < 400) {
    return `${ENDPOINT_LABELS[endpoint]} redirected (${statusCode})`
  }

  if ([400, 401, 403].includes(statusCode)) {
    return `${ENDPOINT_LABELS[endpoint]} is reachable and enforcing input/auth checks`
  }

  if (statusCode === 405) {
    return `${ENDPOINT_LABELS[endpoint]} rejected probe method but appears reachable`
  }

  if (statusCode >= 500) {
    return `${ENDPOINT_LABELS[endpoint]} returned a server error`
  }

  return `${ENDPOINT_LABELS[endpoint]} returned status ${statusCode}`
}

function classifyProbeError(error: unknown): OidcEndpointStatus {
  if (error instanceof DOMException && error.name === 'AbortError') {
    return 'warn'
  }

  if (error instanceof Error && error.message.toLowerCase().includes('failed to fetch')) {
    return 'warn'
  }

  return 'fail'
}
