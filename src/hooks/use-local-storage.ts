import * as React from 'react'

type SetValue<T> = React.Dispatch<React.SetStateAction<T>>
export type StoredValueSanitizer<T> = (value: unknown) => T

function parseStoredValue<T>(
  serialized: string | null,
  fallback: T,
  sanitize?: StoredValueSanitizer<T>
): T {
  const parsed: unknown = serialized === null ? fallback : JSON.parse(serialized)
  return sanitize ? sanitize(parsed) : (parsed as T)
}

export function useLocalStorage<T>(
  key: string,
  initialValue: T,
  sanitize?: StoredValueSanitizer<T>
): [T, SetValue<T>] {
  const readValue = React.useCallback(() => {
    try {
      return parseStoredValue(window.localStorage.getItem(key), initialValue, sanitize)
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error)
      return sanitize ? sanitize(initialValue) : initialValue
    }
  }, [initialValue, key, sanitize])

  const [storedValue, setStoredValue] = React.useState<T>(readValue)
  const valueRef = React.useRef(storedValue)

  const setValue = React.useCallback<SetValue<T>>(
    (nextValue) => {
      const resolved =
        typeof nextValue === 'function'
          ? (nextValue as (current: T) => T)(valueRef.current)
          : nextValue
      const safeValue = sanitize ? sanitize(resolved) : resolved
      valueRef.current = safeValue
      setStoredValue(safeValue)
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
        const nextValue = parseStoredValue(event.newValue, initialValue, sanitize)
        valueRef.current = nextValue
        setStoredValue(nextValue)
      } catch (error) {
        console.warn(`Error reading localStorage key "${key}" from a storage event:`, error)
        const fallback = sanitize ? sanitize(initialValue) : initialValue
        valueRef.current = fallback
        setStoredValue(fallback)
      }
    }
    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [initialValue, key, sanitize])

  return [storedValue, setValue]
}
