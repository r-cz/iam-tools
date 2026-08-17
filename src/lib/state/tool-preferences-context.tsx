import * as React from 'react'

import { allTools } from '@/config/tool-catalog'
import { STORAGE_KEYS } from '@/lib/state/constants'
import { useLocalStorage } from '@/hooks/use-local-storage'

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

const ToolPreferencesContext = React.createContext<ToolPreferencesContextValue | undefined>(
  undefined
)

export function ToolPreferencesProvider({ children }: { children: React.ReactNode }) {
  const [favoriteToolIds, setFavoriteToolIds] = useLocalStorage(
    STORAGE_KEYS.FAVORITE_TOOL_IDS,
    [],
    sanitizeFavoriteToolIds
  )
  const [recentTools, setRecentTools] = useLocalStorage(
    STORAGE_KEYS.RECENT_TOOLS,
    [],
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
