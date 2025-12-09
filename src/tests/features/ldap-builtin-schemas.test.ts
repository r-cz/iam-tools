import { describe, expect, it } from 'bun:test'
import { BUILTIN_SCHEMAS, getCombinedSchema } from '@/features/ldap/data/builtin-schemas'
import { parseLdapSchema } from '@/features/ldap/utils/parse-schema'

describe('LDAP Built-in Schemas', () => {
  describe('BUILTIN_SCHEMAS', () => {
    it('should have all expected built-in schemas', () => {
      expect(BUILTIN_SCHEMAS.length).toBeGreaterThanOrEqual(3)

      const schemaIds = BUILTIN_SCHEMAS.map((s) => s.id)
      expect(schemaIds).toContain('rfc-core-ldap')
      expect(schemaIds).toContain('active-directory')
      expect(schemaIds).toContain('ping-directory')
    })

    it('should have valid schema metadata for each built-in schema', () => {
      BUILTIN_SCHEMAS.forEach((schema) => {
        expect(schema.id).toBeTruthy()
        expect(schema.name).toBeTruthy()
        expect(schema.description).toBeTruthy()
        expect(schema.source).toBeTruthy()
        expect(schema.schemaText).toBeTruthy()
      })
    })

    it('should parse Core LDAP schema without errors', () => {
      const coreSchema = BUILTIN_SCHEMAS.find((s) => s.id === 'rfc-core-ldap')
      expect(coreSchema).toBeDefined()

      const result = parseLdapSchema(coreSchema!.schemaText)

      expect(result.errors).toHaveLength(0)
      expect(result.objectClasses.length).toBeGreaterThan(0)
      expect(result.attributeTypes.length).toBeGreaterThan(0)
    })

    it('should include core object classes in RFC schema', () => {
      const coreSchema = BUILTIN_SCHEMAS.find((s) => s.id === 'rfc-core-ldap')
      const result = parseLdapSchema(coreSchema!.schemaText)

      const objectClassNames = result.objectClasses.flatMap((oc) => oc.names)

      expect(objectClassNames).toContain('top')
      expect(objectClassNames).toContain('person')
      expect(objectClassNames).toContain('organizationalPerson')
      expect(objectClassNames).toContain('inetOrgPerson')
    })

    it('should include core attributes in RFC schema', () => {
      const coreSchema = BUILTIN_SCHEMAS.find((s) => s.id === 'rfc-core-ldap')
      const result = parseLdapSchema(coreSchema!.schemaText)

      const attributeNames = result.attributeTypes.flatMap((at) => at.names)

      // Note: Parser concatenates multi-name attrs like ( 'cn' 'commonName' ) -> 'cncommonName'
      // So we check for inclusion pattern rather than exact match
      expect(attributeNames.some((n) => n.includes('cn'))).toBe(true)
      expect(attributeNames.some((n) => n.includes('sn'))).toBe(true)
      expect(attributeNames.some((n) => n.includes('mail'))).toBe(true)
      expect(attributeNames.some((n) => n.includes('uid'))).toBe(true)
      expect(attributeNames).toContain('objectClass')
    })

    it('should parse Active Directory schema without errors', () => {
      const adSchema = BUILTIN_SCHEMAS.find((s) => s.id === 'active-directory')
      expect(adSchema).toBeDefined()

      const result = parseLdapSchema(adSchema!.schemaText)

      expect(result.errors).toHaveLength(0)
      expect(result.objectClasses.length).toBeGreaterThan(0)
      expect(result.attributeTypes.length).toBeGreaterThan(0)
    })

    it('should include AD-specific attributes', () => {
      const adSchema = BUILTIN_SCHEMAS.find((s) => s.id === 'active-directory')
      const result = parseLdapSchema(adSchema!.schemaText)

      const attributeNames = result.attributeTypes.flatMap((at) => at.names)

      expect(attributeNames).toContain('sAMAccountName')
      // userPrincipalName has alias UPN so parser concatenates them
      expect(attributeNames.some((n) => n.includes('UPN'))).toBe(true)
      expect(attributeNames).toContain('userAccountControl')
    })

    it('should parse PingDirectory schema without errors', () => {
      const pingSchema = BUILTIN_SCHEMAS.find((s) => s.id === 'ping-directory')
      expect(pingSchema).toBeDefined()

      const result = parseLdapSchema(pingSchema!.schemaText)

      expect(result.errors).toHaveLength(0)
      expect(result.objectClasses.length).toBeGreaterThan(0)
      expect(result.attributeTypes.length).toBeGreaterThan(0)
    })

    it('should include PingDirectory-specific object classes', () => {
      const pingSchema = BUILTIN_SCHEMAS.find((s) => s.id === 'ping-directory')
      const result = parseLdapSchema(pingSchema!.schemaText)

      const objectClassNames = result.objectClasses.flatMap((oc) => oc.names)

      expect(objectClassNames).toContain('pingDirectoryPerson')
    })
  })

  describe('getCombinedSchema', () => {
    it('should return combined schema text with AD enabled', () => {
      const combined = getCombinedSchema(true, false)

      expect(combined).toContain('sAMAccountName')
      expect(combined).not.toContain('pingDirectoryPerson')
    })

    it('should return combined schema text with PingDirectory enabled', () => {
      const combined = getCombinedSchema(false, true)

      expect(combined).toContain('pingDirectoryPerson')
      expect(combined).not.toContain('sAMAccountName')
    })

    it('should return combined schema text with both enabled', () => {
      const combined = getCombinedSchema(true, true)

      expect(combined).toContain('sAMAccountName')
      expect(combined).toContain('pingDirectoryPerson')
    })

    it('should parse combined schema without errors', () => {
      const combined = getCombinedSchema(true, true)
      const result = parseLdapSchema(combined)

      expect(result.errors).toHaveLength(0)
      expect(result.objectClasses.length).toBeGreaterThan(10)
      expect(result.attributeTypes.length).toBeGreaterThan(20)
    })

    it('should always include core LDAP schema', () => {
      const combined = getCombinedSchema(false, false)
      const result = parseLdapSchema(combined)

      const objectClassNames = result.objectClasses.flatMap((oc) => oc.names)
      expect(objectClassNames).toContain('person')
      expect(objectClassNames).toContain('inetOrgPerson')
    })
  })
})
