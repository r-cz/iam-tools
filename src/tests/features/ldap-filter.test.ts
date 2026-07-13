import { describe, expect, it } from 'bun:test'
import {
  encodeLdapFilterForUrl,
  escapeLdapFilterValue,
  explainLdapFilter,
  formatLdapFilter,
  parseLdapFilter,
  unescapeLdapFilterValue,
  validateLdapFilter,
  type LdapFilterAst,
} from '@/features/ldap-filter/utils'

describe('LDAP RFC 4515 filter utilities', () => {
  it('parses, formats, and explains nested boolean filters', () => {
    const input =
      '(&(|(objectClass=person)(objectClass=user))(!(accountStatus=disabled))(uid=jdoe))'
    const ast = parseLdapFilter(input)

    expect(ast.type).toBe('and')
    if (ast.type !== 'and') throw new Error('Expected an AND filter')
    expect(ast.children).toHaveLength(3)
    expect(ast.children[0].type).toBe('or')
    expect(ast.children[1].type).toBe('not')
    expect(formatLdapFilter(ast)).toBe(input)

    const pretty = formatLdapFilter(ast, true)
    expect(pretty).toContain('\n')
    expect(parseLdapFilter(pretty)).toEqual(ast)

    const explanation = explainLdapFilter(ast)
    expect(explanation).toContain('All of the following must match')
    expect(explanation).toContain('Any of the following may match')
    expect(explanation).toContain('The following must not match')
    expect(explanation).toContain('uid equals "jdoe"')
  })

  it('distinguishes presence, substring wildcards, and escaped literal asterisks', () => {
    expect(parseLdapFilter('(mail=*)')).toEqual({ type: 'presence', attribute: 'mail' })

    expect(parseLdapFilter('(cn=Jo*n*Doe)')).toEqual({
      type: 'substring',
      attribute: 'cn',
      initial: 'Jo',
      any: ['n'],
      final: 'Doe',
    })

    expect(parseLdapFilter('(cn=literal\\2astar)')).toEqual({
      type: 'equality',
      attribute: 'cn',
      value: 'literal*star',
    })

    const repeatedWildcard = parseLdapFilter('(cn=**)')
    expect(repeatedWildcard).toEqual({
      type: 'substring',
      attribute: 'cn',
      initial: undefined,
      any: [''],
      final: undefined,
    })
    expect(formatLdapFilter(repeatedWildcard)).toBe('(cn=**)')
  })

  it('escapes assertion values so user input cannot inject another filter', () => {
    const unsafe = 'alice*)(|(uid=*))'
    const escaped = escapeLdapFilterValue(unsafe)

    expect(escaped).toBe('alice\\2a\\29\\28|\\28uid=\\2a\\29\\29')
    expect(unescapeLdapFilterValue(escaped)).toBe(unsafe)

    const ast: LdapFilterAst = { type: 'equality', attribute: 'uid', value: unsafe }
    const formatted = formatLdapFilter(ast)
    expect(formatted).toBe('(uid=alice\\2a\\29\\28|\\28uid=\\2a\\29\\29)')
    expect(parseLdapFilter(formatted)).toEqual(ast)
  })

  it('decodes escaped UTF-8 octets without corrupting multi-byte characters', () => {
    expect(unescapeLdapFilterValue('Jos\\c3\\a9')).toBe('José')
    expect(unescapeLdapFilterValue('Price: \\e2\\82\\ac10')).toBe('Price: €10')

    const ast = parseLdapFilter('(cn=Jos\\c3\\a9)')
    expect(ast).toEqual({ type: 'equality', attribute: 'cn', value: 'José' })
    expect(formatLdapFilter(ast)).toBe('(cn=José)')
  })

  it('parses ordering and approximate comparison filters', () => {
    expect(parseLdapFilter('(uidNumber>=1000)')).toEqual({
      type: 'greaterOrEqual',
      attribute: 'uidNumber',
      value: '1000',
    })
    expect(parseLdapFilter('(pwdChangedTime<=20260713000000Z)')).toEqual({
      type: 'lessOrEqual',
      attribute: 'pwdChangedTime',
      value: '20260713000000Z',
    })
    expect(parseLdapFilter('(cn~=John Doe)')).toEqual({
      type: 'approx',
      attribute: 'cn',
      value: 'John Doe',
    })
  })

  it('strictly URL-encodes a canonical filter', () => {
    expect(encodeLdapFilterForUrl('(cn=John Doe)')).toBe('%28cn%3DJohn%20Doe%29')
    expect(encodeLdapFilterForUrl(parseLdapFilter('(mail=*)'))).toBe('%28mail%3D%2A%29')
  })

  it('rejects malformed filters and reports useful source positions', () => {
    const invalidFilters = [
      '(&(cn=Alice)(sn=Smith)',
      '(&)',
      '(!(cn=Alice)(sn=Smith))',
      '(cn=bad\\2)',
      '(cn=bad\\zz)',
      '(uidNumber>=1*2)',
      '(cn:caseExactMatch:=Alice)',
    ]

    for (const filter of invalidFilters) {
      const result = validateLdapFilter(filter)
      expect(result.valid).toBe(false)
      expect(result.ast).toBeNull()
      expect(result.diagnostics).toHaveLength(1)
      expect(result.diagnostics[0].message.length).toBeGreaterThan(8)
      expect(result.diagnostics[0].position).toBeGreaterThanOrEqual(0)
      expect(result.diagnostics[0].line).toBeGreaterThanOrEqual(1)
      expect(result.diagnostics[0].column).toBeGreaterThanOrEqual(1)
    }

    const trailing = validateLdapFilter('(cn=Alice) trailing')
    expect(trailing.valid).toBe(false)
    expect(trailing.diagnostics[0]).toMatchObject({
      position: 11,
      line: 1,
      column: 12,
    })
    expect(trailing.diagnostics[0].message).toContain('trailing input')
  })

  it('rejects malformed and incomplete escaped UTF-8 sequences', () => {
    expect(() => unescapeLdapFilterValue('bad\\c3')).toThrow('Incomplete UTF-8')
    expect(() => unescapeLdapFilterValue('bad\\a9')).toThrow('Invalid UTF-8')
    expect(() => parseLdapFilter('(cn=bad\\c3)')).toThrow('Incomplete UTF-8')
  })

  it('returns the parsed AST from successful validation', () => {
    const result = validateLdapFilter('  (cn=Alice)  ')
    expect(result.valid).toBe(true)
    expect(result.diagnostics).toEqual([])
    expect(result.ast).toEqual({ type: 'equality', attribute: 'cn', value: 'Alice' })
  })
})
