import { useCallback, useRef, useState } from 'react'
import { proxyFetch } from '@/lib/proxy-fetch'
import { oidcConfigCache } from '@/lib/cache/oidc-config-cache'
import type { OidcConfiguration } from '@/features/oidcExplorer/utils/types' // Assuming types exist here

/**
 * Hook to fetch OIDC configuration from an issuer URL.
 * Handles fetching via proxy if necessary.
 */
export function useOidcConfig(): UseOidcConfigResult {
  const [data, setData] = useState<OidcConfiguration | null>(null)
  const [currentIssuer, setCurrentIssuer] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<Error | null>(null)
  const requestIdRef = useRef(0)

  const fetchConfig = useCallback(async (issuerUrl: string) => {
    if (!issuerUrl) {
      setCurrentIssuer(null)
      setData(null)
      setError(null)
      setIsLoading(false)
      return
    }

    setCurrentIssuer(issuerUrl)

    // Construct the well-known URL
    let wellKnownUrl = ''
    try {
      const url = new URL(issuerUrl)
      // Ensure trailing slash for correct joining
      const basePath = url.pathname.endsWith('/') ? url.pathname : `${url.pathname}/`
      wellKnownUrl = new URL(`${basePath}.well-known/openid-configuration`, url.origin).toString()
    } catch {
      setError(new Error('Invalid Issuer URL format.'))
      setData(null)
      setIsLoading(false)
      return
    }

    // Check cache first
    const cachedConfig = oidcConfigCache.get(issuerUrl)
    if (cachedConfig) {
      if (import.meta?.env?.DEV) {
        console.log('Using cached OIDC configuration for:', issuerUrl)
      }
      setData(cachedConfig)
      setError(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)
    setData(null)

    const requestId = ++requestIdRef.current

    try {
      const response = await proxyFetch(wellKnownUrl)

      if (!response.ok) {
        let errorMsg = `Failed to fetch OIDC configuration: ${response.status} ${response.statusText}`
        try {
          const errorBody = await response.json()
          errorMsg += ` - ${JSON.stringify(errorBody)}`
        } catch {
          /* Ignore if response body is not JSON */
        }
        throw new Error(errorMsg)
      }

      const configData: OidcConfiguration = await response.json()

      // Store in cache for future use
      oidcConfigCache.set(issuerUrl, configData)
      if (import.meta?.env?.DEV) {
        console.log('Cached OIDC configuration for:', issuerUrl)
      }

      if (requestIdRef.current === requestId) {
        setData(configData)
      }
    } catch (err) {
      if (import.meta?.env?.DEV) {
        console.error('Error fetching OIDC config:', err)
      }
      setError(err instanceof Error ? err : new Error('An unknown error occurred'))
      setData(null)
    } finally {
      if (requestIdRef.current === requestId) {
        setIsLoading(false)
      }
    }
  }, [])

  // We don't fetch automatically on mount, but provide a function to trigger fetching
  return { data, currentIssuer, isLoading, error, fetchConfig }
}

interface UseOidcConfigResult {
  data: OidcConfiguration | null
  currentIssuer: string | null
  isLoading: boolean
  error: Error | null
  fetchConfig: (url: string) => Promise<void>
}
