import * as React from "react";

type SetValue<T> = React.Dispatch<React.SetStateAction<T>>;

/**
 * Hook for persistent state using localStorage
 * @param key The localStorage key to store the value under
 * @param initialValue The initial value to use if no value exists in storage
 * @param migrationFn Optional function to migrate data when schema changes
 * @returns A stateful value and a function to update it (like useState)
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T,
  migrationFn?: (storedValue: any) => T
): [T, SetValue<T>] {
  // Get stored value from localStorage or use initialValue
  const readValue = React.useCallback((): T => {
    if (typeof window === "undefined") {
      return initialValue;
    }

    try {
      const item = window.localStorage.getItem(key);
      let parsedItem = item ? (JSON.parse(item) as T) : initialValue;
      
      // Apply migration function if provided
      if (migrationFn && item) {
        parsedItem = migrationFn(parsedItem);
      }
      
      return parsedItem;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  }, [initialValue, key, migrationFn]);

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
        
        // Save to localStorage
        window.localStorage.setItem(key, JSON.stringify(newValue));
        
        // Save state
        setStoredValue(newValue);
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
