export type PublicNetworkTargetRejection =
  'invalid_url' | 'unsupported_protocol' | 'embedded_credentials' | 'private_or_local'

export type PublicNetworkTargetAssessment =
  { allowed: true; url: URL } | { allowed: false; reason: PublicNetworkTargetRejection; url?: URL }

const LOCAL_HOST_SUFFIXES = [
  '.localhost',
  '.local',
  '.localdomain',
  '.internal',
  '.lan',
  '.home.arpa',
  '.localtest.me',
  '.lvh.me',
  '.vcap.me',
  '.nip.io',
  '.sslip.io',
]

/**
 * Performs a browser-safe, DNS-free assessment of an HTTP target.
 *
 * This closes direct literal/local-host requests. DNS resolution and rebinding
 * must still be checked by any server-side proxy before it follows a target.
 */
export function assessPublicNetworkTarget(value: string): PublicNetworkTargetAssessment {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return { allowed: false, reason: 'invalid_url' }
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return { allowed: false, reason: 'unsupported_protocol', url }
  }

  if (url.username || url.password) {
    return { allowed: false, reason: 'embedded_credentials', url }
  }

  if (isPrivateOrLocalHostname(url.hostname)) {
    return { allowed: false, reason: 'private_or_local', url }
  }

  return { allowed: true, url }
}

export function isPrivateOrLocalHostname(hostname: string): boolean {
  const lower = hostname
    .toLowerCase()
    .replace(/^\[(.*)\]$/, '$1')
    .replace(/\.+$/, '')
  if (
    lower === 'localhost' ||
    lower === '0.0.0.0' ||
    lower === '::' ||
    lower === '::1' ||
    LOCAL_HOST_SUFFIXES.some((suffix) => lower === suffix.slice(1) || lower.endsWith(suffix))
  ) {
    return true
  }

  const ipv4 = parseIpv4Address(lower)
  if (ipv4) {
    return isNonPublicIpv4Address(ipv4)
  }

  // Single-label hosts are normally resolved by local DNS/search domains.
  if (!lower.includes('.')) {
    return true
  }

  // Browser URL implementations normalize IPv4 alternate forms, while any
  // remaining colon denotes an IPv6 literal. Conservatively reject all IPv6
  // literals until address-range handling and server-side DNS validation exist.
  return lower.includes(':')
}

export function parseIpv4Address(hostname: string): [number, number, number, number] | null {
  const parts = hostname.split('.')
  if (parts.length !== 4) {
    return null
  }

  const octets = parts.map((part) => Number(part))
  if (octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)) {
    return null
  }

  return [octets[0]!, octets[1]!, octets[2]!, octets[3]!]
}

function isNonPublicIpv4Address([a, b, c]: [number, number, number, number]): boolean {
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0 && c === 0) ||
    (a === 192 && b === 0 && c === 2) ||
    (a === 192 && b === 88 && c === 99) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    (a === 198 && b === 51 && c === 100) ||
    (a === 203 && b === 0 && c === 113) ||
    a >= 224
  )
}
