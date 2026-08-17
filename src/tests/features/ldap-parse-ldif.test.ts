import { describe, expect, it } from 'bun:test'
import { parseLdif } from '@/features/ldap/utils/parse-ldif'

describe('LDAP LDIF Parser', () => {
  describe('parseLdif', () => {
    it('should parse a simple LDIF entry', () => {
      const ldif = `dn: uid=jdoe,ou=people,dc=example,dc=com
objectClass: inetOrgPerson
uid: jdoe
cn: John Doe
sn: Doe
mail: jdoe@example.com`

      const result = parseLdif(ldif)

      expect(result.errors).toHaveLength(0)
      expect(result.records).toHaveLength(1)

      const entry = result.records[0]
      expect(entry.dn).toBe('uid=jdoe,ou=people,dc=example,dc=com')
      expect(entry.attributes['uid'].values).toContain('jdoe')
      expect(entry.attributes['cn'].values).toContain('John Doe')
      expect(entry.attributes['sn'].values).toContain('Doe')
      expect(entry.attributes['mail'].values).toContain('jdoe@example.com')
    })

    it('should handle multiple entries separated by blank lines', () => {
      const ldif = `dn: uid=jdoe,ou=people,dc=example,dc=com
uid: jdoe
cn: John Doe

dn: uid=asmith,ou=people,dc=example,dc=com
uid: asmith
cn: Alice Smith`

      const result = parseLdif(ldif)

      expect(result.errors).toHaveLength(0)
      expect(result.records).toHaveLength(2)
      expect(result.records[0].dn).toBe('uid=jdoe,ou=people,dc=example,dc=com')
      expect(result.records[1].dn).toBe('uid=asmith,ou=people,dc=example,dc=com')
    })

    it('should handle multi-valued attributes', () => {
      const ldif = `dn: cn=admin,dc=example,dc=com
objectClass: person
objectClass: organizationalPerson
objectClass: inetOrgPerson
cn: admin
mail: admin@example.com
mail: admin@corp.example.com`

      const result = parseLdif(ldif)

      expect(result.errors).toHaveLength(0)
      expect(result.records).toHaveLength(1)

      const entry = result.records[0]
      expect(entry.attributes['objectclass'].values).toHaveLength(3)
      expect(entry.attributes['objectclass'].values).toContain('person')
      expect(entry.attributes['objectclass'].values).toContain('organizationalPerson')
      expect(entry.attributes['objectclass'].values).toContain('inetOrgPerson')

      expect(entry.attributes['mail'].values).toHaveLength(2)
      expect(entry.attributes['mail'].values).toContain('admin@example.com')
      expect(entry.attributes['mail'].values).toContain('admin@corp.example.com')
    })

    it('should handle line folding (continuation lines)', () => {
      const ldif = `dn: cn=Very Long Common Name That Needs To Be Folded,
 ou=people,dc=example,dc=com
description: This is a very long description that spans
  multiple lines and should be unfolded correctly by
  the parser
cn: Short Name`

      const result = parseLdif(ldif)

      expect(result.errors).toHaveLength(0)
      expect(result.records).toHaveLength(1)

      const entry = result.records[0]
      expect(entry.dn).toBe(
        'cn=Very Long Common Name That Needs To Be Folded,ou=people,dc=example,dc=com'
      )
      expect(entry.attributes['description'].values[0]).toContain('multiple lines')
      expect(entry.attributes['description'].values[0]).not.toContain('\n')
    })

    it('should handle base64-encoded values', () => {
      const ldif = `dn: uid=test,dc=example,dc=com
cn: Test User
description:: VGhpcyBpcyBhIGJhc2U2NC1lbmNvZGVkIHZhbHVl`

      const result = parseLdif(ldif)

      expect(result.errors).toHaveLength(0)
      expect(result.records).toHaveLength(1)

      const entry = result.records[0]
      expect(entry.attributes['description']).toBeDefined()
      // The value should be decoded from base64
      expect(entry.attributes['description'].values[0]).toBeTruthy()
    })

    it('should parse attribute options from attribute names', () => {
      const ldif = `dn: uid=intl,dc=example,dc=com
cn: International User
cn;lang-en: English Name
cn;lang-fr: Nom Français`

      const result = parseLdif(ldif)

      expect(result.errors).toHaveLength(0)
      expect(result.records).toHaveLength(1)

      const entry = result.records[0]
      // All cn attributes (with different options) are merged under the 'cn' key
      expect(entry.attributes['cn']).toBeDefined()
      expect(entry.attributes['cn'].values).toHaveLength(3)
      expect(entry.attributes['cn'].values).toContain('International User')
      expect(entry.attributes['cn'].values).toContain('English Name')
      expect(entry.attributes['cn'].values).toContain('Nom Français')
      // The first cn attribute has no options
      expect(entry.attributes['cn'].options).toHaveLength(0)
    })

    it('should skip comment lines', () => {
      const ldif = `# This is a comment
dn: uid=test,dc=example,dc=com
# Another comment
cn: Test User
# Final comment`

      const result = parseLdif(ldif)

      expect(result.errors).toHaveLength(0)
      expect(result.records).toHaveLength(1)
      expect(result.records[0].attributes['cn'].values).toContain('Test User')
    })

    it('should return empty result for empty input', () => {
      const result = parseLdif('')

      expect(result.records).toHaveLength(0)
      expect(result.errors).toHaveLength(0)
    })

    it('should return empty result for whitespace-only input', () => {
      const result = parseLdif('   \n\n   \t\t\n  ')

      expect(result.records).toHaveLength(0)
      expect(result.errors).toHaveLength(0)
    })

    it('should handle entries with missing DN', () => {
      const ldif = `objectClass: person
cn: No DN Entry`

      const result = parseLdif(ldif)

      expect(result.records).toHaveLength(0)
      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.errors[0]).toContain('distinguished name')
    })

    it('should handle malformed attribute lines', () => {
      const ldif = `dn: uid=test,dc=example,dc=com
cn: Valid Attribute
malformed line without colon
sn: Last Name`

      const result = parseLdif(ldif)

      expect(result.records).toHaveLength(1)
      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.errors[0]).toContain('Could not parse line')
    })

    it('should normalize line endings (CRLF to LF)', () => {
      const ldif = 'dn: uid=test,dc=example,dc=com\r\ncn: Test User\r\nmail: test@example.com\r\n'

      const result = parseLdif(ldif)

      expect(result.errors).toHaveLength(0)
      expect(result.records).toHaveLength(1)
      expect(result.records[0].attributes['cn'].values).toContain('Test User')
    })

    it('should handle tab-based line folding', () => {
      const ldif = `dn: uid=test,dc=example,dc=com
description: First line
\tsecond line with tab continuation`

      const result = parseLdif(ldif)

      expect(result.errors).toHaveLength(0)
      expect(result.records).toHaveLength(1)
      expect(result.records[0].attributes['description'].values[0]).toContain('second line')
    })

    it('should preserve case in attribute names but use lowercase for keys', () => {
      const ldif = `dn: uid=test,dc=example,dc=com
givenName: John
GIVENNAME: Should be merged
GivenName: Also merged`

      const result = parseLdif(ldif)

      expect(result.errors).toHaveLength(0)
      expect(result.records).toHaveLength(1)

      const entry = result.records[0]
      expect(entry.attributes['givenname']).toBeDefined()
      expect(entry.attributes['givenname'].values).toHaveLength(3)
      expect(entry.attributes['givenname'].name).toBe('givenName') // First occurrence preserved
    })

    it('should handle complex DN with special characters', () => {
      const ldif = `dn: cn=John Doe\\, Jr.,ou=Sales+ou=Marketing,dc=example,dc=com
cn: John Doe, Jr.`

      const result = parseLdif(ldif)

      expect(result.errors).toHaveLength(0)
      expect(result.records).toHaveLength(1)
      expect(result.records[0].dn).toContain('John Doe\\, Jr.')
    })

    it('should handle LDIF modification separator (-)', () => {
      const ldif = `dn: cn=engineering,ou=groups,dc=example,dc=com
changetype: modify
replace: uniqueMember
uniqueMember: uid=jdoe,ou=people,dc=example,dc=com
uniqueMember: uid=adoe,ou=people,dc=example,dc=com
-`

      const result = parseLdif(ldif)

      expect(result.errors).toHaveLength(0)
      expect(result.records).toHaveLength(1)
      expect(result.records[0].kind).toBe('modify')
      if (result.records[0].kind !== 'modify') throw new Error('expected modify record')
      expect(result.records[0].modifications).toEqual([
        {
          operation: 'replace',
          attribute: 'uniqueMember',
          options: [],
          values: ['uid=jdoe,ou=people,dc=example,dc=com', 'uid=adoe,ou=people,dc=example,dc=com'],
          rawLines: [
            'replace: uniqueMember',
            'uniqueMember: uid=jdoe,ou=people,dc=example,dc=com',
            'uniqueMember: uid=adoe,ou=people,dc=example,dc=com',
          ],
        },
      ])
    })

    it('should handle multiple modification operations with separators', () => {
      const ldif = `dn: uid=jdoe,ou=people,dc=example,dc=com
changetype: modify
replace: mail
mail: newemail@example.com
-
add: telephoneNumber
telephoneNumber: +1-555-1234
-
delete: description
-`

      const result = parseLdif(ldif)

      expect(result.errors).toHaveLength(0)
      expect(result.records).toHaveLength(1)

      const entry = result.records[0]
      expect(entry.kind).toBe('modify')
      if (entry.kind !== 'modify') throw new Error('expected modify record')
      expect(entry.modifications.map((item) => item.operation)).toEqual([
        'replace',
        'add',
        'delete',
      ])
      expect(entry.modifications[0].values).toEqual(['newemail@example.com'])
      expect(entry.modifications[1].values).toEqual(['+1-555-1234'])
      expect(entry.modifications[2].values).toEqual([])
    })

    it('should handle standalone dash without surrounding whitespace', () => {
      const ldif = `dn: cn=test,dc=example,dc=com
changetype: modify
add: member
member: uid=user1,ou=people,dc=example,dc=com
-
add: member
member: uid=user2,ou=people,dc=example,dc=com
-`

      const result = parseLdif(ldif)

      expect(result.errors).toHaveLength(0)
      expect(result.records).toHaveLength(1)
      expect(result.records[0].kind).toBe('modify')
      if (result.records[0].kind !== 'modify') throw new Error('expected modify record')
      expect(result.records[0].modifications).toHaveLength(2)
      expect(result.records[0].modifications.map((item) => item.values[0])).toEqual([
        'uid=user1,ou=people,dc=example,dc=com',
        'uid=user2,ou=people,dc=example,dc=com',
      ])
    })

    it('represents delete records and duplicate DNs without contradictory attributes', () => {
      const result = parseLdif(`dn: uid=test,dc=example,dc=com
changetype: delete

dn: UID=TEST,DC=EXAMPLE,DC=COM
cn: replacement`)

      expect(result.records.map((record) => record.kind)).toEqual(['delete', 'content'])
      expect(result.records.map((record) => record.sourceOrdinal)).toEqual([1, 2])
      expect(result.errors).toContain('Record 2: Duplicate dn from record 1')
    })
  })
})
