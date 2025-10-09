import { useCallback } from 'react'
import { useLocalStorage } from '@/hooks/use-local-storage'

const STORAGE_KEY = 'iam-tools:ldap:saved-schemas'

export interface SavedSchemaEntry {
  id: string
  name: string
  schemaText: string
  createdAt: string
  updatedAt: string
}

type SaveResult = { schema: SavedSchemaEntry; status: 'created' | 'updated' }

function createId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `schema_${Math.random().toString(36).slice(2, 10)}`
}

export function useSavedSchemas() {
  const [schemas, setSchemas] = useLocalStorage<SavedSchemaEntry[]>(STORAGE_KEY, [])

  const upsertSchema = useCallback(
    (name: string, schemaText: string): SaveResult => {
      const trimmedName = name.trim()
      const trimmedSchema = schemaText.trim()

      if (!trimmedName || !trimmedSchema) {
        throw new Error('Schema name and content are required')
      }

      const timestamp = new Date().toISOString()

      let result: SaveResult | null = null

      setSchemas((current) => {
        const existingIndex = current.findIndex(
          (entry) => entry.name.toLowerCase() === trimmedName.toLowerCase()
        )

        if (existingIndex >= 0) {
          const updated: SavedSchemaEntry = {
            ...current[existingIndex],
            name: trimmedName,
            schemaText: trimmedSchema,
            updatedAt: timestamp,
          }

          const next = [...current]
          next[existingIndex] = updated
          result = { schema: updated, status: 'updated' }
          return next
        }

        const created: SavedSchemaEntry = {
          id: createId(),
          name: trimmedName,
          schemaText: trimmedSchema,
          createdAt: timestamp,
          updatedAt: timestamp,
        }
        result = { schema: created, status: 'created' }
        return [...current, created]
      })

      if (!result) {
        throw new Error('Failed to persist schema')
      }

      return result
    },
    [setSchemas]
  )

  const removeSchema = useCallback(
    (id: string) => {
      setSchemas((current) => current.filter((entry) => entry.id !== id))
    },
    [setSchemas]
  )

  return {
    schemas,
    upsertSchema,
    removeSchema,
  }
}
