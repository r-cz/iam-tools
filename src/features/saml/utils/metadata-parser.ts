import { SAML_METADATA_NAMESPACE, XMLDSIG_NAMESPACE } from '@/features/saml/utils/signature-targets'

export type ParsedMetadataKey = { use?: string; x509?: string }
export type ParsedMetadataService = { binding: string; location: string }

export type ParsedMetadata = {
  entityId?: string
  hasIdp: boolean
  hasSp: boolean
  sso: ParsedMetadataService[]
  slo: ParsedMetadataService[]
  keys: ParsedMetadataKey[]
  warnings: string[]
}

export type MetadataParseResult =
  | { status: 'empty' }
  | { status: 'invalid'; message: string }
  | { status: 'valid'; value: ParsedMetadata }

function descendants(owner: Document | Element, namespace: string, localName: string): Element[] {
  return Array.from(owner.getElementsByTagName('*')).filter(
    (element) => element.namespaceURI === namespace && element.localName === localName
  )
}

export function parseSamlMetadata(xml: string, now = Date.now()): MetadataParseResult {
  if (!xml.trim()) return { status: 'empty' }
  if (/<!DOCTYPE|<!ENTITY/i.test(xml)) {
    return { status: 'invalid', message: 'DOCTYPE and ENTITY declarations are not allowed' }
  }

  const doc = new DOMParser().parseFromString(xml.trim(), 'application/xml')
  if (doc.getElementsByTagName('parsererror').length > 0) {
    return { status: 'invalid', message: 'XML parse error' }
  }
  const entity = doc.documentElement
  if (entity.namespaceURI !== SAML_METADATA_NAMESPACE || entity.localName !== 'EntityDescriptor') {
    return {
      status: 'invalid',
      message: 'Root element must be a SAML metadata EntityDescriptor',
    }
  }

  const idp = descendants(entity, SAML_METADATA_NAMESPACE, 'IDPSSODescriptor')[0]
  const sp = descendants(entity, SAML_METADATA_NAMESPACE, 'SPSSODescriptor')[0]
  const services = (owners: Array<Element | undefined>, localName: string) =>
    owners.flatMap((owner) =>
      owner
        ? descendants(owner, SAML_METADATA_NAMESPACE, localName).map((element) => ({
            binding: element.getAttribute('Binding') || '',
            location: element.getAttribute('Location') || '',
          }))
        : []
    )
  const sso = services([idp], 'SingleSignOnService')
  const slo = services([idp, sp], 'SingleLogoutService')
  const keys = descendants(entity, SAML_METADATA_NAMESPACE, 'KeyDescriptor').map((descriptor) => ({
    use: descriptor.getAttribute('use') || undefined,
    x509:
      descendants(descriptor, XMLDSIG_NAMESPACE, 'X509Certificate')[0]?.textContent?.trim() ||
      undefined,
  }))

  const entityId = entity.getAttribute('entityID') || undefined
  const warnings: string[] = []
  if (!entityId) warnings.push('Missing entityID')
  if (!idp && !sp) warnings.push('No IDPSSODescriptor or SPSSODescriptor found')
  if (idp && sso.length === 0) warnings.push('IDPSSODescriptor missing SingleSignOnService')
  if (keys.length === 0) warnings.push('No signing/encryption keys present')

  const validUntil = entity.getAttribute('validUntil') || undefined
  if (validUntil) {
    const expiration = Date.parse(validUntil)
    if (Number.isNaN(expiration)) warnings.push('validUntil is not a valid date')
    else if (expiration <= now) warnings.push('Metadata validUntil has expired')
    else if (expiration - now < 1000 * 60 * 60 * 24 * 30) {
      warnings.push('Metadata validUntil expires within 30 days')
    }
  }
  const signingKeys = keys.filter((key) => !key.use || key.use === 'signing')
  if (signingKeys.length > 1) {
    warnings.push('Multiple signing keys detected; ensure your SP/IdP supports key rollover')
  }
  if (keys.some((key) => !key.use)) {
    warnings.push('KeyDescriptor entries without a use attribute should be reviewed')
  }

  return {
    status: 'valid',
    value: { entityId, hasIdp: !!idp, hasSp: !!sp, sso, slo, keys, warnings },
  }
}
