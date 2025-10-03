import { OidcConfiguration } from '@/features/oidcExplorer/utils/types'
import { ResourceCache, CacheOptions } from './resource-cache'

/**
 * OIDC Configuration Cache - specialized cache for OpenID Connect configurations
 * Uses longer TTLs than JWKS cache as configurations change less frequently
 */
export class OidcConfigCache extends ResourceCache<OidcConfiguration> {
  constructor(options?: Partial<Omit<CacheOptions, 'storageKey'>>) {
    super({
      storageKey: 'oidc-config-cache',
      memoryTTL: options?.memoryTTL ?? 1000 * 60 * 60, // 1 hour for memory
      storageTTL: options?.storageTTL ?? 1000 * 60 * 60 * 24, // 24 hours for storage
      maxEntries: options?.maxEntries ?? 50,
    })
  }
}

// Export a singleton instance
export const oidcConfigCache = new OidcConfigCache()
