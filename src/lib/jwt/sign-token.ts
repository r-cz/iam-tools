// src/lib/jwt/sign-token.ts
import { SignJWT } from 'jose'
import { DEMO_PRIVATE_KEY } from './demo-key' // Uses your new key

/**
 * Signs a JWT token with the demo private key.
 * Now simplified after debugging.
 *
 * @param payload The payload to include in the token
 * @param header Optional additional header parameters
 * @returns A properly signed JWT string
 */
export async function signToken(
  payload: Record<string, any>,
  header: Record<string, any> = {}
): Promise<string> {
  let privateKey: CryptoKey
  try {
    // 1. Import the private key
    if (import.meta?.env?.DEV) console.log('[signToken] Importing private key...')
    privateKey = await importPrivateKey(DEMO_PRIVATE_KEY)
    if (import.meta?.env?.DEV) console.log('[signToken] Private key imported successfully.')
  } catch (importError: any) {
    console.error('[signToken] Error importing private key:', importError)
    throw new Error(`Failed to import private key: ${importError.message || importError}`)
  }

  try {
    // 2. Prepare the JWT with headers using jose
    if (import.meta?.env?.DEV) console.log('[signToken] Preparing JWT for signing with jose...')
    let jwt = new SignJWT(payload).setProtectedHeader({
      alg: 'RS256', // Algorithm defined in your key
      typ: 'JWT',
      kid: DEMO_PRIVATE_KEY.kid, // *** Use the Key ID from your key file ***
      ...header,
    })

    // Add standard timestamps if not provided in payload
    if (!payload.iat) jwt = jwt.setIssuedAt()
    if (!payload.exp) jwt = jwt.setExpirationTime('1h') // Default 1 hour expiry

    // 3. Sign the JWT using jose and the imported key
    if (import.meta?.env?.DEV) console.log('[signToken] Attempting to sign JWT with jose...')
    const signedToken = await jwt.sign(privateKey)
    if (import.meta?.env?.DEV) console.log('[signToken] JWT signed successfully with jose.')
    return signedToken
  } catch (joseSignError: any) {
    console.error('[signToken] Error during jose JWT signing:', joseSignError)
    if (joseSignError.message)
      console.error('[signToken] Jose Sign Error Message:', joseSignError.message)
    // Re-throw for higher-level components to catch
    throw joseSignError
  }
}

/**
 * Imports a JWK as a CryptoKey for signing using Web Crypto API.
 */
async function importPrivateKey(jwk: any): Promise<CryptoKey> {
  try {
    // Check if necessary APIs exist
    if (!crypto?.subtle?.importKey) {
      throw new Error('crypto.subtle.importKey is not available.')
    }

    // Import the key using corrected parameters
    const key = await crypto.subtle.importKey(
      'jwk',
      jwk,
      {
        name: 'RSASSA-PKCS1-v1_5', // Algorithm name
        hash: { name: 'SHA-256' }, // Hash function for the algorithm
      },
      false, // Exportable flag (false for private keys usually)
      ['sign'] // Key usage - we want to sign with it
    )
    console.log('[importPrivateKey] crypto.subtle.importKey succeeded.')
    return key
  } catch (error: any) {
    console.error('[importPrivateKey] Error during crypto.subtle.importKey:', error)
    throw error // Re-throw to be caught by signToken
  }
}
