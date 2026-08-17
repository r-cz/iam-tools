import { useMemo } from 'react'
import { parseLdapSchema } from '../utils/parse-schema'
import { compileParsedLdapSchema } from '../utils/compile-schema'
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

    const { attributeMap, objectClassMap } = compileParsedLdapSchema(parsed)

    // Create a virtual "stored" entry representing the merged schema
    const virtualStored: SavedSchemaEntry = {
      id: 'merged',
      name: schemaNames.join(' + '),
      schemaText: mergedText,
      createdAt: new Date(0).toISOString(),
      updatedAt: new Date(0).toISOString(),
    }

    return {
      stored: virtualStored,
      parsed,
      attributeMap,
      objectClassMap,
    }
  }, [savedSchemas, selectedSchemaIds, selectedBuiltinIds])
}
