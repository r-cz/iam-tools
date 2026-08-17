'use client'

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

export type Theme = 'dark' | 'light' | 'system'
export type ResolvedTheme = Exclude<Theme, 'system'>

interface ThemeProviderProps {
  children: ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

interface ThemeProviderState {
  theme: Theme
  resolvedTheme: ResolvedTheme
  setTheme: (theme: Theme) => void
}

const ThemeProviderContext = createContext<ThemeProviderState>({
  theme: 'system',
  resolvedTheme: 'light',
  setTheme: () => {},
})

function isTheme(value: unknown): value is Theme {
  return value === 'dark' || value === 'light' || value === 'system'
}

function resolveTheme(theme: Theme): ResolvedTheme {
  if (theme !== 'system') return theme
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function ThemeProvider({
  children,
  defaultTheme = 'system',
  storageKey = 'iam-tools-theme',
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === 'undefined') {
      return defaultTheme
    }

    try {
      const stored = window.localStorage.getItem(storageKey)
      return isTheme(stored) ? stored : defaultTheme
    } catch {
      return defaultTheme
    }
  })
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => resolveTheme(theme))

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const applyResolvedTheme = () => {
      const nextResolvedTheme: ResolvedTheme =
        theme === 'system' ? (mediaQuery.matches ? 'dark' : 'light') : theme
      const isDark = nextResolvedTheme === 'dark'
      const root = window.document.documentElement
      root.classList.toggle('dark', isDark)
      root.classList.toggle('dark-mode', isDark)
      root.classList.toggle('light', !isDark)
      setResolvedTheme(nextResolvedTheme)
    }

    applyResolvedTheme()
    if (theme !== 'system') return

    mediaQuery.addEventListener('change', applyResolvedTheme)
    return () => mediaQuery.removeEventListener('change', applyResolvedTheme)
  }, [theme])

  const value = useMemo<ThemeProviderState>(
    () => ({
      theme,
      resolvedTheme,
      setTheme: (nextTheme: Theme) => {
        if (typeof window !== 'undefined') {
          try {
            window.localStorage.setItem(storageKey, nextTheme)
          } catch {
            /* ignore write failures */
          }
        }
        setTheme(nextTheme)
      },
    }),
    [resolvedTheme, storageKey, theme]
  )

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export const useTheme = () => {
  return useContext(ThemeProviderContext)
}
