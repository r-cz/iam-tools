import { useCallback, useRef, useState } from 'react'
import { proxyFetch } from '@/lib/proxy-fetch'
import { jwksCache } from '@/lib/cache/jwks-cache'
import { JSONWebKeySet } from 'jose'

type ResourceFetchFunction = (url: string, options?: RequestInit) => Promise<Response>

interface UseJwksResult {
  data: JSONWebKeySet | null
  isLoading: boolean
  error: Error | null
  fetchJwks: (url: string, forceRefresh?: boolean) => Promise<JSONWebKeySet | null>
}

export function useJwks(fetchResource: ResourceFetchFunction = proxyFetch): UseJwksResult {
  const [data, setData] = useState<JSONWebKeySet | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const invocationRef = useRef(0)

  const fetchJwks = useCallback(
    async (jwksUri: string, forceRefresh = false) => {
      const invocation = ++invocationRef.current
      if (!jwksUri) {
        setData(null)
        setError(null)
        setIsLoading(false)
        return null
      }
      try {
        new URL(jwksUri)
      } catch {
        setError(new Error('Invalid JWKS URI format.'))
        setData(null)
        setIsLoading(false)
        return null
      }

      setIsLoading(true)
      setError(null)
      try {
        const jwksData = await jwksCache.getOrLoad(
          jwksUri,
          async () => {
            const response = await fetchResource(jwksUri)
            if (!response.ok) {
              let message = `Failed to fetch JWKS: ${response.status} ${response.statusText}`
              try {
                message += ` - ${JSON.stringify(await response.json())}`
              } catch {}
              throw new Error(message)
            }
            const value: JSONWebKeySet = await response.json()
            if (!value || !Array.isArray(value.keys)) {
              throw new Error('Invalid JWKS format: Missing "keys" array.')
            }
            return value
          },
          { forceRefresh }
        )
        if (invocationRef.current === invocation) {
          setData(jwksData)
          setError(null)
        }
        return jwksData
      } catch (cause) {
        if (invocationRef.current === invocation) {
          setError(
            cause instanceof Error
              ? cause
              : new Error('An unknown error occurred while fetching JWKS')
          )
          setData(null)
        }
        return null
      } finally {
        if (invocationRef.current === invocation) setIsLoading(false)
      }
    },
    [fetchResource]
  )

  return { data, isLoading, error, fetchJwks }
}
