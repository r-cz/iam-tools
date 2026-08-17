import { useMemo } from 'react'
import { parseLdapSchema, type ParsedObjectClass } from '../utils/parse-schema'
import { compileParsedLdapSchema } from '../utils/compile-schema'
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

    const { attributeMap, objectClassMap } = compileParsedLdapSchema(parsed)

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
