import { describe, expect, it } from 'bun:test'
import { decodeSamlResponse } from '@/features/saml/utils/saml-decoder'

describe('SAML Response Decoder', () => {
  describe('decodeSamlResponse', () => {
    it('decodes UTF-8 names, messages, and attribute values without corruption', () => {
      const xml = `<p:Response xmlns:p="urn:oasis:names:tc:SAML:2.0:protocol" xmlns:a="urn:oasis:names:tc:SAML:2.0:assertion">
        <a:Issuer>https://idp.example/日本</a:Issuer>
        <p:Status><p:StatusCode Value="urn:oasis:names:tc:SAML:2.0:status:Success"/><p:StatusMessage>Bienvenue, Zoë</p:StatusMessage></p:Status>
        <a:Assertion><a:Subject><a:NameID>josé@example.com</a:NameID></a:Subject>
          <a:AttributeStatement><a:Attribute Name="displayName"><a:AttributeValue>李明 🔐</a:AttributeValue></a:Attribute></a:AttributeStatement>
        </a:Assertion>
      </p:Response>`
      const base64 = btoa(
        Array.from(new TextEncoder().encode(xml), (byte) => String.fromCharCode(byte)).join('')
      )
      const result = decodeSamlResponse(base64)
      expect(result.xml).toBe(xml)
      expect(result.issuer).toBe('https://idp.example/日本')
      expect(result.statusMessage).toBe('Bienvenue, Zoë')
      expect(result.assertions[0].subject?.nameId).toBe('josé@example.com')
      expect(result.assertions[0].attributes[0].values).toEqual(['李明 🔐'])
    })

    it('rejects malformed UTF-8 and non-SAML response roots', () => {
      expect(() => decodeSamlResponse(btoa('\xff'))).toThrow('UTF-8')
      expect(() => decodeSamlResponse(btoa('<Response xmlns="urn:unrelated"/>'))).toThrow(
        'Not a valid SAML Response'
      )
      expect(() => decodeSamlResponse(btoa('<Response/>'))).toThrow('Not a valid SAML Response')
      expect(() => decodeSamlResponse(btoa('<!DOCTYPE Response><Response/>'))).toThrow('DOCTYPE')
    })

    it('keeps response and assertion fields within their namespace and owner', () => {
      const result = decodeSamlResponse(
        btoa(`<p:Response xmlns:p="urn:oasis:names:tc:SAML:2.0:protocol" xmlns:a="urn:oasis:names:tc:SAML:2.0:assertion" xmlns:x="urn:unrelated">
        <x:Issuer>wrong namespace</x:Issuer>
        <p:Extensions><a:Issuer>extension issuer</a:Issuer><p:Status><p:StatusCode Value="wrong"/></p:Status><a:Assertion ID="extension"/></p:Extensions>
        <p:Status><p:StatusCode Value="urn:oasis:names:tc:SAML:2.0:status:Success"/></p:Status>
        <a:Assertion ID="outer"><a:Issuer>assertion issuer</a:Issuer>
          <a:Advice><a:Assertion ID="nested"><a:Subject><a:NameID>nested subject</a:NameID></a:Subject></a:Assertion></a:Advice>
          <x:Subject><a:NameID>wrong subject</a:NameID></x:Subject>
          <a:AttributeStatement><x:Attribute Name="wrong"/><a:Attribute Name="first"><a:AttributeValue>one</a:AttributeValue></a:Attribute></a:AttributeStatement>
          <a:AttributeStatement><a:Attribute Name="second"><a:AttributeValue>two</a:AttributeValue></a:Attribute></a:AttributeStatement>
        </a:Assertion>
      </p:Response>`)
      )
      expect(result.issuer).toBe('')
      expect(result.status).toBe('Success')
      expect(result.assertions.map((assertion) => assertion.id)).toEqual(['outer'])
      expect(result.assertions[0].issuer).toBe('assertion issuer')
      expect(result.assertions[0].subject).toBeUndefined()
      expect(result.assertions[0].attributes.map((attribute) => attribute.name)).toEqual([
        'first',
        'second',
      ])
    })

    it('reads audience restrictions and authentication context through their SAML containers', () => {
      const result = decodeSamlResponse(
        btoa(`<p:Response xmlns:p="urn:oasis:names:tc:SAML:2.0:protocol" xmlns:a="urn:oasis:names:tc:SAML:2.0:assertion">
        <a:Assertion><a:Conditions><a:AudienceRestriction><a:Audience>https://sp.example</a:Audience></a:AudienceRestriction></a:Conditions>
          <a:AuthnStatement AuthnInstant="2026-01-01T00:00:00Z"><a:AuthnContext><a:AuthnContextClassRef>urn:example:password</a:AuthnContextClassRef></a:AuthnContext></a:AuthnStatement>
        </a:Assertion>
      </p:Response>`)
      )
      expect(result.assertions[0].conditions?.audiences).toEqual(['https://sp.example'])
      expect(result.assertions[0].authnStatement?.authnContext).toBe('urn:example:password')
    })

    it('should decode a valid base64-encoded SAML response', () => {
      const validSamlResponse = btoa(`<?xml version="1.0" encoding="UTF-8"?>
<samlp:Response xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
                xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
                ID="_response123"
                Version="2.0"
                IssueInstant="2024-01-01T00:00:00Z"
                Destination="https://sp.example.com/acs">
  <saml:Issuer>https://idp.example.com</saml:Issuer>
  <samlp:Status>
    <samlp:StatusCode Value="urn:oasis:names:tc:SAML:2.0:status:Success"/>
  </samlp:Status>
  <saml:Assertion ID="_assertion123" Version="2.0" IssueInstant="2024-01-01T00:00:00Z">
    <saml:Issuer>https://idp.example.com</saml:Issuer>
    <saml:Subject>
      <saml:NameID Format="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress">user@example.com</saml:NameID>
    </saml:Subject>
    <saml:Conditions NotBefore="2024-01-01T00:00:00Z" NotOnOrAfter="2024-01-01T01:00:00Z"/>
    <saml:AttributeStatement>
      <saml:Attribute Name="email">
        <saml:AttributeValue>user@example.com</saml:AttributeValue>
      </saml:Attribute>
    </saml:AttributeStatement>
  </saml:Assertion>
</samlp:Response>`)

      const result = decodeSamlResponse(validSamlResponse)

      expect(result.xml).toContain('samlp:Response')
      expect(result.issuer).toBe('https://idp.example.com')
      expect(result.status).toBe('Success')
    })

    it('should handle SAML responses with whitespace', () => {
      const samlXml = `<?xml version="1.0" encoding="UTF-8"?>
<samlp:Response xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
                xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
                ID="_response"
                Version="2.0"
                IssueInstant="2024-01-01T00:00:00Z">
  <saml:Issuer>https://idp.example.com</saml:Issuer>
  <samlp:Status>
    <samlp:StatusCode Value="urn:oasis:names:tc:SAML:2.0:status:Success"/>
  </samlp:Status>
</samlp:Response>`
      // Base64 with added whitespace (should be stripped by the decoder)
      const base64WithWhitespace = btoa(samlXml).replace(/(.{20})/g, '$1\n')

      const result = decodeSamlResponse(base64WithWhitespace)

      expect(result.xml).toContain('samlp:Response')
      expect(result.issuer).toBe('https://idp.example.com')
    })

    it('should throw error for invalid base64', () => {
      const invalidBase64 = 'not-valid-base64!!!'

      expect(() => decodeSamlResponse(invalidBase64)).toThrow('base64')
    })

    it('should throw error for non-XML content', () => {
      const nonXml = btoa('This is not XML content')

      expect(() => decodeSamlResponse(nonXml)).toThrow('XML')
    })

    it('should extract assertion attributes correctly', () => {
      const responseWithAttributes = btoa(`<?xml version="1.0" encoding="UTF-8"?>
<samlp:Response xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
                xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
                ID="_response"
                Version="2.0"
                IssueInstant="2024-01-01T00:00:00Z">
  <saml:Issuer>https://idp.example.com</saml:Issuer>
  <samlp:Status>
    <samlp:StatusCode Value="urn:oasis:names:tc:SAML:2.0:status:Success"/>
  </samlp:Status>
  <saml:Assertion ID="_assertion" Version="2.0" IssueInstant="2024-01-01T00:00:00Z">
    <saml:Issuer>https://idp.example.com</saml:Issuer>
    <saml:AttributeStatement>
      <saml:Attribute Name="firstName">
        <saml:AttributeValue>John</saml:AttributeValue>
      </saml:Attribute>
      <saml:Attribute Name="lastName">
        <saml:AttributeValue>Doe</saml:AttributeValue>
      </saml:Attribute>
      <saml:Attribute Name="roles">
        <saml:AttributeValue>admin</saml:AttributeValue>
        <saml:AttributeValue>user</saml:AttributeValue>
      </saml:Attribute>
    </saml:AttributeStatement>
  </saml:Assertion>
</samlp:Response>`)

      const result = decodeSamlResponse(responseWithAttributes)

      expect(result.assertions).toBeDefined()
      expect(result.assertions.length).toBeGreaterThan(0)

      const assertion = result.assertions[0]
      const attributes = assertion.attributes
      expect(attributes.length).toBeGreaterThan(0)

      const firstNameAttr = attributes.find((attr) => attr.name === 'firstName')
      expect(firstNameAttr?.values).toContain('John')

      const rolesAttr = attributes.find((attr) => attr.name === 'roles')
      expect(rolesAttr?.values).toContain('admin')
      expect(rolesAttr?.values).toContain('user')
    })

    it('should identify status codes correctly', () => {
      const failureResponse = btoa(`<?xml version="1.0" encoding="UTF-8"?>
<samlp:Response xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
                xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
                ID="_response"
                Version="2.0"
                IssueInstant="2024-01-01T00:00:00Z">
  <saml:Issuer>https://idp.example.com</saml:Issuer>
  <samlp:Status>
    <samlp:StatusCode Value="urn:oasis:names:tc:SAML:2.0:status:Requester"/>
    <samlp:StatusMessage>Authentication failed</samlp:StatusMessage>
  </samlp:Status>
</samlp:Response>`)

      const result = decodeSamlResponse(failureResponse)

      expect(result.status).toBe('Requester')
      expect(result.statusMessage).toBe('Authentication failed')
    })

    it('should handle responses without assertions gracefully', () => {
      const noAssertionResponse = btoa(`<?xml version="1.0" encoding="UTF-8"?>
<samlp:Response xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
                xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
                ID="_response"
                Version="2.0"
                IssueInstant="2024-01-01T00:00:00Z">
  <saml:Issuer>https://idp.example.com</saml:Issuer>
  <samlp:Status>
    <samlp:StatusCode Value="urn:oasis:names:tc:SAML:2.0:status:Success"/>
  </samlp:Status>
</samlp:Response>`)

      const result = decodeSamlResponse(noAssertionResponse)

      expect(result.xml).toContain('samlp:Response')
      expect(result.status).toBe('Success')
      expect(result.assertions).toHaveLength(0)
    })
  })
})
