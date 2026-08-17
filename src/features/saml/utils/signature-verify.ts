// Robust XML-DSig verification helpers using xmldsigjs (browser/WebCrypto)
// Note: xmldsigjs API surface differs across versions; we use `any` where needed to keep compatibility.

import * as xmldsig from 'xmldsigjs'
import {
  findDirectXmlDsigSignature,
  findMetadataEntityDescriptor,
  findSamlAssertionElements,
} from './signature-targets'

export type SignatureVerificationOutcome =
  | { status: 'unsigned' }
  | { status: 'valid' }
  | { status: 'invalid' }
  | { status: 'error'; message: string }

export type ResponseVerifyResult = {
  response: SignatureVerificationOutcome
  assertions: Array<{ id?: string; result: SignatureVerificationOutcome }>
}

export type MetadataVerifyResult = SignatureVerificationOutcome

function ensureEngine() {
  const app: any = (xmldsig as any).Application
  if (!app?.crypto) {
    app.setEngine('WebCrypto')
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
  // Parse as XML; we do not inject into DOM, so no HTML sanitization required
  const doc = parser.parseFromString(xml, 'application/xml')

  const responseEl = doc.documentElement
  const result: ResponseVerifyResult = {
    response: { status: 'unsigned' },
    assertions: [],
  }

  // Response-level signature
  const respSig = findDirectXmlDsigSignature(responseEl)
  if (respSig) {
    result.response = await verifySignatureOutcome(doc, respSig, certPem)
  }

  // Assertion-level signatures
  const assertions = findSamlAssertionElements(responseEl)
  for (const a of assertions) {
    const aSig = findDirectXmlDsigSignature(a)
    const item: { id?: string; result: SignatureVerificationOutcome } = {
      id: a.getAttribute('ID') || undefined,
      result: { status: 'unsigned' },
    }
    if (aSig) {
      item.result = await verifySignatureOutcome(doc, aSig, certPem)
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
  const entity = findMetadataEntityDescriptor(doc)

  if (!entity) return { status: 'unsigned' }
  const sig = findDirectXmlDsigSignature(entity)
  if (!sig) return { status: 'unsigned' }

  return await verifySignatureOutcome(doc, sig, certPem)
}

async function verifySignatureOutcome(
  doc: Document,
  signature: Element,
  certPem: string
): Promise<SignatureVerificationOutcome> {
  try {
    const valid = await verifySignatureElement(doc, signature, certPem)
    return valid ? { status: 'valid' } : { status: 'invalid' }
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Verification error',
    }
  }
}
