import { useCallback, useRef, useState } from 'react'
import { oidcConfigCache } from '@/lib/cache/oidc-config-cache'
import type { OidcConfiguration } from '@/features/oidcExplorer/utils/types' // Assuming types exist here
import {
  fetchOidcDiscoveryConfiguration,
  normalizeIssuerUrl,
} from '@/features/oauthPlayground/utils/oidc-preflight'

/**
 * Hook to fetch OIDC configuration from an issuer URL.
 * Handles fetching via proxy if necessary.
 */
export function useOidcConfig(options: UseOidcConfigOptions = {}): UseOidcConfigResult {
  const [data, setData] = useState<OidcConfiguration | null>(null)
  const [currentIssuer, setCurrentIssuer] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<Error | null>(null)
  const requestIdRef = useRef(0)
  const fetchDiscoveryConfiguration =
    options.fetchDiscoveryConfiguration ?? fetchOidcDiscoveryConfiguration

  const fetchConfig = useCallback(
    async (issuerUrl: string) => {
      if (!issuerUrl || issuerUrl.trim().length === 0) {
        setCurrentIssuer(null)
        setData(null)
        setError(null)
        setIsLoading(false)
        return
      }

      let normalizedIssuerUrl: string
      try {
        normalizedIssuerUrl = normalizeIssuerUrl(issuerUrl)
      } catch (error) {
        setError(
          new Error('Invalid Issuer URL format.', {
            cause: error instanceof Error ? error : undefined,
          })
        )
        setData(null)
        setIsLoading(false)
        return
      }

      setCurrentIssuer(normalizedIssuerUrl)

      // Check cache first
      const cachedConfig = oidcConfigCache.get(normalizedIssuerUrl)
      if (cachedConfig) {
        if (import.meta?.env?.DEV) {
          console.log('Using cached OIDC configuration for:', normalizedIssuerUrl)
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
        const { config } = await fetchDiscoveryConfiguration(normalizedIssuerUrl)
        const configData = config as OidcConfiguration

        // Store in cache for future use
        oidcConfigCache.set(normalizedIssuerUrl, configData)
        if (import.meta?.env?.DEV) {
          console.log('Cached OIDC configuration for:', normalizedIssuerUrl)
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
    },
    [fetchDiscoveryConfiguration]
  )

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

interface UseOidcConfigOptions {
  fetchDiscoveryConfiguration?: typeof fetchOidcDiscoveryConfiguration
}
