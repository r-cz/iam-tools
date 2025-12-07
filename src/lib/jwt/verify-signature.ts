import { jwtVerify } from 'jose'

/**
 * Verify a JWT signature using JWKS data
 * @param token The JWT token to verify
 * @param jwks The JWKS data containing public keys
 * @returns True if the signature is valid, false otherwise
 */
export async function verifySignature(
  token: string,
  jwks: any
): Promise<{ valid: boolean; error?: string }> {
  try {
    if (import.meta?.env?.DEV) {
      console.log('Starting signature verification with token:', token.substring(0, 20) + '...')
      console.log('JWKS:', JSON.stringify(jwks, null, 2))
    }

    if (!jwks?.keys?.length) {
      return {
        valid: false,
        error: 'No keys found in the JWKS data',
      }
    }

    // Extract the JWK that matches the token's kid (key ID)
    const tokenHeader = JSON.parse(atob(token.split('.')[0].replace(/-/g, '+').replace(/_/g, '/')))

    if (import.meta?.env?.DEV) {
      console.log('Token header:', tokenHeader)
    }

    // Check if the token has a key ID
    if (!tokenHeader.kid) {
      return {
        valid: false,
        error: 'Token header does not contain a key ID (kid)',
      }
    }

    // Find the matching key in the JWKS
    const matchingKey = jwks.keys.find((key: any) => key.kid === tokenHeader.kid)

    if (!matchingKey) {
      if (import.meta?.env?.DEV) {
        console.error(`No key with ID "${tokenHeader.kid}" found in JWKS`)
        console.log(
          'Available keys:',
          jwks.keys.map((k: any) => k.kid)
        )
      }
      return {
        valid: false,
        error: `No key with ID "${tokenHeader.kid}" found in the JWKS`,
      }
    }

    if (import.meta?.env?.DEV) {
      console.log('Found matching key:', matchingKey)
    }

    // Verify the token using jose
    const result = await jwtVerify(token, async (header) => {
      if (import.meta?.env?.DEV) {
        console.log('Verification header:', header)
      }
      const key = matchingKey

      let algorithm
      if (header.alg?.includes('RS')) {
        algorithm = 'RSASSA-PKCS1-v1_5'
      } else if (header.alg?.includes('ES')) {
        algorithm = 'ECDSA'
      } else if (header.alg?.includes('PS')) {
        algorithm = 'RSA-PSS'
      } else {
        throw new Error(`Unsupported algorithm: ${header.alg}`)
      }

      let hash
      if (header.alg?.includes('256')) {
        hash = 'SHA-256'
      } else if (header.alg?.includes('384')) {
        hash = 'SHA-384'
      } else if (header.alg?.includes('512')) {
        hash = 'SHA-512'
      } else {
        throw new Error(`Unsupported hash: ${header.alg}`)
      }

      try {
        // Import the JWK as a CryptoKey
        const cryptoKey = await crypto.subtle.importKey(
          'jwk',
          key,
          {
            name: algorithm,
            hash: { name: hash },
          },
          false,
          ['verify']
        )

        if (import.meta?.env?.DEV) {
          console.log('Successfully imported key for verification')
        }
        return cryptoKey
      } catch (error) {
        if (import.meta?.env?.DEV) {
          console.error('Error importing key:', error)
        }
        throw error
      }
    })

    if (import.meta?.env?.DEV) {
      console.log('Verification result:', result)
    }

    // If we get here, the verification was successful
    return { valid: true }
  } catch (error: any) {
    if (import.meta?.env?.DEV) {
      console.error('Token verification error:', error)
    }
    return {
      valid: false,
      error: error.message || 'Invalid signature',
    }
  }
}
