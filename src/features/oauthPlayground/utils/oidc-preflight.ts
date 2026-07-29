import { proxyFetch } from '@/lib/proxy-fetch'
import type { OidcConfiguration } from '@/features/oidcExplorer/utils/types'

export type OidcFetchFunction = (url: string, options?: RequestInit) => Promise<Response>

export type OidcEndpointName =
  | 'discovery'
  | 'authorization_endpoint'
  | 'token_endpoint'
  | 'userinfo_endpoint'
  | 'introspection_endpoint'
  | 'jwks_uri'

export type OidcDiscoveryEndpointName = Exclude<OidcEndpointName, 'discovery'>
export type OidcEndpointStatus = 'pass' | 'warn' | 'fail'
export type OidcPreflightReasonCode =
  | 'reachable'
  | 'auth_required'
  | 'method_not_allowed'
  | 'network_or_cors'
  | 'missing_or_unavailable'
  | 'server_error'
  | 'invalid_url'
  | 'unsafe_target'

export interface OidcPreflightRequest {
  issuerUrl: string
  requiredEndpoints?: OidcEndpointName[]
  includeOptionalEndpoints?: boolean
  timeoutMs?: number
  enableServerAssistedProbes?: boolean
  endpointProbeFetcher?: OidcFetchFunction
  serverAssistedProbeFetcher?: OidcFetchFunction
}

export interface OidcDiscoveryFetchOptions {
  timeoutMs?: number
  signal?: AbortSignal
}

export interface OidcEndpointPreflightResult {
  endpoint: OidcEndpointName
  label: string
  method: 'GET' | 'HEAD' | 'POST'
  status: OidcEndpointStatus
  required: boolean
  reasonCode: OidcPreflightReasonCode
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

const SERVER_ASSISTED_PROBE_PATH = '/api/oidc-preflight-probe'
const DEFAULT_PREFLIGHT_TIMEOUT_MS = 8000
const MAX_PREFLIGHT_TIMEOUT_MS = 30_000
const defaultDirectEndpointFetcher: OidcFetchFunction = (url, options) => fetch(url, options)
const defaultServerAssistedProbeFetcher: OidcFetchFunction = (url, options) => fetch(url, options)

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
  issuerUrl: string,
  fetcher: OidcFetchFunction = proxyFetch,
  options: OidcDiscoveryFetchOptions = {}
): Promise<OidcDiscoveryFetchResult> {
  const normalizedIssuerUrl = normalizeIssuerUrl(issuerUrl)
  const discoveryUrl = buildOidcDiscoveryUrl(normalizedIssuerUrl)
  const timeoutMs = normalizeTimeoutMs(options.timeoutMs)

  return runDiscoveryOperationWithTimeout(
    async (signal) => {
      const response = await fetcher(discoveryUrl, { signal })
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
    },
    timeoutMs,
    options.signal
  )
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
  request: OidcPreflightRequest,
  fetcher: OidcFetchFunction = proxyFetch
): Promise<OidcPreflightReport> {
  const requiredEndpoints = request.requiredEndpoints?.length
    ? request.requiredEndpoints
    : DEFAULT_REQUIRED_ENDPOINTS
  const includeOptionalEndpoints = request.includeOptionalEndpoints ?? true
  const timeoutMs = normalizeTimeoutMs(request.timeoutMs)
  const enableServerAssistedProbes = request.enableServerAssistedProbes ?? fetcher === proxyFetch
  const endpointProbeFetcher =
    request.endpointProbeFetcher ??
    (fetcher === proxyFetch ? defaultDirectEndpointFetcher : fetcher)
  const serverAssistedProbeFetcher =
    request.serverAssistedProbeFetcher ?? defaultServerAssistedProbeFetcher

  const normalizedIssuerUrl = normalizeIssuerUrl(request.issuerUrl)
  const normalizedIssuerOrigin = new URL(normalizedIssuerUrl).origin
  const discoveryUrl = buildOidcDiscoveryUrl(normalizedIssuerUrl)
  const endpoints: OidcEndpointPreflightResult[] = []
  const requiredSet = new Set<OidcEndpointName>(['discovery', ...requiredEndpoints])

  let discoveryResult: OidcDiscoveryFetchResult
  try {
    discoveryResult = await fetchOidcDiscoveryConfiguration(normalizedIssuerUrl, fetcher, {
      timeoutMs,
    })
    endpoints.push({
      endpoint: 'discovery',
      label: ENDPOINT_LABELS.discovery,
      method: 'GET',
      status: 'pass',
      required: true,
      reasonCode: 'reachable',
      url: discoveryResult.discoveryUrl,
      httpStatus: discoveryResult.status,
      httpStatusText: discoveryResult.statusText,
      message: `Discovery document resolved (${discoveryResult.status})`,
    })
  } catch (error) {
    const networkUnavailable = isNetworkOrCorsError(error)
    endpoints.push({
      endpoint: 'discovery',
      label: ENDPOINT_LABELS.discovery,
      method: 'GET',
      status: 'fail',
      required: true,
      reasonCode: networkUnavailable ? 'network_or_cors' : 'missing_or_unavailable',
      url: discoveryUrl,
      message: networkUnavailable
        ? 'Discovery document could not be reached'
        : 'Discovery document is unavailable',
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

  const endpointProbeResults = await Promise.all(
    keysToCheck.map(async (key) => {
      const endpointRequired = requiredSet.has(key)
      const endpointUrl = getStringValue(discoveryResult.config[key])
      if (!endpointUrl) {
        return {
          endpoint: key,
          label: ENDPOINT_LABELS[key],
          method: ENDPOINT_METHODS[key],
          status: endpointRequired ? 'fail' : 'warn',
          required: endpointRequired,
          reasonCode: 'missing_or_unavailable',
          message: endpointRequired
            ? `${ENDPOINT_LABELS[key]} is required but missing in discovery`
            : 'Optional endpoint unavailable',
        } satisfies OidcEndpointPreflightResult
      }

      const targetAssessment = assessDiscoveredEndpointTarget(endpointUrl, normalizedIssuerOrigin)
      if (!targetAssessment.allowed) {
        const invalidUrl =
          targetAssessment.reason === 'invalid_url' ||
          targetAssessment.reason === 'unsupported_protocol'
        return {
          endpoint: key,
          label: ENDPOINT_LABELS[key],
          method: ENDPOINT_METHODS[key],
          status: invalidUrl && endpointRequired ? 'fail' : 'warn',
          required: endpointRequired,
          reasonCode: invalidUrl ? 'invalid_url' : 'unsafe_target',
          url: endpointUrl,
          message: invalidUrl
            ? endpointRequired
              ? `${ENDPOINT_LABELS[key]} is required but has an invalid URL`
              : `${ENDPOINT_LABELS[key]} has an invalid URL`
            : targetAssessment.reason === 'embedded_credentials'
              ? 'Probe blocked because discovery advertised an endpoint URL with embedded credentials'
              : 'Probe blocked because discovery advertised an endpoint outside the issuer origin',
        } satisfies OidcEndpointPreflightResult
      }

      return probeEndpoint({
        endpoint: key,
        required: endpointRequired,
        url: endpointUrl,
        method: ENDPOINT_METHODS[key],
        timeoutMs,
        fetcher: endpointProbeFetcher,
        enableServerAssistedProbes,
        serverAssistedProbeFetcher,
      })
    })
  )

  endpoints.push(...endpointProbeResults)

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

type DiscoveredEndpointTargetAssessment =
  | { allowed: true; url: URL }
  | {
      allowed: false
      reason: 'invalid_url' | 'unsupported_protocol' | 'embedded_credentials' | 'cross_origin'
    }

function assessDiscoveredEndpointTarget(
  value: string,
  authorizedIssuerOrigin: string
): DiscoveredEndpointTargetAssessment {
  let endpoint: URL
  try {
    endpoint = new URL(value)
  } catch {
    return { allowed: false, reason: 'invalid_url' }
  }

  if (endpoint.protocol !== 'http:' && endpoint.protocol !== 'https:') {
    return { allowed: false, reason: 'unsupported_protocol' }
  }

  if (endpoint.username || endpoint.password) {
    return { allowed: false, reason: 'embedded_credentials' }
  }

  if (endpoint.origin !== authorizedIssuerOrigin) {
    return { allowed: false, reason: 'cross_origin' }
  }

  return { allowed: true, url: endpoint }
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

async function runDiscoveryOperationWithTimeout<T>(
  operation: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number,
  externalSignal?: AbortSignal
): Promise<T> {
  if (externalSignal?.aborted) {
    throw createAbortError()
  }

  const controller = new AbortController()
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined
  let externalAbortHandler: (() => void) | undefined

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      controller.abort()
      const timeoutError = new Error(`OIDC discovery timed out after ${timeoutMs}ms`)
      timeoutError.name = 'TimeoutError'
      reject(timeoutError)
    }, timeoutMs)
  })

  const pending: Array<Promise<T> | Promise<never>> = [
    Promise.resolve().then(() => operation(controller.signal)),
    timeoutPromise,
  ]

  if (externalSignal) {
    pending.push(
      new Promise<never>((_, reject) => {
        externalAbortHandler = () => {
          controller.abort()
          reject(createAbortError())
        }
        if (externalSignal.aborted) {
          externalAbortHandler()
        } else {
          externalSignal.addEventListener('abort', externalAbortHandler, { once: true })
        }
      })
    )
  }

  try {
    return await Promise.race(pending)
  } finally {
    if (timeoutHandle !== undefined) {
      clearTimeout(timeoutHandle)
    }
    if (externalSignal && externalAbortHandler) {
      externalSignal.removeEventListener('abort', externalAbortHandler)
    }
  }
}

function normalizeTimeoutMs(value?: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return DEFAULT_PREFLIGHT_TIMEOUT_MS
  }

  return Math.min(MAX_PREFLIGHT_TIMEOUT_MS, Math.max(1, Math.floor(value)))
}

function createAbortError(): Error {
  const error = new Error('OIDC discovery request was cancelled')
  error.name = 'AbortError'
  return error
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
  required: boolean
  url: string
  method: 'GET' | 'HEAD' | 'POST'
  timeoutMs: number
  fetcher: OidcFetchFunction
  enableServerAssistedProbes: boolean
  serverAssistedProbeFetcher: OidcFetchFunction
}): Promise<OidcEndpointPreflightResult> {
  const controller = new AbortController()
  const timeoutHandle = setTimeout(() => controller.abort(), input.timeoutMs)

  try {
    const requestInit = createProbeRequest(input.endpoint, input.method, controller.signal)
    const response = await input.fetcher(input.url, requestInit)
    const classification = classifyProbeResponse(input.endpoint, response.status, input.required)

    return {
      endpoint: input.endpoint,
      label: ENDPOINT_LABELS[input.endpoint],
      method: input.method,
      status: classification.status,
      required: input.required,
      reasonCode: classification.reasonCode,
      url: input.url,
      httpStatus: response.status,
      httpStatusText: response.statusText,
      message: classification.message,
    }
  } catch (error) {
    const classification = classifyProbeError(error, input.required)

    if (classification.reasonCode === 'network_or_cors' && input.enableServerAssistedProbes) {
      try {
        const assistedResponse = await probeEndpointViaServer({
          endpoint: input.endpoint,
          url: input.url,
          method: input.method,
          fetcher: input.serverAssistedProbeFetcher,
        })
        const assistedClassification = classifyProbeResponse(
          input.endpoint,
          assistedResponse.status,
          input.required
        )

        return {
          endpoint: input.endpoint,
          label: ENDPOINT_LABELS[input.endpoint],
          method: input.method,
          status: assistedClassification.status,
          required: input.required,
          reasonCode: assistedClassification.reasonCode,
          url: input.url,
          httpStatus: assistedResponse.status,
          httpStatusText: assistedResponse.statusText,
          message: `${assistedClassification.message} (server-assisted probe)`,
        }
      } catch (assistedError) {
        const primaryError = error instanceof Error ? error.message : String(error)
        const fallbackError =
          assistedError instanceof Error ? assistedError.message : String(assistedError)

        return {
          endpoint: input.endpoint,
          label: ENDPOINT_LABELS[input.endpoint],
          method: input.method,
          status: classification.status,
          required: input.required,
          reasonCode: classification.reasonCode,
          url: input.url,
          message: `${classification.message}; server-assisted probe also failed`,
          error: `${primaryError} | fallback: ${fallbackError}`,
        }
      }
    }

    return {
      endpoint: input.endpoint,
      label: ENDPOINT_LABELS[input.endpoint],
      method: input.method,
      status: classification.status,
      required: input.required,
      reasonCode: classification.reasonCode,
      url: input.url,
      message: classification.message,
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
  const probePayload = createProbePayload(endpoint, method)

  return {
    method,
    headers: probePayload.headers,
    body: probePayload.body,
    redirect: 'manual',
    signal,
  }
}

function createProbePayload(
  endpoint: OidcDiscoveryEndpointName,
  method: 'GET' | 'HEAD' | 'POST'
): { headers: Record<string, string>; body?: string } {
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

  return { headers, body }
}

async function probeEndpointViaServer(input: {
  endpoint: OidcDiscoveryEndpointName
  url: string
  method: 'GET' | 'HEAD' | 'POST'
  fetcher: OidcFetchFunction
}): Promise<{ status: number; statusText: string }> {
  const probePayload = createProbePayload(input.endpoint, input.method)
  const response = await input.fetcher(resolveServerAssistedProbeUrl(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url: input.url,
      method: input.method,
      headers: probePayload.headers,
      body: probePayload.body,
    }),
  })

  if (!response.ok) {
    throw new Error(await buildResponseError(response, 'Server-assisted probe failed'))
  }

  const payload = (await response.json()) as unknown
  if (!payload || typeof payload !== 'object') {
    throw new Error('Server-assisted probe returned an invalid response')
  }

  const result = payload as {
    ok?: boolean
    status?: unknown
    statusText?: unknown
    error?: unknown
  }

  if (!result.ok) {
    const errorMessage =
      typeof result.error === 'string' && result.error.trim()
        ? result.error
        : 'Server-assisted probe did not complete'
    throw new Error(errorMessage)
  }

  if (typeof result.status !== 'number') {
    throw new Error('Server-assisted probe response did not include an upstream status')
  }

  return {
    status: result.status,
    statusText: typeof result.statusText === 'string' ? result.statusText : '',
  }
}

function resolveServerAssistedProbeUrl(): string {
  if (import.meta.env.DEV) {
    return `http://localhost:8788${SERVER_ASSISTED_PROBE_PATH}`
  }

  return SERVER_ASSISTED_PROBE_PATH
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

function classifyProbeResponse(
  endpoint: OidcDiscoveryEndpointName,
  statusCode: number,
  required: boolean
): {
  status: OidcEndpointStatus
  reasonCode: OidcPreflightReasonCode
  message: string
} {
  if ((statusCode >= 200 && statusCode < 300) || (statusCode >= 300 && statusCode < 400)) {
    return {
      status: 'pass',
      reasonCode: 'reachable',
      message: `${ENDPOINT_LABELS[endpoint]} is reachable (${statusCode})`,
    }
  }

  if ([400, 401, 403].includes(statusCode)) {
    return {
      status: 'pass',
      reasonCode: 'auth_required',
      message: `Reachable but requires auth/input validation (${statusCode})`,
    }
  }

  if (statusCode === 405) {
    return {
      status: 'warn',
      reasonCode: 'method_not_allowed',
      message: `${ENDPOINT_LABELS[endpoint]} rejected probe method (${statusCode})`,
    }
  }

  if (statusCode === 404 || statusCode === 410) {
    return {
      status: required ? 'fail' : 'warn',
      reasonCode: 'missing_or_unavailable',
      message: required
        ? `${ENDPOINT_LABELS[endpoint]} is required but unavailable (${statusCode})`
        : 'Optional endpoint unavailable',
    }
  }

  if (statusCode >= 500) {
    return {
      status: required ? 'fail' : 'warn',
      reasonCode: 'server_error',
      message: required
        ? `${ENDPOINT_LABELS[endpoint]} returned a server error (${statusCode})`
        : `${ENDPOINT_LABELS[endpoint]} returned a server error but is optional`,
    }
  }

  return {
    status: required ? 'fail' : 'warn',
    reasonCode: 'missing_or_unavailable',
    message: `${ENDPOINT_LABELS[endpoint]} returned status ${statusCode}`,
  }
}

function classifyProbeError(
  error: unknown,
  required: boolean
): {
  status: OidcEndpointStatus
  reasonCode: OidcPreflightReasonCode
  message: string
} {
  if (isNetworkOrCorsError(error)) {
    return {
      status: 'warn',
      reasonCode: 'network_or_cors',
      message: 'Browser probe blocked by CORS/network; endpoint may still be healthy',
    }
  }

  return {
    status: required ? 'fail' : 'warn',
    reasonCode: 'server_error',
    message: 'Probe failed unexpectedly',
  }
}

function isNetworkOrCorsError(error: unknown): boolean {
  if (error instanceof DOMException && error.name === 'AbortError') {
    return true
  }

  if (error instanceof TypeError) {
    return true
  }

  if (error instanceof Error) {
    if (error.name === 'AbortError' || error.name === 'TimeoutError') {
      return true
    }

    const message = error.message.toLowerCase()
    return (
      message.includes('failed to fetch') ||
      message.includes('network') ||
      message.includes('cors') ||
      message.includes('load failed') ||
      message.includes('blocked') ||
      message.includes('timeout')
    )
  }

  return false
}
