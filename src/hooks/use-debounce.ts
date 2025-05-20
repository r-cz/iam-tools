import { useState, useEffect, useCallback, useRef } from "react";

/**
 * Hook for debouncing a value
 * @param value The value to debounce
 * @param delay The delay in milliseconds (default: 500ms)
 * @returns The debounced value
 */
export function useDebounce<T>(value: T, delay = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Set a timeout to update the debounced value after the specified delay
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Clean up the timeout if the value changes before the delay has passed
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Hook for debouncing a callback function
 * @param callback The function to debounce
 * @param delay The delay in milliseconds (default: 500ms)
 * @param deps The dependencies array for memoizing the callback
 * @returns The debounced function
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay = 500,
  deps: any[] = []
): (...args: Parameters<T>) => void {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const debouncedCallback = useCallback((...args: Parameters<T>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      callback(...args);
    }, delay);

    // Cancel the debounced callback on unmount
  }, [delay, ...deps]);

  useEffect(() => {
    // Clean up the timeout when the component unmounts
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return debouncedCallback;
}

/**
 * Hook for debouncing an effect
 * @param effect The effect function to debounce
 * @param delay The delay in milliseconds (default: 500ms)
 * @param deps The dependencies array for the effect
 */
export function useDebouncedEffect(
  effect: () => void | (() => void),
  delay = 500,
  deps: any[] = []
): void {
  useEffect(() => {
    // Set a timeout to run the effect after the specified delay
    const handler = setTimeout(() => {
      effect();
    }, delay);

    // Clean up the timeout if the dependencies change before the delay has passed
    return () => {
      clearTimeout(handler);
    };
  }, [...deps, delay]);
}