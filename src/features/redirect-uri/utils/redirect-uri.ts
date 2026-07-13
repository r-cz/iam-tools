export type RedirectFindingLevel = 'pass' | 'error' | 'warning' | 'info'
export type RedirectMatchType = 'exact' | 'loopback-port' | 'normalized-only' | 'none' | 'invalid'

export interface RedirectFinding {
  level: RedirectFindingLevel
  code: string
  title: string
  message: string
}

export interface RegisteredRedirectEvaluation {
  uri: string
  matchType: RedirectMatchType
  detail: string
}

export interface RedirectUriAnalysis {
  requestedUri: string
  parsed?: {
    scheme: string
    host: string
    port: string
    path: string
    query: string
    fragment: string
    isLoopback: boolean
  }
  matchType: RedirectMatchType
  matchedRegistration?: string
  findings: RedirectFinding[]
  registrations: RegisteredRedirectEvaluation[]
  safeToSend: boolean
}

const DANGEROUS_REDIRECT_SCHEMES = new Set(['javascript:', 'data:', 'file:', 'blob:'])
const REVERSE_DOMAIN_PRIVATE_USE_SCHEME =
  /^[a-z](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/

function parseAbsoluteUri(value: string): URL | null {
  try {
    const parsed = new URL(value)
    return parsed.protocol && value.includes(':') ? parsed : null
  } catch {
    return null
  }
}

function isLoopbackHost(hostname: string): boolean {
  const normalized = hostname.toLowerCase()
  return normalized === '127.0.0.1' || normalized === '[::1]' || normalized === '::1'
}

function isLocalhost(hostname: string): boolean {
  return hostname.toLowerCase() === 'localhost'
}

function isHttpLoopback(url: URL): boolean {
  return url.protocol === 'http:' && isLoopbackHost(url.hostname)
}

function isReverseDomainPrivateUseScheme(protocol: string): boolean {
  return REVERSE_DOMAIN_PRIVATE_USE_SCHEME.test(protocol.slice(0, -1))
}

function matchesLoopbackPortException(requested: URL, registered: URL): boolean {
  if (!isHttpLoopback(requested) || !isHttpLoopback(registered)) return false

  return (
    requested.protocol === registered.protocol &&
    requested.hostname.toLowerCase() === registered.hostname.toLowerCase() &&
    requested.pathname === registered.pathname &&
    requested.search === registered.search &&
    requested.hash === registered.hash
  )
}

function normalizedUri(url: URL): string {
  return `${url.protocol.toLowerCase()}//${url.host.toLowerCase()}${url.pathname}${url.search}${url.hash}`
}

function evaluateRegistration(
  requestedRaw: string,
  requested: URL,
  registeredRaw: string
): RegisteredRedirectEvaluation {
  const registered = parseAbsoluteUri(registeredRaw)
  if (!registered) {
    return {
      uri: registeredRaw,
      matchType: 'invalid',
      detail: 'The registered value is not an absolute URI.',
    }
  }
  if (requestedRaw === registeredRaw) {
    return { uri: registeredRaw, matchType: 'exact', detail: 'Exact string match.' }
  }
  if (matchesLoopbackPortException(requested, registered)) {
    return {
      uri: registeredRaw,
      matchType: 'loopback-port',
      detail: 'Matches a native-app loopback registration except for its dynamic port.',
    }
  }
  if (normalizedUri(requested) === normalizedUri(registered)) {
    return {
      uri: registeredRaw,
      matchType: 'normalized-only',
      detail: 'Equivalent after URL normalization, but not an exact registered string.',
    }
  }

  const sameOrigin = requested.origin !== 'null' && requested.origin === registered.origin
  return {
    uri: registeredRaw,
    matchType: 'none',
    detail: sameOrigin
      ? 'Same origin, but path, query, fragment, or exact text differs.'
      : 'No match.',
  }
}

export function parseRegisteredRedirects(input: string): string[] {
  return [
    ...new Set(
      input
        .split(/\r?\n/)
        .map((value) => value.trim())
        .filter(Boolean)
    ),
  ]
}

export function analyzeRedirectUri(
  requestedInput: string,
  registeredInput: string | string[]
): RedirectUriAnalysis {
  const requestedRaw = requestedInput.trim()
  const registered = Array.isArray(registeredInput)
    ? registeredInput.map((value) => value.trim()).filter(Boolean)
    : parseRegisteredRedirects(registeredInput)
  const requested = parseAbsoluteUri(requestedRaw)
  const findings: RedirectFinding[] = []

  if (!requested) {
    return {
      requestedUri: requestedRaw,
      matchType: 'invalid',
      findings: [
        {
          level: 'error',
          code: 'invalid-uri',
          title: 'Invalid redirect URI',
          message: 'The requested redirect must be an absolute URI with a scheme.',
        },
      ],
      registrations: registered.map((uri) => ({
        uri,
        matchType: parseAbsoluteUri(uri) ? 'none' : 'invalid',
        detail: parseAbsoluteUri(uri)
          ? 'Requested URI is invalid.'
          : 'The registered value is invalid.',
      })),
      safeToSend: false,
    }
  }

  const registrations = registered.map((uri) => evaluateRegistration(requestedRaw, requested, uri))
  const preferredMatch =
    registrations.find((item) => item.matchType === 'exact') ??
    registrations.find((item) => item.matchType === 'loopback-port') ??
    registrations.find((item) => item.matchType === 'normalized-only')
  const matchType = preferredMatch?.matchType ?? 'none'

  if (requested.hash) {
    findings.push({
      level: 'error',
      code: 'fragment-prohibited',
      title: 'Fragments are not allowed',
      message: 'OAuth redirect URIs must not contain a #fragment component.',
    })
  }

  if (requested.username || requested.password) {
    findings.push({
      level: 'error',
      code: 'userinfo-prohibited',
      title: 'Embedded credentials',
      message: 'Remove the username or password component from this redirect URI.',
    })
  }

  if (DANGEROUS_REDIRECT_SCHEMES.has(requested.protocol)) {
    findings.push({
      level: 'error',
      code: 'dangerous-scheme',
      title: 'Dangerous redirect scheme',
      message: `${requested.protocol.slice(0, -1)} URIs must never be used as OAuth redirect endpoints.`,
    })
  }

  if (requested.protocol === 'http:') {
    if (isHttpLoopback(requested)) {
      findings.push({
        level: 'pass',
        code: 'loopback-http',
        title: 'Native loopback redirect',
        message: 'HTTP is acceptable for a loopback IP redirect that never leaves the device.',
      })
    } else if (isLocalhost(requested.hostname)) {
      findings.push({
        level: 'warning',
        code: 'localhost-not-recommended',
        title: 'Prefer a loopback IP literal',
        message:
          'For native apps, 127.0.0.1 or [::1] is safer and more predictable than localhost.',
      })
    } else {
      findings.push({
        level: 'error',
        code: 'insecure-http',
        title: 'Insecure network redirect',
        message: 'Use HTTPS unless this is an explicit native-app loopback redirect.',
      })
    }
  } else if (requested.protocol === 'https:') {
    findings.push({
      level: 'pass',
      code: 'https',
      title: 'HTTPS transport',
      message: 'The redirect uses an authenticated, encrypted web origin.',
    })
  } else if (isReverseDomainPrivateUseScheme(requested.protocol)) {
    const scheme = requested.protocol.slice(0, -1)
    findings.push({
      level: 'info',
      code: 'custom-scheme',
      title: 'Custom URI scheme',
      message: `The reverse-domain ${scheme} scheme looks suitable for a native app; confirm the app exclusively claims it.`,
    })
  } else if (!DANGEROUS_REDIRECT_SCHEMES.has(requested.protocol)) {
    findings.push({
      level: 'error',
      code: 'unsupported-scheme',
      title: 'Unsupported redirect scheme',
      message:
        'Use HTTPS, a native loopback HTTP URI, or a reverse-domain private-use scheme controlled by the app.',
    })
  }

  if (!registered.length) {
    findings.push({
      level: 'warning',
      code: 'no-registrations',
      title: 'No registered allowlist supplied',
      message: 'Add the client registration values to verify the redirect match.',
    })
  } else if (matchType === 'exact') {
    findings.push({
      level: 'pass',
      code: 'exact-match',
      title: 'Exact registration match',
      message: 'The requested URI exactly matches a registered value.',
    })
  } else if (matchType === 'loopback-port') {
    findings.push({
      level: 'pass',
      code: 'loopback-port-match',
      title: 'Loopback port exception',
      message: 'Only the dynamic port differs from the registered loopback redirect.',
    })
  } else if (matchType === 'normalized-only') {
    findings.push({
      level: 'error',
      code: 'not-exact',
      title: 'Equivalent is not exact',
      message: 'Do not normalize or partially match web redirect URIs at authorization time.',
    })
  } else {
    findings.push({
      level: 'error',
      code: 'not-registered',
      title: 'Redirect is not registered',
      message: 'The requested URI does not match any supplied client registration value.',
    })
  }

  const wildcardRegistrations = registered.filter((uri) => uri.includes('*'))
  if (wildcardRegistrations.length) {
    findings.push({
      level: 'error',
      code: 'wildcard-registration',
      title: 'Wildcard registration detected',
      message:
        'Wildcard redirect matching can send authorization responses to attacker-controlled locations.',
    })
  }

  if (requested.search) {
    findings.push({
      level: 'info',
      code: 'query-retention',
      title: 'Registered query must be retained',
      message:
        'Authorization response parameters are appended while this existing query remains intact.',
    })
  }

  return {
    requestedUri: requestedRaw,
    parsed: {
      scheme: requested.protocol.slice(0, -1),
      host: requested.hostname,
      port: requested.port,
      path: requested.pathname,
      query: requested.search,
      fragment: requested.hash,
      isLoopback: isLoopbackHost(requested.hostname),
    },
    matchType,
    matchedRegistration: preferredMatch?.uri,
    findings,
    registrations,
    safeToSend:
      !findings.some((finding) => finding.level === 'error') &&
      (matchType === 'exact' || matchType === 'loopback-port'),
  }
}
