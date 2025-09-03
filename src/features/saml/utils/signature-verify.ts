// Robust XML-DSig verification helpers using xmldsigjs (browser/WebCrypto)
// Note: xmldsigjs API surface differs across versions; we use `any` where needed to keep compatibility.

import * as xmldsig from 'xmldsigjs'

export type ElementVerifyResult = {
  present: boolean
  valid: boolean | null
  error?: string
}

export type ResponseVerifyResult = {
  response: ElementVerifyResult
  assertions: Array<{ id?: string; result: ElementVerifyResult }>
}

export type MetadataVerifyResult = ElementVerifyResult

function ensureEngine() {
  const app: any = (xmldsig as any).Application
  const CryptoEngine: any = (xmldsig as any).CryptoEngine
  if (!app?.crypto) {
    app.setEngine(
      'WebCrypto',
      new CryptoEngine({ name: 'browser', crypto: crypto, subtle: crypto.subtle })
    )
  }
}

function normalizePemCert(input: string): string {
  const trimmed = input.trim()
  if (trimmed.includes('BEGIN CERTIFICATE')) return trimmed
  // Assume raw base64 certificate body; wrap with PEM headers
  const body = trimmed.replace(/\s+/g, '')
  const chunks = body.match(/.{1,64}/g) || [body]
  return `-----BEGIN CERTIFICATE-----\n${chunks.join('\n')}\n-----END CERTIFICATE-----`
}

async function verifySignatureElement(doc: Document, signatureEl: Element, certPem: string) {
  ensureEngine()
  const SignedXml: any = (xmldsig as any).SignedXml
  const X509Certificate: any = (xmldsig as any).X509Certificate

  const signed = new SignedXml(doc)
  await signed.LoadXml(signatureEl)
  const cert = new X509Certificate(normalizePemCert(certPem))

  // Try different verification options depending on library version
  try {
    // v3 style
    const valid = await signed.Verify({ x509: [cert] })
    return !!valid
  } catch {
    try {
      // v2 fallback: pass certificate directly
      const valid = await signed.Verify(cert)
      return !!valid
    } catch (e) {
      throw e
    }
  }
}

export async function verifySamlResponseSignatures(
  xml: string,
  certPem: string
): Promise<ResponseVerifyResult> {
  const parser = new DOMParser()
  const doc = parser.parseFromString(xml, 'application/xml')

  const responseEl = doc.documentElement
  const result: ResponseVerifyResult = {
    response: { present: false, valid: null },
    assertions: [],
  }

  // Response-level signature
  const respSig = findChildSignature(responseEl)
  if (respSig) {
    result.response.present = true
    try {
      result.response.valid = await verifySignatureElement(doc, respSig, certPem)
    } catch (e: any) {
      result.response.valid = false
      result.response.error = e?.message || 'Verification error'
    }
  }

  // Assertion-level signatures
  const assertions = findDescendantsByLocalName(responseEl, 'Assertion')
  for (const a of assertions) {
    const aSig = findChildSignature(a)
    const item: { id?: string; result: ElementVerifyResult } = {
      id: a.getAttribute('ID') || undefined,
      result: { present: false, valid: null },
    }
    if (aSig) {
      item.result.present = true
      try {
        item.result.valid = await verifySignatureElement(doc, aSig, certPem)
      } catch (e: any) {
        item.result.valid = false
        item.result.error = e?.message || 'Verification error'
      }
    }
    result.assertions.push(item)
  }

  return result
}

export async function verifySamlMetadataSignature(
  xml: string,
  certPem: string
): Promise<MetadataVerifyResult> {
  const parser = new DOMParser()
  const doc = parser.parseFromString(xml, 'application/xml')
  const entity = findDescendantsByLocalName(doc.documentElement, 'EntityDescriptor')[0] ||
    (doc.documentElement.localName === 'EntityDescriptor' ? doc.documentElement : null)

  if (!entity) return { present: false, valid: null }
  const sig = findChildSignature(entity)
  if (!sig) return { present: false, valid: null }

  try {
    const valid = await verifySignatureElement(doc, sig, certPem)
    return { present: true, valid }
  } catch (e: any) {
    return { present: true, valid: false, error: e?.message || 'Verification error' }
  }
}

function findChildSignature(el: Element): Element | null {
  const ns = 'http://www.w3.org/2000/09/xmldsig#'
  const list = el.getElementsByTagNameNS(ns, 'Signature')
  if (list && list.length > 0 && list[0].parentElement === el) return list[0]
  // fallback: first Signature anywhere under
  return el.getElementsByTagNameNS(ns, 'Signature')[0] || null
}

function findDescendantsByLocalName(parent: Element, localName: string): Element[] {
  const all = parent.getElementsByTagName('*')
  return Array.from(all).filter((e) => e.localName === localName || e.nodeName.endsWith(':' + localName))
}

