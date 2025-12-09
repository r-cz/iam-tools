import { useMemo } from 'react'
import { parseLdapSchema, type ParsedObjectClass } from '../utils/parse-schema'
import type { SavedSchemaEntry } from './useSavedSchemas'
import type { SchemaDetails } from './useSchemaDetails'
import { BUILTIN_SCHEMAS } from '../data/builtin-schemas'

/**
 * Merges multiple schemas (saved + built-in) into a single SchemaDetails object
 * for unified validation
 */
export function useMergedSchemaDetails(
  savedSchemas: SavedSchemaEntry[],
  selectedSchemaIds: string[],
  selectedBuiltinIds: string[]
): SchemaDetails | null {
  return useMemo(() => {
    if (selectedSchemaIds.length === 0 && selectedBuiltinIds.length === 0) {
      return null
    }

    // Collect all schema texts to merge
    const schemaTexts: string[] = []
    const schemaNames: string[] = []

    // Add built-in schemas first (they're base schemas)
    selectedBuiltinIds.forEach((id) => {
      const builtin = BUILTIN_SCHEMAS.find((s) => s.id === id)
      if (builtin) {
        schemaTexts.push(builtin.schemaText)
        schemaNames.push(builtin.name)
      }
    })

    // Add saved schemas (custom/vendor schemas)
    selectedSchemaIds.forEach((id) => {
      const saved = savedSchemas.find((s) => s.id === id)
      if (saved) {
        schemaTexts.push(saved.schemaText)
        schemaNames.push(saved.name)
      }
    })

    if (schemaTexts.length === 0) {
      return null
    }

    // Merge all schema texts
    const mergedText = schemaTexts.join('\n\n')
    const parsed = parseLdapSchema(mergedText)

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

    // Create a virtual "stored" entry representing the merged schema
    const virtualStored: SavedSchemaEntry = {
      id: 'merged',
      name: schemaNames.join(' + '),
      schemaText: mergedText,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    return {
      stored: virtualStored,
      parsed,
      attributeMap,
      objectClassMap,
    }
  }, [savedSchemas, selectedSchemaIds, selectedBuiltinIds])
}
