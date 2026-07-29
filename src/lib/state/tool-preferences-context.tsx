import * as React from 'react'

import { allTools } from '@/config/tool-catalog'
import { STORAGE_KEYS } from '@/lib/state/constants'

export const MAX_RECENT_TOOLS = 6

export interface RecentToolRecord {
  id: string
  visitedAt: number
}

interface ToolPreferencesContextValue {
  favoriteToolIds: string[]
  recentTools: RecentToolRecord[]
  isFavorite: (toolId: string) => boolean
  toggleFavorite: (toolId: string) => void
  recordRecent: (toolId: string, visitedAt?: number) => void
  clearRecentTools: () => void
  clearToolPreferences: () => void
}

const catalogToolIds = new Set(allTools.map((tool) => tool.id))

export function sanitizeFavoriteToolIds(value: unknown): string[] {
  if (!Array.isArray(value)) return []

  const seen = new Set<string>()
  return value.filter((toolId): toolId is string => {
    if (typeof toolId !== 'string' || !catalogToolIds.has(toolId) || seen.has(toolId)) {
      return false
    }

    seen.add(toolId)
    return true
  })
}

export function sanitizeRecentToolRecords(value: unknown): RecentToolRecord[] {
  if (!Array.isArray(value)) return []

  const newestById = new Map<string, RecentToolRecord>()

  for (const candidate of value) {
    if (
      typeof candidate !== 'object' ||
      candidate === null ||
      !('id' in candidate) ||
      !('visitedAt' in candidate)
    ) {
      continue
    }

    const { id, visitedAt } = candidate
    if (
      typeof id !== 'string' ||
      !catalogToolIds.has(id) ||
      typeof visitedAt !== 'number' ||
      !Number.isFinite(visitedAt) ||
      visitedAt < 0
    ) {
      continue
    }

    const current = newestById.get(id)
    if (!current || current.visitedAt < visitedAt) {
      newestById.set(id, { id, visitedAt })
    }
  }

  return [...newestById.values()]
    .sort((left, right) => right.visitedAt - left.visitedAt)
    .slice(0, MAX_RECENT_TOOLS)
}

function readStoredValue<T>(key: string, sanitize: (value: unknown) => T): T {
  if (typeof window === 'undefined') return sanitize(undefined)

  try {
    const storedValue = window.localStorage.getItem(key)
    return storedValue === null ? sanitize(undefined) : sanitize(JSON.parse(storedValue))
  } catch (error) {
    console.warn(`Error reading localStorage key "${key}":`, error)
    return sanitize(undefined)
  }
}

function useSafeStoredValue<T>(
  key: string,
  sanitize: (value: unknown) => T
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = React.useState<T>(() => readStoredValue(key, sanitize))
  const valueRef = React.useRef(value)

  const setStoredValue = React.useCallback<React.Dispatch<React.SetStateAction<T>>>(
    (nextValue) => {
      const resolvedValue =
        typeof nextValue === 'function'
          ? (nextValue as (current: T) => T)(valueRef.current)
          : nextValue
      const safeValue = sanitize(resolvedValue)

      valueRef.current = safeValue
      setValue(safeValue)

      try {
        window.localStorage.setItem(key, JSON.stringify(safeValue))
      } catch (error) {
        console.warn(`Error setting localStorage key "${key}":`, error)
      }
    },
    [key, sanitize]
  )

  React.useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key !== key) return

      try {
        const nextValue =
          event.newValue === null ? sanitize(undefined) : sanitize(JSON.parse(event.newValue))
        valueRef.current = nextValue
        setValue(nextValue)
      } catch (error) {
        console.warn(`Error reading localStorage key "${key}" from a storage event:`, error)
        const fallbackValue = sanitize(undefined)
        valueRef.current = fallbackValue
        setValue(fallbackValue)
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [key, sanitize])

  return [value, setStoredValue]
}

const ToolPreferencesContext = React.createContext<ToolPreferencesContextValue | undefined>(
  undefined
)

export function ToolPreferencesProvider({ children }: { children: React.ReactNode }) {
  const [favoriteToolIds, setFavoriteToolIds] = useSafeStoredValue(
    STORAGE_KEYS.FAVORITE_TOOL_IDS,
    sanitizeFavoriteToolIds
  )
  const [recentTools, setRecentTools] = useSafeStoredValue(
    STORAGE_KEYS.RECENT_TOOLS,
    sanitizeRecentToolRecords
  )

  const favoriteToolIdSet = React.useMemo(() => new Set(favoriteToolIds), [favoriteToolIds])

  const isFavorite = React.useCallback(
    (toolId: string) => favoriteToolIdSet.has(toolId),
    [favoriteToolIdSet]
  )

  const toggleFavorite = React.useCallback(
    (toolId: string) => {
      if (!catalogToolIds.has(toolId)) return

      setFavoriteToolIds((currentToolIds) =>
        currentToolIds.includes(toolId)
          ? currentToolIds.filter((currentToolId) => currentToolId !== toolId)
          : [...currentToolIds, toolId]
      )
    },
    [setFavoriteToolIds]
  )

  const recordRecent = React.useCallback(
    (toolId: string, visitedAt = Date.now()) => {
      if (!catalogToolIds.has(toolId) || !Number.isFinite(visitedAt) || visitedAt < 0) return

      setRecentTools((currentRecords) =>
        sanitizeRecentToolRecords([
          { id: toolId, visitedAt },
          ...currentRecords.filter((record) => record.id !== toolId),
        ])
      )
    },
    [setRecentTools]
  )

  const clearRecentTools = React.useCallback(() => {
    setRecentTools([])
  }, [setRecentTools])

  const clearToolPreferences = React.useCallback(() => {
    setFavoriteToolIds([])
    setRecentTools([])
  }, [setFavoriteToolIds, setRecentTools])

  const contextValue = React.useMemo<ToolPreferencesContextValue>(
    () => ({
      favoriteToolIds,
      recentTools,
      isFavorite,
      toggleFavorite,
      recordRecent,
      clearRecentTools,
      clearToolPreferences,
    }),
    [
      clearRecentTools,
      clearToolPreferences,
      favoriteToolIds,
      isFavorite,
      recentTools,
      recordRecent,
      toggleFavorite,
    ]
  )

  return (
    <ToolPreferencesContext.Provider value={contextValue}>
      {children}
    </ToolPreferencesContext.Provider>
  )
}

export function useToolPreferences(): ToolPreferencesContextValue {
  const context = React.useContext(ToolPreferencesContext)

  if (!context) {
    throw new Error('useToolPreferences must be used within ToolPreferencesProvider')
  }

  return context
}
