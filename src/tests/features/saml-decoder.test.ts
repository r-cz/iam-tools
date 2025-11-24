import { describe, expect, it } from 'bun:test'
import { decodeSamlResponse } from '@/features/saml/utils/saml-decoder'

describe('SAML Response Decoder', () => {
  describe('decodeSamlResponse', () => {
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
