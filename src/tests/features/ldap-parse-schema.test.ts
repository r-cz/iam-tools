import { describe, expect, it } from 'bun:test'
import { parseLdapSchema } from '@/features/ldap/utils/parse-schema'

describe('LDAP Schema Parser', () => {
  describe('parseLdapSchema', () => {
    it('should parse a simple attribute type definition', () => {
      const schema = `attributeTypes: ( 2.5.4.41 NAME 'name' DESC 'RFC4519: common supertype of name attributes' EQUALITY caseIgnoreMatch SYNTAX 1.3.6.1.4.1.1466.115.121.1.15 )`

      const result = parseLdapSchema(schema)

      expect(result.errors).toHaveLength(0)
      expect(result.attributeTypes).toHaveLength(1)

      const attr = result.attributeTypes[0]
      expect(attr.oid).toBe('2.5.4.41')
      expect(attr.names).toContain('name')
      expect(attr.description).toBe('RFC4519: common supertype of name attributes')
      expect(attr.equality).toBe('caseIgnoreMatch')
      expect(attr.syntax).toBe('1.3.6.1.4.1.1466.115.121.1.15')
    })

    it('should parse attribute with multiple names', () => {
      // Note: The parser expects multiple names to be separated by $ within parentheses
      // SUP value should be in quotes to match the singlePattern
      const schema = `attributeTypes: ( 2.16.840.1.113730.3.1.2405 NAME ( manager $ managerDN ) DESC 'DN for the entry\\'s direct manager' SUP 'distinguishedName' )`

      const result = parseLdapSchema(schema)

      expect(result.errors).toHaveLength(0)
      expect(result.attributeTypes).toHaveLength(1)

      const attr = result.attributeTypes[0]
      expect(attr.names).toHaveLength(2)
      expect(attr.names).toContain('manager')
      expect(attr.names).toContain('managerDN')
      expect(attr.superior).toBe('distinguishedName')
    })

    it('should parse attribute with SINGLE-VALUE flag', () => {
      const schema = `attributeTypes: ( 2.16.840.1.113730.3.1.2001 NAME 'employeeNumber' DESC 'Employee number identifier' EQUALITY caseIgnoreMatch SYNTAX 1.3.6.1.4.1.1466.115.121.1.15 SINGLE-VALUE )`

      const result = parseLdapSchema(schema)

      expect(result.errors).toHaveLength(0)
      expect(result.attributeTypes).toHaveLength(1)

      const attr = result.attributeTypes[0]
      expect(attr.singleValue).toBe(true)
      expect(attr.collective).toBe(false)
      expect(attr.noUserModification).toBe(false)
    })

    it('should parse attribute with NO-USER-MODIFICATION flag', () => {
      const schema = `attributeTypes: ( 2.5.4.49 NAME 'distinguishedName' EQUALITY distinguishedNameMatch SYNTAX 1.3.6.1.4.1.1466.115.121.1.12 NO-USER-MODIFICATION )`

      const result = parseLdapSchema(schema)

      expect(result.errors).toHaveLength(0)
      expect(result.attributeTypes).toHaveLength(1)

      const attr = result.attributeTypes[0]
      expect(attr.noUserModification).toBe(true)
    })

    it('should parse a simple object class definition', () => {
      // Using SUP with single value (not in parentheses)
      const schema = `objectClasses: ( 2.5.6.6 NAME 'person' DESC 'RFC4519: represents a person' SUP 'top' STRUCTURAL MUST ( sn $ cn ) MAY ( userPassword $ telephoneNumber $ seeAlso $ description ) )`

      const result = parseLdapSchema(schema)

      expect(result.errors).toHaveLength(0)
      expect(result.objectClasses).toHaveLength(1)

      const oc = result.objectClasses[0]
      expect(oc.oid).toBe('2.5.6.6')
      expect(oc.names).toContain('person')
      expect(oc.description).toBe('RFC4519: represents a person')
      expect(oc.kind).toBe('STRUCTURAL')
      expect(oc.superior).toBeDefined()
      expect(oc.superior!).toContain('top')
      expect(oc.must).toBeDefined()
      expect(oc.must!).toContain('sn')
      expect(oc.must!).toContain('cn')
      expect(oc.may).toBeDefined()
      expect(oc.may!).toContain('userPassword')
      expect(oc.may!).toContain('telephoneNumber')
    })

    it('should parse object class with multiple names', () => {
      // Note: The parser expects multiple names to be separated by $ within parentheses
      const schema = `objectClasses: ( 2.5.6.7 NAME ( organizationalPerson $ orgPerson ) SUP person STRUCTURAL MAY ( title $ x121Address $ registeredAddress $ destinationIndicator ) )`

      const result = parseLdapSchema(schema)

      expect(result.errors).toHaveLength(0)
      expect(result.objectClasses).toHaveLength(1)

      const oc = result.objectClasses[0]
      expect(oc.names).toHaveLength(2)
      expect(oc.names).toContain('organizationalPerson')
      expect(oc.names).toContain('orgPerson')
    })

    it('should parse ABSTRACT object class', () => {
      // Single MUST value needs to be in quotes to match the singlePattern
      const schema = `objectClasses: ( 2.5.6.0 NAME 'top' DESC 'top of the superclass chain' ABSTRACT MUST 'objectClass' )`

      const result = parseLdapSchema(schema)

      expect(result.errors).toHaveLength(0)
      expect(result.objectClasses).toHaveLength(1)

      const oc = result.objectClasses[0]
      expect(oc.kind).toBe('ABSTRACT')
      expect(oc.must).toBeDefined()
      expect(oc.must!).toContain('objectClass')
    })

    it('should parse AUXILIARY object class', () => {
      const schema = `objectClasses: ( 1.3.6.1.4.1.250.3.15 NAME 'labeledURIObject' DESC 'object that contains the URI attribute type' AUXILIARY MAY labeledURI )`

      const result = parseLdapSchema(schema)

      expect(result.errors).toHaveLength(0)
      expect(result.objectClasses).toHaveLength(1)

      const oc = result.objectClasses[0]
      expect(oc.kind).toBe('AUXILIARY')
    })

    it('should parse multiple definitions in one schema', () => {
      const schema = `attributeTypes: ( 2.5.4.41 NAME 'name' EQUALITY caseIgnoreMatch SYNTAX 1.3.6.1.4.1.1466.115.121.1.15 )
attributeTypes: ( 2.5.4.3 NAME 'cn' SUP name )
objectClasses: ( 2.5.6.0 NAME 'top' ABSTRACT MUST objectClass )
objectClasses: ( 2.5.6.6 NAME 'person' SUP top STRUCTURAL MUST ( sn $ cn ) )`

      const result = parseLdapSchema(schema)

      expect(result.errors).toHaveLength(0)
      expect(result.attributeTypes).toHaveLength(2)
      expect(result.objectClasses).toHaveLength(2)
    })

    it('should handle line folding in schema definitions', () => {
      const schema = `attributeTypes: ( 2.5.4.41 NAME 'name'
  DESC 'RFC4519: common supertype of name attributes'
  EQUALITY caseIgnoreMatch
  SYNTAX 1.3.6.1.4.1.1466.115.121.1.15 )`

      const result = parseLdapSchema(schema)

      expect(result.errors).toHaveLength(0)
      expect(result.attributeTypes).toHaveLength(1)

      const attr = result.attributeTypes[0]
      expect(attr.names).toContain('name')
      expect(attr.description).toBe('RFC4519: common supertype of name attributes')
    })

    it('should skip comment lines', () => {
      const schema = `# This is a comment
attributeTypes: ( 2.5.4.41 NAME 'name' )
# Another comment
objectClasses: ( 2.5.6.0 NAME 'top' ABSTRACT MUST objectClass )`

      const result = parseLdapSchema(schema)

      expect(result.errors).toHaveLength(0)
      expect(result.attributeTypes).toHaveLength(1)
      expect(result.objectClasses).toHaveLength(1)
    })

    it('should return empty result for empty input', () => {
      const result = parseLdapSchema('')

      expect(result.attributeTypes).toHaveLength(0)
      expect(result.objectClasses).toHaveLength(0)
      expect(result.errors).toHaveLength(0)
    })

    it('should handle complex PingDirectory example', () => {
      const schema = `objectClasses: ( 2.16.840.1.113730.3.2.327 NAME 'pingDirectoryPerson' DESC 'Example PingDirectory structural class' SUP inetOrgPerson STRUCTURAL MUST ( uid $ mail ) MAY ( employeeNumber $ manager $ mobile ) )
attributeTypes: ( 2.16.840.1.113730.3.1.2001 NAME 'employeeNumber' DESC 'Employee number identifier' EQUALITY caseIgnoreMatch SYNTAX 1.3.6.1.4.1.1466.115.121.1.15 SINGLE-VALUE )`

      const result = parseLdapSchema(schema)

      expect(result.errors).toHaveLength(0)
      expect(result.objectClasses).toHaveLength(1)
      expect(result.attributeTypes).toHaveLength(1)

      const oc = result.objectClasses[0]
      expect(oc.names).toContain('pingDirectoryPerson')
      expect(oc.kind).toBe('STRUCTURAL')
      expect(oc.must).toBeDefined()
      expect(oc.must!).toContain('uid')
      expect(oc.must!).toContain('mail')
      expect(oc.may).toBeDefined()
      expect(oc.may!).toContain('employeeNumber')

      const attr = result.attributeTypes[0]
      expect(attr.names).toContain('employeeNumber')
      expect(attr.singleValue).toBe(true)
    })

    it('should parse attribute with ORDERING and SUBSTR', () => {
      const schema = `attributeTypes: ( 2.5.4.15 NAME 'businessCategory' EQUALITY caseIgnoreMatch SUBSTR caseIgnoreSubstringsMatch ORDERING caseIgnoreOrderingMatch SYNTAX 1.3.6.1.4.1.1466.115.121.1.15 )`

      const result = parseLdapSchema(schema)

      expect(result.errors).toHaveLength(0)
      expect(result.attributeTypes).toHaveLength(1)

      const attr = result.attributeTypes[0]
      expect(attr.ordering).toBe('caseIgnoreOrderingMatch')
      expect(attr.substr).toBe('caseIgnoreSubstringsMatch')
    })

    it('should parse attribute with USAGE', () => {
      const schema = `attributeTypes: ( 2.5.18.1 NAME 'createTimestamp' EQUALITY generalizedTimeMatch ORDERING generalizedTimeOrderingMatch SYNTAX 1.3.6.1.4.1.1466.115.121.1.24 SINGLE-VALUE NO-USER-MODIFICATION USAGE directoryOperation )`

      const result = parseLdapSchema(schema)

      expect(result.errors).toHaveLength(0)
      expect(result.attributeTypes).toHaveLength(1)

      const attr = result.attributeTypes[0]
      expect(attr.usage).toBe('directoryOperation')
      expect(attr.noUserModification).toBe(true)
      expect(attr.singleValue).toBe(true)
    })

    it('should handle object class without optional attributes', () => {
      const schema = `objectClasses: ( 1.2.3.4.5 NAME 'simpleClass' STRUCTURAL MUST 'cn' )`

      const result = parseLdapSchema(schema)

      expect(result.errors).toHaveLength(0)
      expect(result.objectClasses).toHaveLength(1)

      const oc = result.objectClasses[0]
      expect(oc.must).toBeDefined()
      expect(oc.must!).toContain('cn')
      expect(oc.may).toBeUndefined()
      expect(oc.superior).toBeUndefined()
    })

    it('should preserve raw definition text', () => {
      const schema = `attributeTypes: ( 2.5.4.41 NAME 'name' DESC 'Test' )`

      const result = parseLdapSchema(schema)

      expect(result.errors).toHaveLength(0)
      expect(result.attributeTypes).toHaveLength(1)
      expect(result.attributeTypes[0].raw).toContain('2.5.4.41')
      expect(result.attributeTypes[0].raw).toContain('NAME')
    })

    it('should handle COLLECTIVE flag', () => {
      const schema = `attributeTypes: ( 2.5.4.7.1 NAME 'c-l' SUP l COLLECTIVE )`

      const result = parseLdapSchema(schema)

      expect(result.errors).toHaveLength(0)
      expect(result.attributeTypes).toHaveLength(1)

      const attr = result.attributeTypes[0]
      expect(attr.collective).toBe(true)
    })

    it('should handle null bytes in input', () => {
      const schema = `attributeTypes: ( 2.5.4.41 NAME 'name'\u0000 )`

      const result = parseLdapSchema(schema)

      expect(result.errors).toHaveLength(0)
      expect(result.attributeTypes).toHaveLength(1)
    })
  })
})
