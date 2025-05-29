import { useState, useCallback, useRef, useEffect } from 'react';

export interface AsyncFetchState<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
}

export interface UseAsyncFetchResult<T> extends AsyncFetchState<T> {
  execute: (...args: any[]) => Promise<T | null>;
  reset: () => void;
}

export interface UseAsyncFetchOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  cache?: Map<string, T>;
  getCacheKey?: (...args: any[]) => string;
  shouldExecute?: (...args: any[]) => boolean;
}

/**
 * Hook for managing async operations with loading, error, and data states.
 * Includes support for caching and lifecycle callbacks.
 * 
 * @param asyncFunction - The async function to execute
 * @param options - Optional configuration
 * @returns Object with data, loading, error states and execute function
 */
export function useAsyncFetch<T>(
  asyncFunction: (...args: any[]) => Promise<T>,
  options: UseAsyncFetchOptions<T> = {}
): UseAsyncFetchResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  // Use ref to track if component is mounted
  const isMountedRef = useRef(true);

  const execute = useCallback(async (...args: any[]): Promise<T | null> => {
    // Check if we should execute
    if (options.shouldExecute && !options.shouldExecute(...args)) {
      return null;
    }

    // Check cache if available
    if (options.cache && options.getCacheKey) {
      const cacheKey = options.getCacheKey(...args);
      const cached = options.cache.get(cacheKey);
      if (cached) {
        setData(cached);
        setError(null);
        setIsLoading(false);
        options.onSuccess?.(cached);
        return cached;
      }
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await asyncFunction(...args);
      
      if (!isMountedRef.current) {
        return null;
      }

      setData(result);
      
      // Store in cache if available
      if (options.cache && options.getCacheKey) {
        const cacheKey = options.getCacheKey(...args);
        options.cache.set(cacheKey, result);
      }
      
      options.onSuccess?.(result);
      return result;
    } catch (err) {
      if (!isMountedRef.current) {
        return null;
      }

      const error = err instanceof Error ? err : new Error('An unknown error occurred');
      setError(error);
      setData(null);
      options.onError?.(error);
      return null;
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [asyncFunction, options]);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setIsLoading(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return { data, isLoading, error, execute, reset };
}

// Convenience hook for fetch operations
export function useAsyncApiFetch<T>(
  url: string | ((...args: any[]) => string),
  options: UseAsyncFetchOptions<T> & RequestInit = {}
): UseAsyncFetchResult<T> {
  const fetchFunction = useCallback(async (...args: any[]) => {
    const finalUrl = typeof url === 'function' ? url(...args) : url;
    const response = await fetch(finalUrl, options);
    
    if (!response.ok) {
      let errorMsg = `Request failed: ${response.status} ${response.statusText}`;
      try {
        const errorBody = await response.json();
        errorMsg += ` - ${JSON.stringify(errorBody)}`;
      } catch {
        // Ignore if response body is not JSON
      }
      throw new Error(errorMsg);
    }
    
    return response.json() as Promise<T>;
  }, [url, options]);

  return useAsyncFetch(fetchFunction, options);
}