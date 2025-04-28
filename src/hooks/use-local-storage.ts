import * as React from "react";

type SetValue<T> = React.Dispatch<React.SetStateAction<T | null | undefined>>;

/**
 * Hook for persistent state using localStorage
 * @param key The localStorage key to store the value under
 * @param initialValue The initial value to use if no value exists in storage
 * @returns A stateful value and a function to update it (like useState)
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, SetValue<T>] {
  // Get stored value from localStorage or use initialValue
  const readValue = React.useCallback((): T => {
    if (typeof window === "undefined") {
      return initialValue;
    }

    try {
      const item = window.localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  }, [initialValue, key]);

  // State to store our value
  const [storedValue, setStoredValue] = React.useState<T>(readValue);

  // Return a wrapped version of useState's setter function that persists
  // the new value to localStorage
  const setValue: SetValue<T> = React.useCallback(
    (value) => {
      if (typeof window === "undefined") {
        console.warn(`Cannot set localStorage key "${key}" when not in browser`);
        return;
      }

      try {
        // Allow value to be a function so we have the same API as useState
        const newValue = value instanceof Function ? value(storedValue) : value;

        if (newValue === null || newValue === undefined) {
          // Remove from localStorage if value is null or undefined
          window.localStorage.removeItem(key);
          setStoredValue(newValue as any); // Cast to any to satisfy type checker temporarily
        } else {
          // Save to localStorage
          window.localStorage.setItem(key, JSON.stringify(newValue));
          // Save state
          setStoredValue(newValue);
        }
      } catch (error) {
        console.warn(`Error setting localStorage key "${key}":`, error);
      }
    },
    [key, storedValue]
  );

  // Watch for changes to localStorage in other tabs/windows
  React.useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue !== null) {
        setStoredValue(JSON.parse(e.newValue));
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [key]);

  return [storedValue, setValue];
}
