import { SignJWT } from 'jose'
import { DEMO_PRIVATE_KEY } from './demo-key'

/**
 * Signs a JWT token with the demo private key.
 */
export async function signToken(
  payload: Record<string, unknown>,
  header: Record<string, unknown> = {}
): Promise<string> {
  let privateKey: CryptoKey

  try {
    privateKey = await importPrivateKey(DEMO_PRIVATE_KEY)
  } catch (error) {
    if (import.meta?.env?.DEV) {
      console.error('[signToken] Failed to import private key:', error)
    }

    throw new Error('Failed to import private key', { cause: error })
  }

  try {
    let jwt = new SignJWT(payload).setProtectedHeader({
      alg: 'RS256',
      typ: 'JWT',
      kid: DEMO_PRIVATE_KEY.kid,
      ...header,
    })

    if (payload.iat == null) {
      jwt = jwt.setIssuedAt()
    }

    if (payload.exp == null) {
      jwt = jwt.setExpirationTime('1h')
    }

    return await jwt.sign(privateKey)
  } catch (error) {
    if (import.meta?.env?.DEV) {
      console.error('[signToken] Failed to sign JWT:', error)
    }

    throw new Error('Failed to sign JWT token', { cause: error })
  }
}

/**
 * Imports a JWK as a CryptoKey for signing using Web Crypto API.
 */
async function importPrivateKey(jwk: JsonWebKey): Promise<CryptoKey> {
  if (!crypto?.subtle?.importKey) {
    throw new Error('crypto.subtle.importKey is not available')
  }

  return await crypto.subtle.importKey(
    'jwk',
    jwk,
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: { name: 'SHA-256' },
    },
    false,
    ['sign']
  )
}
