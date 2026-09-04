import { compactVerify, createLocalJWKSet, errors, type JSONWebKeySet } from 'jose'
import { jwksCache } from '@/lib/cache/jwks-cache'
import { proxyFetch } from '@/lib/proxy-fetch'

interface VerifyResult {
  valid: boolean
  error?: string
}

interface VerificationAttempt {
  result: VerifyResult
  refreshable: boolean
}

async function attemptVerification(
  token: string,
  jwks: JSONWebKeySet
): Promise<VerificationAttempt> {
  try {
    // Signature validity is independent of claim validity. The inspector reports
    // exp/nbf separately, so an expired, correctly signed JWT still has a valid signature.
    // jose also selects keys by alg, kid, use, key_ops and curve; kid is optional.
    await compactVerify(token, createLocalJWKSet(jwks))
    return { result: { valid: true }, refreshable: false }
  } catch (error) {
    return {
      result: {
        valid: false,
        error: error instanceof Error ? error.message : 'Invalid signature',
      },
      refreshable:
        error instanceof errors.JWKSNoMatchingKey ||
        error instanceof errors.JWSSignatureVerificationFailed,
    }
  }
}

/** Verify the JWS signature, refreshing public keys once when rotation could explain a failure. */
export async function verifySignatureWithRefresh(
  token: string,
  jwksUri: string,
  initialJwks: JSONWebKeySet,
  onJwksRefresh?: (newJwks: JSONWebKeySet) => void,
  fetchJwks: typeof proxyFetch = proxyFetch
): Promise<VerifyResult> {
  const firstAttempt = await attemptVerification(token, initialJwks)
  if (firstAttempt.result.valid || !firstAttempt.refreshable || !jwksUri) {
    return firstAttempt.result
  }

  const cachedJwks = jwksCache.get(jwksUri)
  if (cachedJwks && cachedJwks !== initialJwks) {
    const cachedAttempt = await attemptVerification(token, cachedJwks)
    if (cachedAttempt.result.valid) {
      onJwksRefresh?.(cachedJwks)
      return cachedAttempt.result
    }
  }

  try {
    // Join a refresh already underway; a token inspection must not launch a
    // second network request for every consumer awaiting the same rotated key.
    const freshJwks = await (jwksCache.getPendingRequest(jwksUri) ??
      jwksCache.getOrLoad(
        jwksUri,
        async () => {
          const response = await fetchJwks(jwksUri)
          if (!response.ok) {
            throw new Error(`Failed to fetch JWKS: ${response.status} ${response.statusText}`)
          }
          const value: JSONWebKeySet = await response.json()
          // Validate before persisting, including malformed individual key entries.
          createLocalJWKSet(value)
          return value
        },
        { forceRefresh: true }
      ))
    onJwksRefresh?.(freshJwks)
    return (await attemptVerification(token, freshJwks)).result
  } catch (error) {
    return {
      valid: false,
      error: `${firstAttempt.result.error} (JWKS refresh also failed: ${error instanceof Error ? error.message : String(error)})`,
    }
  }
}
