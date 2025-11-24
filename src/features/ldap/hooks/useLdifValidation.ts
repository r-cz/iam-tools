import { useMemo } from 'react'
import type { LdifEntry } from '../utils/parse-ldif'
import type { ParsedObjectClass } from '../utils/parse-schema'

export interface ValidationSummary {
  unknownAttributes: string[]
  unknownObjectClasses: string[]
  missingRequired: Array<{ dn: string; objectClass: string; attributes: string[] }>
}

interface SchemaDetails {
  attributeMap: Map<string, { canonical: string; aliases: string[] }>
  objectClassMap: Map<string, ParsedObjectClass>
}

/**
 * Custom hook for validating LDIF entries against a schema
 */
export function useLdifValidation(
  entries: LdifEntry[],
  schemaDetails: SchemaDetails | null
): ValidationSummary {
  return useMemo<ValidationSummary>(() => {
    if (!schemaDetails) {
      return { unknownAttributes: [], unknownObjectClasses: [], missingRequired: [] }
    }

    const unknownAttributes = new Set<string>()
    const unknownObjectClasses = new Set<string>()
    const missingRequired: ValidationSummary['missingRequired'] = []

    const builtInAttributes = new Set(['dn', 'changetype', 'control'])

    entries.forEach((entry) => {
      const entryAttributeKeys = new Set(
        Object.keys(entry.attributes).map((key) => key.toLowerCase())
      )
      const objectClassValues = entry.attributes['objectclass']?.values ?? []

      objectClassValues.forEach((value) => {
        const lookupKey = value.toLowerCase()
        const schemaObjectClass = schemaDetails.objectClassMap.get(lookupKey)

        if (!schemaObjectClass) {
          unknownObjectClasses.add(value)
          return
        }

        if (schemaObjectClass.must && schemaObjectClass.must.length > 0) {
          const missing = schemaObjectClass.must.filter((requiredAttribute: string) => {
            const requiredKey = requiredAttribute.toLowerCase()

            if (entryAttributeKeys.has(requiredKey)) {
              return false
            }

            const attributeMeta = schemaDetails.attributeMap.get(requiredKey)
            if (!attributeMeta) {
              return true
            }

            return !attributeMeta.aliases.some((alias) => entryAttributeKeys.has(alias))
          })

          if (missing.length > 0) {
            missingRequired.push({
              dn: entry.dn,
              objectClass: schemaObjectClass.names[0] ?? schemaObjectClass.oid,
              attributes: missing,
            })
          }
        }
      })

      Object.entries(entry.attributes).forEach(([key, attribute]) => {
        if (key === 'objectclass' || builtInAttributes.has(key)) {
          return
        }

        if (!schemaDetails.attributeMap.has(key)) {
          unknownAttributes.add(attribute.name)
        }
      })
    })

    return {
      unknownAttributes: Array.from(unknownAttributes).sort(),
      unknownObjectClasses: Array.from(unknownObjectClasses).sort(),
      missingRequired,
    }
  }, [entries, schemaDetails])
}
