import { useCallback, useState } from 'react'
import { proxyFetch } from '@/lib/proxy-fetch'
import { jwksCache } from '@/lib/cache/jwks-cache'
import { JSONWebKeySet } from 'jose'

interface UseJwksResult {
  data: JSONWebKeySet | null
  isLoading: boolean
  error: Error | null
  fetchJwks: (url: string, forceRefresh?: boolean) => Promise<void>
}

/**
 * Hook to fetch a JSON Web Key Set (JWKS) from a given URI.
 * Handles fetching via proxy if necessary and integrates with cache.
 */
export function useJwks(): UseJwksResult {
  const [data, setData] = useState<JSONWebKeySet | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchJwks = useCallback(async (jwksUri: string, forceRefresh = false) => {
    if (!jwksUri) {
      setData(null)
      setError(null)
      setIsLoading(false)
      return
    }

    // Validate URL format
    try {
      new URL(jwksUri)
    } catch {
      setError(new Error('Invalid JWKS URI format.'))
      setData(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Try to get from cache first, unless forceRefresh is true
      if (!forceRefresh) {
        const cachedJwks = jwksCache.get(jwksUri)
        if (cachedJwks) {
          if (import.meta.env.DEV) {
            console.log(`[useJwks] JWKS found in cache for: ${jwksUri}`)
          }
          setData(cachedJwks)
          setIsLoading(false)
          return
        }

        // Check if there's already a pending request
        const pendingRequest = jwksCache.getPendingRequest(jwksUri)
        if (pendingRequest) {
          if (import.meta.env.DEV) {
            console.log(
              `[useJwks] Found pending request for: ${jwksUri}, waiting for it to complete`
            )
          }
          const jwksData = await pendingRequest
          setData(jwksData)
          setIsLoading(false)
          return
        }

        if (import.meta.env.DEV) {
          console.log(`[useJwks] No cached JWKS found for: ${jwksUri}, fetching from network`)
        }
      } else {
        if (import.meta.env.DEV) {
          console.log(`[useJwks] Force refreshing JWKS for: ${jwksUri}`)
        }
        // Remove from cache to ensure fresh fetch
        jwksCache.remove(jwksUri)
      }

      // Create the network request promise
      const fetchPromise = (async () => {
        if (import.meta.env.DEV) {
          console.log(`[useJwks] Making network request for JWKS: ${jwksUri}`)
        }
        const response = await proxyFetch(jwksUri)

        if (!response.ok) {
          let errorMsg = `Failed to fetch JWKS: ${response.status} ${response.statusText}`
          try {
            const errorBody = await response.json()
            errorMsg += ` - ${JSON.stringify(errorBody)}`
          } catch {
            /* Ignore if response body is not JSON */
          }
          throw new Error(errorMsg)
        }

        const jwksData: JSONWebKeySet = await response.json()

        // Basic validation: Check if it has a 'keys' array
        if (!jwksData || !Array.isArray(jwksData.keys)) {
          throw new Error('Invalid JWKS format: Missing "keys" array.')
        }

        // Cache the successful response
        jwksCache.set(jwksUri, jwksData)
        if (import.meta.env.DEV) {
          console.log(`[useJwks] JWKS cached for: ${jwksUri}`)
        }

        return jwksData
      })()

      // Store the pending request
      jwksCache.setPendingRequest(jwksUri, fetchPromise)

      try {
        const jwksData = await fetchPromise
        setData(jwksData)
      } finally {
        // Always remove the pending request when done
        jwksCache.removePendingRequest(jwksUri)
      }
    } catch (err) {
      if (import.meta?.env?.DEV) {
        console.error('Error fetching JWKS:', err)
      }
      setError(
        err instanceof Error ? err : new Error('An unknown error occurred while fetching JWKS')
      )
      setData(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Provide a function to trigger fetching manually
  return { data, isLoading, error, fetchJwks }
}
