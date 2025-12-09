import { describe, expect, it } from 'bun:test'
import { formatXml } from '@/lib/format/xml'

describe('XML Format Utilities', () => {
  describe('formatXml', () => {
    it('should format a simple XML element', () => {
      const xml = '<root><child>content</child></root>'
      const result = formatXml(xml)

      expect(result).toContain('<root>')
      expect(result).toContain('<child>content</child>')
      expect(result).toContain('</root>')
    })

    it('should add newlines between elements', () => {
      const xml = '<root><child1>a</child1><child2>b</child2></root>'
      const result = formatXml(xml)
      const lines = result.split('\n').filter((l) => l.trim())

      expect(lines.length).toBeGreaterThan(1)
    })

    it('should indent nested elements', () => {
      const xml = '<root><parent><child>value</child></parent></root>'
      const result = formatXml(xml)

      // Check that child elements are indented
      const lines = result.split('\n')
      const childLine = lines.find((l) => l.includes('<child>'))

      expect(childLine).toBeDefined()
      expect(childLine?.startsWith('  ')).toBe(true) // At least 2 spaces of indent
    })

    it('should handle self-closing tags', () => {
      const xml = '<root><empty /></root>'
      const result = formatXml(xml)

      expect(result).toContain('<empty />')
    })

    it('should handle attributes in tags', () => {
      const xml = '<root attr="value"><child id="1" class="test">content</child></root>'
      const result = formatXml(xml)

      expect(result).toContain('attr="value"')
      expect(result).toContain('id="1"')
      expect(result).toContain('class="test"')
    })

    it('should handle XML declarations', () => {
      const xml = '<?xml version="1.0" encoding="UTF-8"?><root><child>content</child></root>'
      const result = formatXml(xml)

      expect(result).toContain('<?xml')
      expect(result).toContain('<root>')
    })

    it('should handle comments', () => {
      const xml = '<root><!-- This is a comment --><child>content</child></root>'
      const result = formatXml(xml)

      expect(result).toContain('<!-- This is a comment -->')
    })

    it('should handle CDATA sections', () => {
      const xml = '<root><![CDATA[Some <special> content]]></root>'
      const result = formatXml(xml)

      expect(result).toContain('<![CDATA[')
    })

    it('should handle namespaced elements', () => {
      const xml =
        '<samlp:Response xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"><saml:Issuer>issuer</saml:Issuer></samlp:Response>'
      const result = formatXml(xml)

      expect(result).toContain('samlp:Response')
      expect(result).toContain('saml:Issuer')
    })

    it('should handle deeply nested structures', () => {
      const xml = '<a><b><c><d><e>deep</e></d></c></b></a>'
      const result = formatXml(xml)
      const lines = result.split('\n')

      // Find the deepest element
      const deepLine = lines.find((l) => l.includes('<e>deep</e>'))
      expect(deepLine).toBeDefined()

      // Should have multiple levels of indentation
      const indent = deepLine?.match(/^(\s*)/)?.[1]?.length || 0
      expect(indent).toBeGreaterThanOrEqual(6) // At least 3 levels * 2 spaces
    })

    it('should return original XML on error', () => {
      // formatXml uses try-catch, so even malformed input should return something
      const malformed = '<root><unclosed>'
      const result = formatXml(malformed)

      // Should return something (either formatted attempt or original)
      expect(typeof result).toBe('string')
      expect(result.length).toBeGreaterThan(0)
    })

    it('should handle empty string', () => {
      const result = formatXml('')

      expect(result).toBe('')
    })

    it('should handle whitespace-only input', () => {
      const result = formatXml('   \n\t  ')

      expect(typeof result).toBe('string')
    })

    it('should handle already formatted XML', () => {
      const formatted = `<root>
  <child>content</child>
</root>`
      const result = formatXml(formatted)

      expect(result).toContain('<root>')
      expect(result).toContain('<child>content</child>')
    })

    it('should handle elements with text content on same line', () => {
      const xml = '<root><name>John Doe</name></root>'
      const result = formatXml(xml)

      // Name and content should stay together
      expect(result).toContain('<name>John Doe</name>')
    })

    it('should handle mixed content', () => {
      const xml = '<root>Text before<child>inside</child>Text after</root>'
      const result = formatXml(xml)

      expect(result).toContain('<child>inside</child>')
    })

    it('should handle multiple root-level siblings when given', () => {
      const xml = '<item1>a</item1><item2>b</item2>'
      const result = formatXml(xml)

      expect(result).toContain('<item1>a</item1>')
      expect(result).toContain('<item2>b</item2>')
    })

    it('should handle SAML-like structures', () => {
      const samlResponse = `<samlp:Response xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol" ID="_response123" Version="2.0"><saml:Issuer xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion">https://idp.example.com</saml:Issuer><samlp:Status><samlp:StatusCode Value="urn:oasis:names:tc:SAML:2.0:status:Success" /></samlp:Status></samlp:Response>`

      const result = formatXml(samlResponse)

      expect(result).toContain('samlp:Response')
      expect(result).toContain('saml:Issuer')
      expect(result).toContain('samlp:Status')
      expect(result).toContain('samlp:StatusCode')

      // Should have multiple lines
      const lines = result.split('\n').filter((l) => l.trim())
      expect(lines.length).toBeGreaterThan(1)
    })
  })
})
