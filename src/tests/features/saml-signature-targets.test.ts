import { describe, expect, test } from 'bun:test'
import { decodeSamlResponse } from '@/features/saml/utils/saml-decoder'
import {
  findDirectXmlDsigSignature,
  findMetadataEntityDescriptor,
  findSamlAssertionElements,
} from '@/features/saml/utils/signature-targets'

const responseXml = `
<samlp:Response xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
  xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
  xmlns:sig="http://www.w3.org/2000/09/xmldsig#" ID="response-1">
  <saml:Issuer>https://idp.example.com</saml:Issuer>
  <samlp:Status><samlp:StatusCode Value="urn:oasis:names:tc:SAML:2.0:status:Success"/></samlp:Status>
  <saml:Assertion ID="assertion-1">
    <saml:Issuer>https://idp.example.com</saml:Issuer>
    <sig:Signature />
  </saml:Assertion>
</samlp:Response>`

describe('SAML signature target ownership', () => {
  test('does not treat a direct assertion signature as a response signature', () => {
    const document = new DOMParser().parseFromString(responseXml, 'application/xml')
    const response = document.documentElement
    const assertions = findSamlAssertionElements(response)

    expect(findDirectXmlDsigSignature(response)).toBeNull()
    expect(assertions).toHaveLength(1)
    expect(findDirectXmlDsigSignature(assertions[0])?.localName).toBe('Signature')

    const decoded = decodeSamlResponse(btoa(responseXml))
    expect(decoded.hasSignature).toBe(false)
    expect(decoded.assertions[0]?.hasSignature).toBe(true)
  })

  test('finds only a namespace-correct direct response signature', () => {
    const document = new DOMParser().parseFromString(
      responseXml.replace(
        '<saml:Issuer>https://idp.example.com</saml:Issuer>',
        '<saml:Issuer>https://idp.example.com</saml:Issuer><sig:Signature />'
      ),
      'application/xml'
    )

    expect(findDirectXmlDsigSignature(document.documentElement)?.namespaceURI).toBe(
      'http://www.w3.org/2000/09/xmldsig#'
    )
  })

  test('locates metadata entities by namespace rather than prefix', () => {
    const document = new DOMParser().parseFromString(
      '<md:EntityDescriptor xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata" entityID="idp"/>',
      'application/xml'
    )
    expect(findMetadataEntityDescriptor(document)?.getAttribute('entityID')).toBe('idp')
  })
})
