import { describe, expect, it } from 'bun:test'
import { renderHook } from '@testing-library/react'
import { useLdifValidation } from '@/features/ldap/hooks/useLdifValidation'
import type { LdifEntry } from '@/features/ldap/utils/parse-ldif'
import type { ParsedObjectClass } from '@/features/ldap/utils/parse-schema'

describe('useLdifValidation', () => {
  // Helper to create a schema details object
  function createSchemaDetails(
    attributes: Array<{ name: string; aliases?: string[] }>,
    objectClasses: Array<{
      name: string
      oid?: string
      must?: string[]
      may?: string[]
    }>
  ) {
    const attributeMap = new Map<string, { canonical: string; aliases: string[] }>()
    for (const attr of attributes) {
      const entry = {
        canonical: attr.name,
        aliases: [attr.name.toLowerCase(), ...(attr.aliases?.map((a) => a.toLowerCase()) || [])],
      }
      for (const alias of entry.aliases) {
        attributeMap.set(alias, entry)
      }
    }

    const objectClassMap = new Map<string, ParsedObjectClass>()
    for (const oc of objectClasses) {
      const parsed: ParsedObjectClass = {
        oid: oc.oid || `1.2.3.${Math.random()}`,
        names: [oc.name],
        description: '',
        type: 'STRUCTURAL',
        superior: [],
        must: oc.must || [],
        may: oc.may || [],
        raw: '',
      }
      objectClassMap.set(oc.name.toLowerCase(), parsed)
    }

    return { attributeMap, objectClassMap }
  }

  // Helper to create an LDIF entry
  function createEntry(dn: string, attrs: Record<string, string | string[]>): LdifEntry {
    const attributes: LdifEntry['attributes'] = {}

    for (const [key, value] of Object.entries(attrs)) {
      const values = Array.isArray(value) ? value : [value]
      attributes[key.toLowerCase()] = {
        name: key,
        options: [],
        values,
        rawLines: values.map((v) => `${key}: ${v}`),
      }
    }

    return {
      dn,
      attributes,
      lines: [],
    }
  }

  describe('basic validation', () => {
    it('should return empty results when schema is null', () => {
      const entries: LdifEntry[] = [createEntry('cn=test,dc=example,dc=com', { cn: 'test' })]

      const { result } = renderHook(() => useLdifValidation(entries, null))

      expect(result.current.unknownAttributes).toHaveLength(0)
      expect(result.current.unknownObjectClasses).toHaveLength(0)
      expect(result.current.missingRequired).toHaveLength(0)
    })

    it('should return empty results for empty entries', () => {
      const schemaDetails = createSchemaDetails(
        [{ name: 'cn' }],
        [{ name: 'person', must: ['cn'] }]
      )

      const { result } = renderHook(() => useLdifValidation([], schemaDetails))

      expect(result.current.unknownAttributes).toHaveLength(0)
      expect(result.current.unknownObjectClasses).toHaveLength(0)
      expect(result.current.missingRequired).toHaveLength(0)
    })
  })

  describe('unknown attributes', () => {
    it('should detect unknown attributes', () => {
      const schemaDetails = createSchemaDetails(
        [{ name: 'cn' }, { name: 'objectClass' }],
        [{ name: 'person' }]
      )

      const entries = [
        createEntry('cn=test,dc=example,dc=com', {
          cn: 'test',
          objectClass: 'person',
          unknownAttr: 'value',
        }),
      ]

      const { result } = renderHook(() => useLdifValidation(entries, schemaDetails))

      expect(result.current.unknownAttributes).toContain('unknownAttr')
    })

    it('should not flag known attributes', () => {
      const schemaDetails = createSchemaDetails(
        [{ name: 'cn' }, { name: 'sn' }, { name: 'objectClass' }],
        [{ name: 'person' }]
      )

      const entries = [
        createEntry('cn=test,dc=example,dc=com', {
          cn: 'test',
          sn: 'User',
          objectClass: 'person',
        }),
      ]

      const { result } = renderHook(() => useLdifValidation(entries, schemaDetails))

      expect(result.current.unknownAttributes).toHaveLength(0)
    })

    it('should not flag built-in attributes (dn, changetype, control)', () => {
      const schemaDetails = createSchemaDetails(
        [{ name: 'cn' }, { name: 'objectClass' }],
        [{ name: 'person' }]
      )

      const entries = [
        createEntry('cn=test,dc=example,dc=com', {
          cn: 'test',
          objectClass: 'person',
          changetype: 'add',
        }),
      ]

      const { result } = renderHook(() => useLdifValidation(entries, schemaDetails))

      expect(result.current.unknownAttributes).not.toContain('changetype')
    })

    it('should sort unknown attributes', () => {
      const schemaDetails = createSchemaDetails(
        [{ name: 'cn' }, { name: 'objectClass' }],
        [{ name: 'person' }]
      )

      const entries = [
        createEntry('cn=test,dc=example,dc=com', {
          cn: 'test',
          objectClass: 'person',
          zebra: 'value',
          apple: 'value',
          mango: 'value',
        }),
      ]

      const { result } = renderHook(() => useLdifValidation(entries, schemaDetails))

      expect(result.current.unknownAttributes).toEqual(['apple', 'mango', 'zebra'])
    })

    it('should deduplicate unknown attributes across entries', () => {
      const schemaDetails = createSchemaDetails(
        [{ name: 'cn' }, { name: 'objectClass' }],
        [{ name: 'person' }]
      )

      const entries = [
        createEntry('cn=test1,dc=example,dc=com', {
          cn: 'test1',
          objectClass: 'person',
          unknownAttr: 'value1',
        }),
        createEntry('cn=test2,dc=example,dc=com', {
          cn: 'test2',
          objectClass: 'person',
          unknownAttr: 'value2',
        }),
      ]

      const { result } = renderHook(() => useLdifValidation(entries, schemaDetails))

      expect(result.current.unknownAttributes).toHaveLength(1)
      expect(result.current.unknownAttributes).toContain('unknownAttr')
    })
  })

  describe('unknown object classes', () => {
    it('should detect unknown object classes', () => {
      const schemaDetails = createSchemaDetails(
        [{ name: 'cn' }, { name: 'objectClass' }],
        [{ name: 'person' }]
      )

      const entries = [
        createEntry('cn=test,dc=example,dc=com', {
          cn: 'test',
          objectClass: ['person', 'unknownClass'],
        }),
      ]

      const { result } = renderHook(() => useLdifValidation(entries, schemaDetails))

      expect(result.current.unknownObjectClasses).toContain('unknownClass')
    })

    it('should not flag known object classes', () => {
      const schemaDetails = createSchemaDetails(
        [{ name: 'cn' }, { name: 'objectClass' }],
        [{ name: 'person' }, { name: 'inetOrgPerson' }]
      )

      const entries = [
        createEntry('cn=test,dc=example,dc=com', {
          cn: 'test',
          objectClass: ['person', 'inetOrgPerson'],
        }),
      ]

      const { result } = renderHook(() => useLdifValidation(entries, schemaDetails))

      expect(result.current.unknownObjectClasses).toHaveLength(0)
    })

    it('should sort unknown object classes', () => {
      const schemaDetails = createSchemaDetails(
        [{ name: 'cn' }, { name: 'objectClass' }],
        [{ name: 'person' }]
      )

      const entries = [
        createEntry('cn=test,dc=example,dc=com', {
          cn: 'test',
          objectClass: ['person', 'zebra', 'apple'],
        }),
      ]

      const { result } = renderHook(() => useLdifValidation(entries, schemaDetails))

      expect(result.current.unknownObjectClasses).toEqual(['apple', 'zebra'])
    })
  })

  describe('missing required attributes', () => {
    it('should detect missing required attributes', () => {
      const schemaDetails = createSchemaDetails(
        [{ name: 'cn' }, { name: 'sn' }, { name: 'objectClass' }],
        [{ name: 'person', must: ['cn', 'sn'] }]
      )

      const entries = [
        createEntry('cn=test,dc=example,dc=com', {
          cn: 'test',
          objectClass: 'person',
          // Missing 'sn'
        }),
      ]

      const { result } = renderHook(() => useLdifValidation(entries, schemaDetails))

      expect(result.current.missingRequired).toHaveLength(1)
      expect(result.current.missingRequired[0].dn).toBe('cn=test,dc=example,dc=com')
      expect(result.current.missingRequired[0].objectClass).toBe('person')
      expect(result.current.missingRequired[0].attributes).toContain('sn')
    })

    it('should not flag when all required attributes are present', () => {
      const schemaDetails = createSchemaDetails(
        [{ name: 'cn' }, { name: 'sn' }, { name: 'objectClass' }],
        [{ name: 'person', must: ['cn', 'sn'] }]
      )

      const entries = [
        createEntry('cn=test,dc=example,dc=com', {
          cn: 'test',
          sn: 'User',
          objectClass: 'person',
        }),
      ]

      const { result } = renderHook(() => useLdifValidation(entries, schemaDetails))

      expect(result.current.missingRequired).toHaveLength(0)
    })

    it('should handle attribute aliases for required checks', () => {
      const schemaDetails = createSchemaDetails(
        [
          { name: 'cn', aliases: ['commonName'] },
          { name: 'sn', aliases: ['surname'] },
          { name: 'objectClass' },
        ],
        [{ name: 'person', must: ['cn', 'sn'] }]
      )

      const entries = [
        createEntry('cn=test,dc=example,dc=com', {
          commonName: 'test', // Using alias
          surname: 'User', // Using alias
          objectClass: 'person',
        }),
      ]

      const { result } = renderHook(() => useLdifValidation(entries, schemaDetails))

      expect(result.current.missingRequired).toHaveLength(0)
    })

    it('should check required attributes for each object class', () => {
      const schemaDetails = createSchemaDetails(
        [{ name: 'cn' }, { name: 'sn' }, { name: 'uid' }, { name: 'objectClass' }],
        [
          { name: 'person', must: ['cn', 'sn'] },
          { name: 'uidObject', must: ['uid'] },
        ]
      )

      const entries = [
        createEntry('cn=test,dc=example,dc=com', {
          cn: 'test',
          sn: 'User',
          objectClass: ['person', 'uidObject'],
          // Missing 'uid' for uidObject
        }),
      ]

      const { result } = renderHook(() => useLdifValidation(entries, schemaDetails))

      expect(result.current.missingRequired).toHaveLength(1)
      expect(result.current.missingRequired[0].objectClass).toBe('uidObject')
      expect(result.current.missingRequired[0].attributes).toContain('uid')
    })

    it('should skip required checks for unknown object classes', () => {
      const schemaDetails = createSchemaDetails(
        [{ name: 'cn' }, { name: 'objectClass' }],
        [{ name: 'person', must: ['cn'] }]
      )

      const entries = [
        createEntry('cn=test,dc=example,dc=com', {
          cn: 'test',
          objectClass: ['person', 'unknownClass'],
        }),
      ]

      const { result } = renderHook(() => useLdifValidation(entries, schemaDetails))

      // Should not have missing required for unknownClass (since it's not in schema)
      expect(result.current.missingRequired).toHaveLength(0)
      // But should flag unknownClass as unknown
      expect(result.current.unknownObjectClasses).toContain('unknownClass')
    })
  })

  describe('multiple entries', () => {
    it('should validate all entries', () => {
      const schemaDetails = createSchemaDetails(
        [{ name: 'cn' }, { name: 'sn' }, { name: 'objectClass' }],
        [{ name: 'person', must: ['cn', 'sn'] }]
      )

      const entries = [
        createEntry('cn=test1,dc=example,dc=com', {
          cn: 'test1',
          objectClass: 'person',
          // Missing sn
        }),
        createEntry('cn=test2,dc=example,dc=com', {
          cn: 'test2',
          objectClass: 'person',
          // Missing sn
        }),
      ]

      const { result } = renderHook(() => useLdifValidation(entries, schemaDetails))

      expect(result.current.missingRequired).toHaveLength(2)
    })

    it('should aggregate unknown attributes and classes across entries', () => {
      const schemaDetails = createSchemaDetails(
        [{ name: 'cn' }, { name: 'objectClass' }],
        [{ name: 'person' }]
      )

      const entries = [
        createEntry('cn=test1,dc=example,dc=com', {
          cn: 'test1',
          objectClass: ['person', 'unknownClass1'],
          unknownAttr1: 'value',
        }),
        createEntry('cn=test2,dc=example,dc=com', {
          cn: 'test2',
          objectClass: ['person', 'unknownClass2'],
          unknownAttr2: 'value',
        }),
      ]

      const { result } = renderHook(() => useLdifValidation(entries, schemaDetails))

      expect(result.current.unknownAttributes).toContain('unknownAttr1')
      expect(result.current.unknownAttributes).toContain('unknownAttr2')
      expect(result.current.unknownObjectClasses).toContain('unknownClass1')
      expect(result.current.unknownObjectClasses).toContain('unknownClass2')
    })
  })

  describe('case insensitivity', () => {
    it('should match attributes case-insensitively', () => {
      const schemaDetails = createSchemaDetails(
        [{ name: 'cn' }, { name: 'objectClass' }],
        [{ name: 'person' }]
      )

      const entries = [
        createEntry('cn=test,dc=example,dc=com', {
          CN: 'test', // uppercase
          OBJECTCLASS: 'person', // uppercase
        }),
      ]

      const { result } = renderHook(() => useLdifValidation(entries, schemaDetails))

      expect(result.current.unknownAttributes).toHaveLength(0)
    })

    it('should match object classes case-insensitively', () => {
      const schemaDetails = createSchemaDetails(
        [{ name: 'cn' }, { name: 'objectClass' }],
        [{ name: 'person' }, { name: 'inetOrgPerson' }]
      )

      const entries = [
        createEntry('cn=test,dc=example,dc=com', {
          cn: 'test',
          objectClass: ['PERSON', 'INETORGPERSON'], // uppercase
        }),
      ]

      const { result } = renderHook(() => useLdifValidation(entries, schemaDetails))

      expect(result.current.unknownObjectClasses).toHaveLength(0)
    })
  })
})
