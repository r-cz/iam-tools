import { useCallback } from 'react'
import { proxyFetch } from '@/lib/proxy-fetch'
import { oidcConfigCache } from '@/lib/cache/oidc-config-cache'
import { useAsyncFetch } from '../use-async-fetch'
import type { OidcConfiguration } from '@/features/oidcExplorer/utils/types'

interface UseOidcConfigResult {
  data: OidcConfiguration | null
  isLoading: boolean
  error: Error | null
  fetchConfig: (url: string) => Promise<OidcConfiguration | null>
}

/**
 * Hook to fetch OIDC configuration from an issuer URL.
 * Handles fetching via proxy if necessary.
 *
 * This is a refactored version using the new useAsyncFetch hook,
 * demonstrating how to simplify async data fetching patterns.
 *
 * Note: This example handles caching manually within the fetch function
 * since the oidcConfigCache uses a custom implementation.
 */
export function useOidcConfig(): UseOidcConfigResult {
  const fetchFunction = useCallback(async (...args: unknown[]) => {
    const issuerUrl = args[0]
    if (typeof issuerUrl !== 'string') {
      throw new Error('Issuer URL must be a string')
    }
    if (!issuerUrl) {
      throw new Error('Issuer URL is required')
    }

    // Check cache first
    const cachedConfig = oidcConfigCache.get(issuerUrl)
    if (cachedConfig) {
      console.log('Using cached OIDC configuration for:', issuerUrl)
      return cachedConfig
    }

    // Construct the well-known URL
    let wellKnownUrl = ''
    try {
      const url = new URL(issuerUrl)
      // Ensure trailing slash for correct joining
      const basePath = url.pathname.endsWith('/') ? url.pathname : `${url.pathname}/`
      wellKnownUrl = new URL(`${basePath}.well-known/openid-configuration`, url.origin).toString()
    } catch {
      throw new Error('Invalid Issuer URL format.')
    }

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
    console.log('Cached OIDC configuration for:', issuerUrl)

    return configData
  }, [])

  const { data, isLoading, error, execute } = useAsyncFetch(fetchFunction, {
    shouldExecute: (...args: unknown[]) => !!args[0],
    onSuccess: () => {
      console.log('Successfully fetched OIDC configuration')
    },
    onError: (error) => {
      console.error('Error fetching OIDC config:', error)
    },
  })

  // Rename execute to fetchConfig for backwards compatibility
  const fetchConfig = execute

  return { data, isLoading, error, fetchConfig }
}
