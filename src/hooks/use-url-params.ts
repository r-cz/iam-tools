import { useMemo } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * A hook to get URL search parameters.
 * @returns An object with the URL search parameters
 */
export function useUrlParams<T extends Record<string, string>>(): T {
  const location = useLocation()
  return useMemo(
    () => Object.fromEntries(new URLSearchParams(location.search)) as T,
    [location.search]
  )
}
