import { useCallback, useState, useEffect } from 'react';

/**
 * Options for the useSelectiveState hook
 */
export interface UseSelectiveStateOptions<T> {
  /**
   * Key to use for localStorage
   */
  key: string;
  
  /**
   * Initial/default value
   */
  initialValue: T;
  
  /**
   * Keys to include when loading/saving state (if undefined, all keys are included)
   */
  includeKeys?: (keyof T)[];
  
  /**
   * Keys to exclude when loading/saving state (ignored if includeKeys is provided)
   */
  excludeKeys?: (keyof T)[];
  
  /**
   * Optional migration function to apply when loading state
   */
  migrate?: (stored: T) => T;
  
  /**
   * Whether to preserve state on unmount (defaults to true)
   */
  preserveOnUnmount?: boolean;
}

/**
 * Hook for selective state management with localStorage
 * 
 * Allows for granular control over which parts of state are persisted,
 * while maintaining the full state object in memory.
 * 
 * @example
 * ```tsx
 * const [state, setState] = useSelectiveState({
 *   key: 'my-feature-state',
 *   initialValue: { count: 0, tempValue: '', persistent: true },
 *   excludeKeys: ['tempValue'],
 * });
 * ```
 */
export function useSelectiveState<T extends Record<string, any>>({
  key,
  initialValue,
  includeKeys,
  excludeKeys,
  migrate,
  preserveOnUnmount = true,
}: UseSelectiveStateOptions<T>): [T, React.Dispatch<React.SetStateAction<T>>] {
  // Define which keys to persist
  const keysToInclude = includeKeys || 
    (excludeKeys ? Object.keys(initialValue).filter(k => !excludeKeys.includes(k as keyof T)) : undefined);
  
  // Helper to filter an object by keys
  const filterObject = useCallback((obj: T, keys?: (keyof T)[]) => {
    if (!keys) return { ...obj };
    return keys.reduce((acc, key) => {
      acc[key] = obj[key];
      return acc;
    }, {} as Partial<T>);
  }, []);
  
  // Helper to get the keys we want to store
  const getStorableObject = useCallback((obj: T) => {
    return filterObject(obj, keysToInclude as (keyof T)[]);
  }, [filterObject, keysToInclude]);
  
  // Initial loading from localStorage
  const loadInitialState = useCallback(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }
    
    try {
      const storedItem = window.localStorage.getItem(key);
      if (!storedItem) return initialValue;
      
      // Parse the stored data
      const storedData = JSON.parse(storedItem) as Partial<T>;
      
      // Apply migrations if needed
      const migratedData = migrate ? migrate(storedData as T) : storedData;
      
      // Merge with initial state to ensure all properties exist
      return {
        ...initialValue,
        ...migratedData,
      };
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  }, [initialValue, key, migrate]);
  
  // Use state for the full object
  const [state, setInternalState] = useState<T>(loadInitialState);
  
  // Update localStorage when state changes
  const setState = useCallback((value: React.SetStateAction<T>) => {
    setInternalState(prevState => {
      // Handle function-based updates
      const newState = value instanceof Function ? value(prevState) : value;
      
      // Persist to localStorage
      if (typeof window !== 'undefined') {
        try {
          // Only store the keys we want to include
          const storableObject = getStorableObject(newState);
          window.localStorage.setItem(key, JSON.stringify(storableObject));
        } catch (error) {
          console.warn(`Error setting localStorage key "${key}":`, error);
        }
      }
      
      return newState;
    });
  }, [key, getStorableObject]);
  
  // Watch for changes in other tabs/windows
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue !== null) {
        const newStoredValue = JSON.parse(e.newValue) as Partial<T>;
        
        setInternalState(current => ({
          ...current,
          ...newStoredValue,
        }));
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      
      // Optionally save state on unmount
      if (preserveOnUnmount && typeof window !== 'undefined') {
        try {
          const storableObject = getStorableObject(state);
          window.localStorage.setItem(key, JSON.stringify(storableObject));
        } catch (error) {
          console.warn(`Error setting localStorage key "${key}" on unmount:`, error);
        }
      }
    };
  }, [key, state, getStorableObject, preserveOnUnmount]);
  
  return [state, setState];
}

/**
 * Simplified version of useSelectiveState using only exclude pattern
 */
export function useEphemeralState<T extends Record<string, any>>(
  key: string,
  initialValue: T,
  ephemeralKeys: (keyof T)[],
  migrate?: (stored: T) => T
): [T, React.Dispatch<React.SetStateAction<T>>] {
  return useSelectiveState({
    key,
    initialValue,
    excludeKeys: ephemeralKeys,
    migrate,
  });
}