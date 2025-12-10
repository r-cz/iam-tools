import { describe, expect, it } from 'bun:test'
import {
  buildAuthnRequestXml,
  encodeBase64,
  deflateRawToBase64,
} from '@/features/saml/utils/saml-request'

describe('SAML Request Utilities', () => {
  describe('buildAuthnRequestXml', () => {
    it('should build a valid SAML AuthnRequest XML', () => {
      const xml = buildAuthnRequestXml({
        issuer: 'https://sp.example.com',
        destination: 'https://idp.example.com/sso',
        acsUrl: 'https://sp.example.com/acs',
        nameIdFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
      })

      expect(xml).toContain('<samlp:AuthnRequest')
      expect(xml).toContain('xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"')
      expect(xml).toContain('xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"')
      expect(xml).toContain('Version="2.0"')
      expect(xml).toContain('Destination="https://idp.example.com/sso"')
      expect(xml).toContain('AssertionConsumerServiceURL="https://sp.example.com/acs"')
      expect(xml).toContain('<saml:Issuer>https://sp.example.com</saml:Issuer>')
      expect(xml).toContain('Format="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress"')
    })

    it('should include ForceAuthn when set to true', () => {
      const xml = buildAuthnRequestXml({
        issuer: 'https://sp.example.com',
        destination: 'https://idp.example.com/sso',
        acsUrl: 'https://sp.example.com/acs',
        nameIdFormat: 'urn:oasis:names:tc:SAML:2.0:nameid-format:persistent',
        forceAuthn: true,
      })

      expect(xml).toContain('ForceAuthn="true"')
    })

    it('should include ForceAuthn="false" when set to false', () => {
      const xml = buildAuthnRequestXml({
        issuer: 'https://sp.example.com',
        destination: 'https://idp.example.com/sso',
        acsUrl: 'https://sp.example.com/acs',
        nameIdFormat: 'urn:oasis:names:tc:SAML:2.0:nameid-format:persistent',
        forceAuthn: false,
      })

      expect(xml).toContain('ForceAuthn="false"')
    })

    it('should not include ForceAuthn when undefined', () => {
      const xml = buildAuthnRequestXml({
        issuer: 'https://sp.example.com',
        destination: 'https://idp.example.com/sso',
        acsUrl: 'https://sp.example.com/acs',
        nameIdFormat: 'urn:oasis:names:tc:SAML:2.0:nameid-format:persistent',
      })

      expect(xml).not.toContain('ForceAuthn')
    })

    it('should include IsPassive when set to true', () => {
      const xml = buildAuthnRequestXml({
        issuer: 'https://sp.example.com',
        destination: 'https://idp.example.com/sso',
        acsUrl: 'https://sp.example.com/acs',
        nameIdFormat: 'urn:oasis:names:tc:SAML:2.0:nameid-format:persistent',
        isPassive: true,
      })

      expect(xml).toContain('IsPassive="true"')
    })

    it('should use provided requestId', () => {
      const xml = buildAuthnRequestXml({
        issuer: 'https://sp.example.com',
        destination: 'https://idp.example.com/sso',
        acsUrl: 'https://sp.example.com/acs',
        nameIdFormat: 'urn:oasis:names:tc:SAML:2.0:nameid-format:persistent',
        requestId: '_custom-request-id-123',
      })

      expect(xml).toContain('ID="_custom-request-id-123"')
    })

    it('should generate a UUID-based ID when requestId is not provided', () => {
      const xml = buildAuthnRequestXml({
        issuer: 'https://sp.example.com',
        destination: 'https://idp.example.com/sso',
        acsUrl: 'https://sp.example.com/acs',
        nameIdFormat: 'urn:oasis:names:tc:SAML:2.0:nameid-format:persistent',
      })

      // Should have an ID starting with underscore followed by UUID
      expect(xml).toMatch(/ID="_[a-f0-9-]+"/)
    })

    it('should include IssueInstant in ISO format', () => {
      const xml = buildAuthnRequestXml({
        issuer: 'https://sp.example.com',
        destination: 'https://idp.example.com/sso',
        acsUrl: 'https://sp.example.com/acs',
        nameIdFormat: 'urn:oasis:names:tc:SAML:2.0:nameid-format:persistent',
      })

      // Should have ISO 8601 timestamp
      expect(xml).toMatch(/IssueInstant="\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z"/)
    })

    it('should include HTTP-POST protocol binding', () => {
      const xml = buildAuthnRequestXml({
        issuer: 'https://sp.example.com',
        destination: 'https://idp.example.com/sso',
        acsUrl: 'https://sp.example.com/acs',
        nameIdFormat: 'urn:oasis:names:tc:SAML:2.0:nameid-format:persistent',
      })

      expect(xml).toContain('ProtocolBinding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"')
    })

    it('should include NameIDPolicy with AllowCreate', () => {
      const xml = buildAuthnRequestXml({
        issuer: 'https://sp.example.com',
        destination: 'https://idp.example.com/sso',
        acsUrl: 'https://sp.example.com/acs',
        nameIdFormat: 'urn:oasis:names:tc:SAML:2.0:nameid-format:persistent',
      })

      expect(xml).toContain('<samlp:NameIDPolicy AllowCreate="true"')
    })

    it('should include RequestedAuthnContext', () => {
      const xml = buildAuthnRequestXml({
        issuer: 'https://sp.example.com',
        destination: 'https://idp.example.com/sso',
        acsUrl: 'https://sp.example.com/acs',
        nameIdFormat: 'urn:oasis:names:tc:SAML:2.0:nameid-format:persistent',
      })

      expect(xml).toContain('<samlp:RequestedAuthnContext Comparison="exact">')
      expect(xml).toContain('urn:oasis:names:tc:SAML:2.0:ac:classes:PasswordProtectedTransport')
    })

    it('should escape XML special characters in issuer', () => {
      const xml = buildAuthnRequestXml({
        issuer: 'https://sp.example.com?foo=bar&baz=qux',
        destination: 'https://idp.example.com/sso',
        acsUrl: 'https://sp.example.com/acs',
        nameIdFormat: 'urn:oasis:names:tc:SAML:2.0:nameid-format:persistent',
      })

      expect(xml).toContain('&amp;')
      expect(xml).not.toContain('&baz') // Should be escaped
    })

    it('should escape XML special characters in attributes', () => {
      const xml = buildAuthnRequestXml({
        issuer: 'https://sp.example.com',
        destination: 'https://idp.example.com/sso?param="value"',
        acsUrl: 'https://sp.example.com/acs',
        nameIdFormat: 'urn:oasis:names:tc:SAML:2.0:nameid-format:persistent',
      })

      expect(xml).toContain('&quot;')
    })
  })

  describe('encodeBase64', () => {
    it('should encode a simple string', () => {
      const result = encodeBase64('Hello, World!')

      expect(result).toBe('SGVsbG8sIFdvcmxkIQ==')
    })

    it('should encode an empty string', () => {
      const result = encodeBase64('')

      expect(result).toBe('')
    })

    it('should encode UTF-8 characters', () => {
      const result = encodeBase64('こんにちは')

      // Should be valid base64
      expect(result).toMatch(/^[A-Za-z0-9+/=]+$/)
      expect(result.length).toBeGreaterThan(0)
    })

    it('should handle special characters', () => {
      const result = encodeBase64('<xml>test</xml>')

      // Verify it's valid base64
      expect(() => atob(result)).not.toThrow()
    })

    it('should produce consistent output', () => {
      const input = 'test string'
      const result1 = encodeBase64(input)
      const result2 = encodeBase64(input)

      expect(result1).toBe(result2)
    })
  })

  describe('deflateRawToBase64', () => {
    it('should compress and encode a string', async () => {
      const result = await deflateRawToBase64('Hello, World!')

      // Should be valid base64
      expect(result).toMatch(/^[A-Za-z0-9+/=]+$/)
    })

    it('should produce compressed output smaller than input for large strings', async () => {
      const input = 'A'.repeat(1000)
      const result = await deflateRawToBase64(input)

      // Compressed base64 should be smaller than original
      expect(result.length).toBeLessThan(input.length)
    })

    it('should produce different output than plain base64', async () => {
      const input = '<samlp:AuthnRequest>Test content here</samlp:AuthnRequest>'
      const deflated = await deflateRawToBase64(input)
      const plain = encodeBase64(input)

      expect(deflated).not.toBe(plain)
    })

    it('should handle empty string', async () => {
      const result = await deflateRawToBase64('')

      // Even empty string produces some output due to deflate header
      expect(typeof result).toBe('string')
    })

    it('should handle XML content', async () => {
      const xml = buildAuthnRequestXml({
        issuer: 'https://sp.example.com',
        destination: 'https://idp.example.com/sso',
        acsUrl: 'https://sp.example.com/acs',
        nameIdFormat: 'urn:oasis:names:tc:SAML:2.0:nameid-format:emailAddress',
      })

      const result = await deflateRawToBase64(xml)

      expect(result).toMatch(/^[A-Za-z0-9+/=]+$/)
      expect(result.length).toBeGreaterThan(0)
    })

    it('should handle UTF-8 content', async () => {
      const result = await deflateRawToBase64('Unicode: 日本語')

      expect(result).toMatch(/^[A-Za-z0-9+/=]+$/)
    })
  })

  describe('integration: full SAML request flow', () => {
    it('should build, deflate, and encode a complete AuthnRequest', async () => {
      // Build the XML
      const xml = buildAuthnRequestXml({
        issuer: 'https://my-app.example.com',
        destination: 'https://idp.company.com/saml/sso',
        acsUrl: 'https://my-app.example.com/saml/acs',
        nameIdFormat: 'urn:oasis:names:tc:SAML:2.0:nameid-format:emailAddress',
        forceAuthn: false,
        requestId: '_test-request-123',
      })

      // Deflate and encode for HTTP-Redirect binding
      const encoded = await deflateRawToBase64(xml)

      // Should produce URL-safe output after URL encoding
      const urlEncoded = encodeURIComponent(encoded)
      expect(urlEncoded).not.toContain('+')
      expect(urlEncoded).toMatch(/^[A-Za-z0-9%._~-]+$/)
    })
  })
})
