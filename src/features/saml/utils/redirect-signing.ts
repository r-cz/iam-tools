// Canonical serialization and signing for the SAML HTTP-Redirect binding.

export type RedirectSigAlg = 'rsa-sha256' | 'ecdsa-sha256'

export const REDIRECT_SIG_ALG_URIS: Readonly<Record<RedirectSigAlg, string>> = {
  'rsa-sha256': 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256',
  'ecdsa-sha256': 'http://www.w3.org/2001/04/xmldsig-more#ecdsa-sha256',
}

const RESERVED_REDIRECT_PARAMETERS = new Set(['SAMLRequest', 'RelayState', 'SigAlg', 'Signature'])

function encodeRedirectValue(value: string): string {
  return encodeURIComponent(value).replace(
    /[!'()*]/g,
    (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`
  )
}

export function parseRedirectDestination(destination: string): URL {
  const url = new URL(destination)
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Destination must use http:// or https://')
  }
  if (url.username || url.password) {
    throw new Error('Destination must not contain credentials')
  }
  if (url.hash) {
    throw new Error('Destination must not contain a fragment')
  }
  for (const key of url.searchParams.keys()) {
    if (RESERVED_REDIRECT_PARAMETERS.has(key)) {
      throw new Error(`Destination already contains reserved parameter ${key}`)
    }
  }
  return url
}

export function buildRedirectSigningInput(input: {
  samlRequest: string
  relayState?: string
  sigAlg: RedirectSigAlg
}): string {
  const parts = [`SAMLRequest=${encodeRedirectValue(input.samlRequest)}`]
  if (input.relayState !== undefined) {
    parts.push(`RelayState=${encodeRedirectValue(input.relayState)}`)
  }
  parts.push(`SigAlg=${encodeRedirectValue(REDIRECT_SIG_ALG_URIS[input.sigAlg])}`)
  return parts.join('&')
}

function appendCanonicalQuery(destination: URL, query: string): string {
  const existingQuery = destination.search.slice(1)
  destination.search = ''
  return `${destination.toString()}?${existingQuery ? `${existingQuery}&` : ''}${query}`
}

export function buildRedirectUrl(input: {
  destination: string
  samlRequest: string
  relayState?: string
}): string {
  const destination = parseRedirectDestination(input.destination)
  const parts = [`SAMLRequest=${encodeRedirectValue(input.samlRequest)}`]
  if (input.relayState !== undefined) {
    parts.push(`RelayState=${encodeRedirectValue(input.relayState)}`)
  }
  return appendCanonicalQuery(destination, parts.join('&'))
}

async function importRsaPkcs8(privateKeyPem: string): Promise<CryptoKey> {
  const pem = privateKeyPem.trim()
  if (!pem.includes('BEGIN PRIVATE KEY')) {
    throw new Error('Expected PKCS8 PEM (BEGIN PRIVATE KEY)')
  }
  const base64 = pem
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s+/g, '')
  const raw = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
  return crypto.subtle.importKey(
    'pkcs8',
    raw,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  )
}

async function importEcPkcs8(privateKeyPem: string): Promise<CryptoKey> {
  const pem = privateKeyPem.trim()
  if (!pem.includes('BEGIN PRIVATE KEY')) {
    throw new Error('Expected PKCS8 PEM (BEGIN PRIVATE KEY)')
  }
  const base64 = pem
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s+/g, '')
  const raw = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
  return crypto.subtle.importKey('pkcs8', raw, { name: 'ECDSA', namedCurve: 'P-256' }, false, [
    'sign',
  ])
}

export async function signRedirectRequest(opts: {
  baseUrl: string
  samlRequest: string
  relayState?: string
  sigAlg: RedirectSigAlg
  privateKeyPem: string
}): Promise<{ url: string; signingInput: string }> {
  const destination = parseRedirectDestination(opts.baseUrl)
  const signingInput = buildRedirectSigningInput(opts)
  const data = new TextEncoder().encode(signingInput)
  const key =
    opts.sigAlg === 'rsa-sha256'
      ? await importRsaPkcs8(opts.privateKeyPem)
      : await importEcPkcs8(opts.privateKeyPem)
  const signature = await crypto.subtle.sign(
    opts.sigAlg === 'rsa-sha256'
      ? { name: 'RSASSA-PKCS1-v1_5' }
      : { name: 'ECDSA', hash: 'SHA-256' },
    key,
    data
  )
  const signatureBase64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
  const query = `${signingInput}&Signature=${encodeRedirectValue(signatureBase64)}`

  return { url: appendCanonicalQuery(destination, query), signingInput }
}
