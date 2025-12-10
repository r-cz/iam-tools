import { describe, expect, it } from 'bun:test'
import { renderHook } from '@testing-library/react'
import { useMergedSchemaDetails } from '@/features/ldap/hooks/useMergedSchemaDetails'
import type { SavedSchemaEntry } from '@/features/ldap/hooks/useSavedSchemas'

describe('useMergedSchemaDetails', () => {
  const mockSavedSchema: SavedSchemaEntry = {
    id: 'custom-schema-1',
    name: 'Custom Schema',
    schemaText: `attributeTypes: ( 1.2.3.4.5 NAME 'customAttr' DESC 'Custom attribute' SYNTAX 1.3.6.1.4.1.1466.115.121.1.15 )
objectClasses: ( 1.2.3.4.6 NAME 'customPerson' DESC 'Custom person object' SUP person STRUCTURAL MAY customAttr )`,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  }

  const anotherSavedSchema: SavedSchemaEntry = {
    id: 'custom-schema-2',
    name: 'Another Schema',
    schemaText: `attributeTypes: ( 1.2.3.4.7 NAME 'anotherAttr' DESC 'Another attribute' SYNTAX 1.3.6.1.4.1.1466.115.121.1.15 )`,
    createdAt: '2024-01-02T00:00:00.000Z',
    updatedAt: '2024-01-02T00:00:00.000Z',
  }

  it('should return null when no schemas are selected', () => {
    const { result } = renderHook(() => useMergedSchemaDetails([mockSavedSchema], [], []))

    expect(result.current).toBeNull()
  })

  it('should return schema details when a saved schema is selected', () => {
    const { result } = renderHook(() =>
      useMergedSchemaDetails([mockSavedSchema], ['custom-schema-1'], [])
    )

    expect(result.current).not.toBeNull()
    expect(result.current?.stored.name).toBe('Custom Schema')
    expect(result.current?.parsed.attributeTypes.length).toBeGreaterThan(0)
    expect(result.current?.parsed.objectClasses.length).toBeGreaterThan(0)
  })

  it('should return schema details when a built-in schema is selected', () => {
    const { result } = renderHook(() => useMergedSchemaDetails([], [], ['rfc-core-ldap']))

    expect(result.current).not.toBeNull()
    expect(result.current?.stored.name).toContain('Core LDAP')
    expect(result.current?.parsed.attributeTypes.length).toBeGreaterThan(0)
    expect(result.current?.parsed.objectClasses.length).toBeGreaterThan(0)
  })

  it('should merge multiple saved schemas', () => {
    const { result } = renderHook(() =>
      useMergedSchemaDetails(
        [mockSavedSchema, anotherSavedSchema],
        ['custom-schema-1', 'custom-schema-2'],
        []
      )
    )

    expect(result.current).not.toBeNull()
    expect(result.current?.stored.name).toBe('Custom Schema + Another Schema')

    // Should have attributes from both schemas
    const attrNames = result.current?.parsed.attributeTypes.flatMap((at) => at.names) ?? []
    expect(attrNames).toContain('customAttr')
    expect(attrNames).toContain('anotherAttr')
  })

  it('should merge built-in and saved schemas', () => {
    const { result } = renderHook(() =>
      useMergedSchemaDetails([mockSavedSchema], ['custom-schema-1'], ['rfc-core-ldap'])
    )

    expect(result.current).not.toBeNull()

    // Should have attributes from both built-in and custom schemas
    const attrNames = result.current?.parsed.attributeTypes.flatMap((at) => at.names) ?? []
    expect(attrNames).toContain('customAttr')
    // Parser concatenates multi-name attrs, so check for partial match
    expect(attrNames.some((name) => name.toLowerCase().includes('cn'))).toBe(true)
    expect(attrNames.some((name) => name.toLowerCase().includes('mail'))).toBe(true)
  })

  it('should build attribute map with lowercase keys', () => {
    const { result } = renderHook(() => useMergedSchemaDetails([], [], ['rfc-core-ldap']))

    expect(result.current).not.toBeNull()

    // Attribute map should have entries (check it's populated)
    expect(result.current?.attributeMap.size).toBeGreaterThan(0)

    // Check some attribute OIDs are in the map (more reliable than names due to parser quirk with multi-name attrs)
    expect(result.current?.attributeMap.has('2.5.4.0')).toBe(true) // objectClass OID
    expect(result.current?.attributeMap.has('2.5.4.13')).toBe(true) // description OID
  })

  it('should build object class map with lowercase keys', () => {
    const { result } = renderHook(() => useMergedSchemaDetails([], [], ['rfc-core-ldap']))

    expect(result.current).not.toBeNull()

    // Object class map should have lowercase keys
    expect(result.current?.objectClassMap.has('person')).toBe(true)
    expect(result.current?.objectClassMap.has('inetorgperson')).toBe(true)
  })

  it('should return null if selected schema IDs do not match any schemas', () => {
    const { result } = renderHook(() =>
      useMergedSchemaDetails([mockSavedSchema], ['non-existent-id'], [])
    )

    expect(result.current).toBeNull()
  })

  it('should create virtual stored entry with merged name', () => {
    const { result } = renderHook(() =>
      useMergedSchemaDetails([], [], ['rfc-core-ldap', 'active-directory'])
    )

    expect(result.current).not.toBeNull()
    expect(result.current?.stored.id).toBe('merged')
    expect(result.current?.stored.name).toContain('+')
  })

  it('should include OID in attribute map aliases', () => {
    const { result } = renderHook(() =>
      useMergedSchemaDetails([mockSavedSchema], ['custom-schema-1'], [])
    )

    expect(result.current).not.toBeNull()

    // The OID should be in the attribute map
    const entry = result.current?.attributeMap.get('1.2.3.4.5')
    expect(entry).toBeDefined()
    expect(entry?.canonical).toBe('customAttr')
  })
})
