// Utilities to sign SAML HTTP-Redirect requests

export type RedirectSigAlg = 'rsa-sha256' | 'ecdsa-sha256'

const SigAlgUris: Record<RedirectSigAlg, string> = {
  'rsa-sha256': 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256',
  'ecdsa-sha256': 'http://www.w3.org/2001/04/xmldsig-more#ecdsa-sha256',
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
  samlRequest: string // URL-encoded (deflate+base64) value
  relayState?: string
  sigAlg: RedirectSigAlg
  privateKeyPem: string
}): Promise<{ url: string }> {
  const sigAlgUri = SigAlgUris[opts.sigAlg]
  const url = new URL(opts.baseUrl)
  url.search = '' // reset any existing query to construct in correct order
  url.searchParams.set('SAMLRequest', opts.samlRequest)
  if (opts.relayState) url.searchParams.set('RelayState', opts.relayState)
  url.searchParams.set('SigAlg', sigAlgUri)

  // Build the exact string to sign per spec: SAMLRequest=...&RelayState=...&SigAlg=...
  const qp = new URLSearchParams()
  qp.set('SAMLRequest', opts.samlRequest)
  if (opts.relayState) qp.set('RelayState', opts.relayState)
  qp.set('SigAlg', sigAlgUri)
  const stringToSign = qp.toString()

  const data = new TextEncoder().encode(stringToSign)
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
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
  url.searchParams.set('Signature', sigB64)

  return { url: url.toString() }
}
