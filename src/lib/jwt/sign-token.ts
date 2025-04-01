import { SignJWT } from 'jose';
import { DEMO_PRIVATE_KEY } from './demo-key';

/**
 * Signs a JWT token with the demo private key
 * 
 * @param payload The payload to include in the token
 * @param header Optional additional header parameters
 * @returns A properly signed JWT string
 */
export async function signToken(
  payload: Record<string, any>,
  header: Record<string, any> = {}
): Promise<string> {
  try {
    // Create a private key object from the JWK
    const privateKey = await importPrivateKey(DEMO_PRIVATE_KEY);
    
    // Create a new JWT
    let jwt = new SignJWT(payload)
      .setProtectedHeader({ 
        alg: 'RS256', 
        typ: 'JWT',
        kid: DEMO_PRIVATE_KEY.kid,
        ...header 
      });
    
    // Set standard parameters if not already in the payload
    if (!payload.iat) {
      jwt = jwt.setIssuedAt();
    }
    
    if (!payload.exp) {
      jwt = jwt.setExpirationTime('1h');
    }
    
    // Sign the JWT with the private key
    return await jwt.sign(privateKey);
  } catch (error) {
    console.error('Error signing token:', error);
    throw error;
  }
}

/**
 * Imports a JWK as a CryptoKey for signing
 * 
 * @param jwk The JWK to import
 * @returns A CryptoKey that can be used for signing
 */
async function importPrivateKey(jwk: any): Promise<CryptoKey> {
  return await crypto.subtle.importKey(
    'jwk',
    jwk,
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256',
    },
    false,
    ['sign']
  );
}
