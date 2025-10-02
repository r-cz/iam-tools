// Utilities to build and encode SAML AuthnRequest

function xmlEscape(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

export function buildAuthnRequestXml(opts: {
  issuer: string
  destination: string
  acsUrl: string
  nameIdFormat: string
  forceAuthn?: boolean
  isPassive?: boolean
  requestId?: string
}): string {
  const issueInstant = new Date().toISOString()
  const id = opts.requestId ?? '_' + crypto.randomUUID()
  const attrs = [
    ['ID', id],
    ['Version', '2.0'],
    ['IssueInstant', issueInstant],
    ['Destination', opts.destination],
    ['AssertionConsumerServiceURL', opts.acsUrl],
    ['ProtocolBinding', 'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST'],
  ] as const

  const boolAttrs: Array<[string, boolean | undefined]> = [
    ['ForceAuthn', opts.forceAuthn],
    ['IsPassive', opts.isPassive],
  ]

  const attrStr = [
    ...attrs.map(([k, v]) => `${k}="${xmlEscape(v)}"`),
    ...boolAttrs
      .filter(([, v]) => typeof v === 'boolean')
      .map(([k, v]) => `${k}="${v ? 'true' : 'false'}"`),
  ].join(' ')

  return [
    '<samlp:AuthnRequest',
    ' xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"',
    ' xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"',
    ` ${attrStr}>`,
    `<saml:Issuer>${xmlEscape(opts.issuer)}</saml:Issuer>`,
    '<samlp:NameIDPolicy AllowCreate="true"',
    ` Format="${xmlEscape(opts.nameIdFormat)}" />`,
    '<samlp:RequestedAuthnContext Comparison="exact">',
    '<saml:AuthnContextClassRef>',
    'urn:oasis:names:tc:SAML:2.0:ac:classes:PasswordProtectedTransport',
    '</saml:AuthnContextClassRef>',
    '</samlp:RequestedAuthnContext>',
    '</samlp:AuthnRequest>',
  ].join('')
}

export function encodeBase64(value: string): string {
  // btoa expects binary string; encode as UTF-8 first
  const enc = new TextEncoder().encode(value)
  let binary = ''
  for (let i = 0; i < enc.length; i++) binary += String.fromCharCode(enc[i])
  return btoa(binary)
}

// HTTP-Redirect binding requires DEFLATE (raw) then base64, then URL-encode
export async function deflateRawToBase64(value: string): Promise<string> {
  if (typeof (globalThis as any).CompressionStream === 'undefined') {
    throw new Error('CompressionStream API not available')
  }
  // Use deflate-raw for SAML Redirect binding
  const cs = new (globalThis as any).CompressionStream('deflate-raw')
  const writer = cs.writable.getWriter()
  await writer.write(new TextEncoder().encode(value))
  await writer.close()
  const compressed = await new Response(cs.readable).arrayBuffer()
  const bytes = new Uint8Array(compressed)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}
