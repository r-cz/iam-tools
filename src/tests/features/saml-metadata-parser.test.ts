import { describe, expect, it } from 'bun:test'
import { parseSamlMetadata } from '@/features/saml/utils/metadata-parser'

const metadata = `
<md:EntityDescriptor xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata"
  xmlns:ds="http://www.w3.org/2000/09/xmldsig#"
  entityID="https://idp.example.com"
  validUntil="2030-01-15T00:00:00Z">
  <md:IDPSSODescriptor>
    <md:KeyDescriptor use="signing">
      <ds:KeyInfo><ds:X509Data><ds:X509Certificate> CERTIFICATE </ds:X509Certificate></ds:X509Data></ds:KeyInfo>
    </md:KeyDescriptor>
    <md:SingleSignOnService Binding="redirect" Location="https://idp.example.com/sso" />
  </md:IDPSSODescriptor>
</md:EntityDescriptor>`

describe('SAML metadata parser', () => {
  it('accepts namespace-prefixed metadata and extracts only namespace-owned fields', () => {
    const result = parseSamlMetadata(metadata, Date.parse('2030-01-01T00:00:00Z'))

    expect(result.status).toBe('valid')
    if (result.status !== 'valid') throw new Error('expected valid metadata')
    expect(result.value.entityId).toBe('https://idp.example.com')
    expect(result.value.sso).toEqual([
      { binding: 'redirect', location: 'https://idp.example.com/sso' },
    ])
    expect(result.value.keys).toEqual([{ use: 'signing', x509: 'CERTIFICATE' }])
    expect(result.value.warnings).toContain('Metadata validUntil expires within 30 days')
  })

  it('rejects malformed, dangerous, and wrong-namespace documents explicitly', () => {
    expect(parseSamlMetadata('<broken>').status).toBe('invalid')
    expect(parseSamlMetadata(`<!DOCTYPE x><EntityDescriptor />`).status).toBe('invalid')
    expect(
      parseSamlMetadata('<EntityDescriptor xmlns="https://example.com/not-saml" />').status
    ).toBe('invalid')
  })

  it('does not accept lookalike service and certificate elements in other namespaces', () => {
    const xml = metadata.replace(
      '</md:IDPSSODescriptor>',
      '<SingleSignOnService Binding="fake" Location="https://attacker.example" />' +
        '<X509Certificate>FAKE</X509Certificate></md:IDPSSODescriptor>'
    )
    const result = parseSamlMetadata(xml, Date.parse('2030-01-01T00:00:00Z'))

    expect(result.status).toBe('valid')
    if (result.status !== 'valid') throw new Error('expected valid metadata')
    expect(result.value.sso).toHaveLength(1)
    expect(result.value.keys[0]?.x509).toBe('CERTIFICATE')
  })
})
