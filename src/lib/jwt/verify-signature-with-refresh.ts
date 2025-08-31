import { jwtVerify, JSONWebKeySet } from 'jose'
import { jwksCache } from '@/lib/cache/jwks-cache'
import { proxyFetch } from '@/lib/proxy-fetch'

interface VerifyResult {
  valid: boolean
  error?: string
}

/**
 * Verify a JWT signature with automatic JWKS refresh on key rotation
 * @param token The JWT token to verify
 * @param jwksUri The URI where JWKS can be fetched
 * @param initialJwks The initial JWKS to try (from cache or hook state)
 * @param onJwksRefresh Optional callback when JWKS is refreshed
 * @returns Promise<VerifyResult>
 */
export async function verifySignatureWithRefresh(
  token: string,
  jwksUri: string,
  initialJwks: JSONWebKeySet,
  onJwksRefresh?: (newJwks: JSONWebKeySet) => void
): Promise<VerifyResult> {
  try {
    if (import.meta?.env?.DEV)
      console.log('Starting signature verification with token:', token.substring(0, 20) + '...')

    if (!initialJwks?.keys?.length) {
      return {
        valid: false,
        error: 'No keys found in the JWKS data',
      }
    }

    // Extract the JWK that matches the token's kid (key ID)
    const tokenHeader = JSON.parse(atob(token.split('.')[0].replace(/-/g, '+').replace(/_/g, '/')))

    if (import.meta?.env?.DEV) console.log('Token header:', tokenHeader)

    // Check if the token has a key ID
    if (!tokenHeader.kid) {
      return {
        valid: false,
        error: 'Token header does not contain a key ID (kid)',
      }
    }

    // First attempt: Try with the provided JWKS
    const attemptVerification = async (jwks: JSONWebKeySet): Promise<VerifyResult> => {
      const matchingKey = jwks.keys.find((key: any) => key.kid === tokenHeader.kid)

      if (!matchingKey) {
        return {
          valid: false,
          error: `No key with ID "${tokenHeader.kid}" found in the JWKS`,
        }
      }

      try {
        if (import.meta?.env?.DEV) console.log('Found matching key:', matchingKey)
        await jwtVerify(token, await importKey(matchingKey, tokenHeader.alg))
        if (import.meta?.env?.DEV) console.log('Verification successful')
        return { valid: true }
      } catch (error: any) {
        if (import.meta?.env?.DEV) console.error('Verification failed:', error)
        return {
          valid: false,
          error: error.message || 'Invalid signature',
        }
      }
    }

    // Try with initial JWKS
    const firstAttempt = await attemptVerification(initialJwks)

    // If verification failed due to key not found or invalid signature, try refreshing JWKS
    if (!firstAttempt.valid && jwksUri) {
      if (import.meta?.env?.DEV)
        console.log('First verification attempt failed, checking for updated JWKS...')

      try {
        // First check if we have cached JWKS that might have been updated
        const cachedJwks = jwksCache.get(jwksUri)
        if (cachedJwks && cachedJwks !== initialJwks) {
          if (import.meta?.env?.DEV)
            console.log('Found different JWKS in cache, trying with cached version first')
          const cacheAttempt = await attemptVerification(cachedJwks)
          if (cacheAttempt.valid) {
            if (import.meta?.env?.DEV) console.log('Verification successful with cached JWKS')
            return cacheAttempt
          }
        }

        // If cache didn't help, remove from cache and fetch fresh
        if (import.meta?.env?.DEV) console.log('Cached JWKS did not help, fetching fresh JWKS...')
        jwksCache.remove(jwksUri)

        // Fetch fresh JWKS
        const response = await proxyFetch(jwksUri)
        if (!response.ok) {
          throw new Error(`Failed to fetch JWKS: ${response.status} ${response.statusText}`)
        }

        const freshJwks: JSONWebKeySet = await response.json()

        // Validate the fresh JWKS
        if (!freshJwks || !Array.isArray(freshJwks.keys)) {
          throw new Error('Invalid JWKS format')
        }

        // Cache the fresh JWKS
        jwksCache.set(jwksUri, freshJwks)
        if (import.meta?.env?.DEV) console.log('JWKS refreshed and cached')

        // Notify caller of the refresh
        if (onJwksRefresh) {
          onJwksRefresh(freshJwks)
        }

        // Try verification again with fresh JWKS
        const secondAttempt = await attemptVerification(freshJwks)

        if (secondAttempt.valid && import.meta?.env?.DEV) {
          console.log('Verification successful after JWKS refresh')
        }

        return secondAttempt
      } catch (refreshError: any) {
        if (import.meta?.env?.DEV) console.error('Failed to refresh JWKS:', refreshError)
        // Return the original error, not the refresh error
        return {
          ...firstAttempt,
          error: `${firstAttempt.error} (JWKS refresh also failed: ${refreshError.message})`,
        }
      }
    }

    return firstAttempt
  } catch (error: any) {
    if (import.meta?.env?.DEV) console.error('Token verification error:', error)
    return {
      valid: false,
      error: error.message || 'Invalid signature',
    }
  }
}

// Helper function to import a JWK key
async function importKey(jwk: any, alg: string): Promise<CryptoKey> {
  let algorithm
  if (alg?.includes('RS')) {
    algorithm = 'RSASSA-PKCS1-v1_5'
  } else if (alg?.includes('ES')) {
    algorithm = 'ECDSA'
  } else if (alg?.includes('PS')) {
    algorithm = 'RSA-PSS'
  } else {
    throw new Error(`Unsupported algorithm: ${alg}`)
  }

  let hash
  if (alg?.includes('256')) {
    hash = 'SHA-256'
  } else if (alg?.includes('384')) {
    hash = 'SHA-384'
  } else if (alg?.includes('512')) {
    hash = 'SHA-512'
  } else {
    throw new Error(`Unsupported hash: ${alg}`)
  }

  return await crypto.subtle.importKey(
    'jwk',
    jwk,
    {
      name: algorithm,
      hash: { name: hash },
    },
    false,
    ['verify']
  )
}
