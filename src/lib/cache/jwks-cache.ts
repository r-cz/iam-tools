import { JSONWebKeySet } from 'jose'
import { ResourceCache, CacheOptions } from './resource-cache'

/**
 * JWKS Cache - specialized cache for JSON Web Key Sets
 * Uses shorter TTLs than OIDC config cache due to key rotation scenarios
 */
export class JwksCache extends ResourceCache<JSONWebKeySet> {
  constructor(options?: Partial<Omit<CacheOptions, 'storageKey'>>) {
    super({
      storageKey: 'jwks-cache',
      memoryTTL: options?.memoryTTL ?? 1000 * 60 * 5, // 5 minutes for memory (shorter than OIDC config)
      storageTTL: options?.storageTTL ?? 1000 * 60 * 60, // 1 hour for storage (shorter than OIDC config)
      maxEntries: options?.maxEntries ?? 50,
    })
  }
}

// Export a singleton instance
export const jwksCache = new JwksCache()
