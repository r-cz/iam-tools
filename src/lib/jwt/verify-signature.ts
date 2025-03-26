import { jwtVerify } from 'jose';

/**
 * Verify a JWT signature using JWKS data
 * @param token The JWT token to verify
 * @param jwks The JWKS data containing public keys
 * @returns True if the signature is valid, false otherwise
 */
export async function verifySignature(token: string, jwks: any): Promise<{ valid: boolean; error?: string }> {
  try {
    if (!jwks?.keys?.length) {
      return { 
        valid: false, 
        error: 'No keys found in the JWKS data'
      };
    }

    // Extract the JWK that matches the token's kid (key ID)
    const tokenHeader = JSON.parse(
      atob(token.split('.')[0].replace(/-/g, '+').replace(/_/g, '/'))
    );
    
    // Check if the token has a key ID
    if (!tokenHeader.kid) {
      return { 
        valid: false, 
        error: 'Token header does not contain a key ID (kid)'
      };
    }
    
    // Find the matching key in the JWKS
    const matchingKey = jwks.keys.find((key: any) => key.kid === tokenHeader.kid);
    
    if (!matchingKey) {
      return { 
        valid: false, 
        error: `No key with ID "${tokenHeader.kid}" found in the JWKS`
      };
    }
    
    // Verify the token signature using jose
    await jwtVerify(token, async (header) => {
      // This function returns the key to use for verification
      const key = matchingKey;
      
      // Import the JWK as a CryptoKey
      return await crypto.subtle.importKey(
        'jwk',
        key,
        {
          name: header.alg === 'RS256' ? 'RSASSA-PKCS1-v1_5' : 'ECDSA',
          hash: { name: header.alg?.includes('256') ? 'SHA-256' : 'SHA-384' },
        },
        false,
        ['verify']
      );
    });
    
    // If we get here, the verification was successful
    return { valid: true };
  } catch (error: any) {
    console.error('Token verification error:', error);
    return { 
      valid: false, 
      error: error.message || 'Invalid signature'
    };
  }
}
