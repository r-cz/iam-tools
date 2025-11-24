import { useMemo } from 'react'
import { parseLdapSchema, type ParsedObjectClass } from '../utils/parse-schema'
import type { SavedSchemaEntry } from './useSavedSchemas'

export interface SchemaDetails {
  stored: SavedSchemaEntry
  parsed: ReturnType<typeof parseLdapSchema>
  attributeMap: Map<string, { canonical: string; aliases: string[] }>
  objectClassMap: Map<string, ParsedObjectClass>
}

/**
 * Custom hook for processing and indexing LDAP schema details
 */
export function useSchemaDetails(
  schemas: SavedSchemaEntry[],
  selectedSchemaId: string | null
): SchemaDetails | null {
  const schemaSummaries = useMemo(
    () =>
      schemas.map((schema) => {
        const parsed = parseLdapSchema(schema.schemaText)
        return {
          schema,
          parsed,
          objectClassCount: parsed.objectClasses.length,
          attributeCount: parsed.attributeTypes.length,
        }
      }),
    [schemas]
  )

  const schemaDetails = useMemo(() => {
    if (!selectedSchemaId) {
      return null
    }
    const summary = schemaSummaries.find((item) => item.schema.id === selectedSchemaId)
    const stored = summary?.schema
    if (!stored) {
      return null
    }

    const parsed = summary.parsed

    // Build attribute map with all names and aliases
    const attributeMap = new Map<string, { canonical: string; aliases: string[] }>()
    parsed.attributeTypes.forEach((attribute) => {
      const canonical = attribute.names[0] ?? attribute.oid
      const aliasSet = new Set<string>()

      if (attribute.oid) {
        aliasSet.add(attribute.oid.toLowerCase())
      }

      attribute.names.forEach((name) => {
        if (name) {
          aliasSet.add(name.toLowerCase())
        }
      })

      if (canonical) {
        aliasSet.add(canonical.toLowerCase())
      }

      const entry = {
        canonical,
        aliases: Array.from(aliasSet),
      }

      aliasSet.forEach((alias) => {
        attributeMap.set(alias, entry)
      })
    })

    // Build object class map
    const objectClassEntries: Array<[string, ParsedObjectClass]> = parsed.objectClasses.flatMap(
      (objectClass) => {
        const keys = [objectClass.oid, ...objectClass.names]
        return keys
          .filter((key): key is string => Boolean(key))
          .map((key) => [key.toLowerCase(), objectClass] as [string, ParsedObjectClass])
      }
    )

    const objectClassMap = new Map<string, ParsedObjectClass>(objectClassEntries)

    return {
      stored,
      parsed,
      attributeMap,
      objectClassMap,
    }
  }, [schemaSummaries, selectedSchemaId])

  return schemaDetails
}

/**
 * Export schema summaries for use in UI
 */
export function useSchemaSummaries(schemas: SavedSchemaEntry[]) {
  return useMemo(
    () =>
      schemas.map((schema) => {
        const parsed = parseLdapSchema(schema.schemaText)
        return {
          schema,
          parsed,
          objectClassCount: parsed.objectClasses.length,
          attributeCount: parsed.attributeTypes.length,
        }
      }),
    [schemas]
  )
}
