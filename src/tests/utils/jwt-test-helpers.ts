// src/tests/utils/jwt-test-helpers.ts
import { generateRSAPair, importJWK } from 'node-jose-tools';
import type { JWTHeader, JWTPayload } from '../../types/token';

/**
 * Generate test key pairs for JWT testing
 * @returns An object containing public and private keys in JWK format
 */
export async function generateTestKeyPair() {
  const { publicJwk, privateJwk } = await generateRSAPair({
    kid: 'test-key-id',
    use: 'sig',
    alg: 'RS256',
  });

  return {
    publicKey: publicJwk,
    privateKey: privateJwk,
    jwks: {
      keys: [publicJwk]
    }
  };
}

/**
 * Create a test JWT with specific payload values
 * @param payload The JWT payload
 * @param header Optional JWT header properties
 * @param privateKey The private key to sign with (JWK format)
 * @returns A signed JWT string
 */
export async function createTestJWT(
  payload: JWTPayload,
  header: Partial<JWTHeader> = {},
  privateKey: any
): Promise<string> {
  try {
    // Import the private key
    const key = await importJWK(privateKey);

    // Create header
    const jwtHeader = {
      alg: 'RS256',
      typ: 'JWT',
      kid: privateKey.kid,
      ...header
    };

    // Base64 encode header and payload
    const encodedHeader = Buffer.from(JSON.stringify(jwtHeader)).toString('base64url');
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');

    // Create signature input
    const signatureInput = `${encodedHeader}.${encodedPayload}`;
    
    // Create crypto key from JWK
    const cryptoKey = await crypto.subtle.importKey(
      'jwk',
      privateKey,
      {
        name: 'RSASSA-PKCS1-v1_5',
        hash: { name: 'SHA-256' },
      },
      false,
      ['sign']
    );

    // Sign the JWT
    const signatureBuffer = await crypto.subtle.sign(
      { name: 'RSASSA-PKCS1-v1_5' },
      cryptoKey,
      new TextEncoder().encode(signatureInput)
    );

    // Base64 encode the signature
    const signature = Buffer.from(signatureBuffer).toString('base64url');

    // Return the complete JWT
    return `${encodedHeader}.${encodedPayload}.${signature}`;
  } catch (error) {
    console.error('Error creating test JWT:', error);
    throw error;
  }
}

/**
 * Create a test JWKS with multiple keys
 * @param count Number of keys to generate
 * @returns A JWKS object with the specified number of keys
 */
export async function createTestJWKS(count = 3) {
  const keys = [];
  
  for (let i = 0; i < count; i++) {
    const { publicKey } = await generateTestKeyPair();
    keys.push(publicKey);
  }
  
  return { keys };
}

/**
 * Create an invalid JWT (with incorrect signature)
 * @param validJwt A valid JWT to tamper with
 * @returns A JWT with an invalid signature
 */
export function createInvalidJWT(validJwt: string): string {
  const parts = validJwt.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid JWT format');
  }
  
  // Tamper with the signature
  let signature = parts[2];
  
  // Change a character in the signature to make it invalid
  if (signature.length > 0) {
    const pos = Math.floor(signature.length / 2);
    const char = signature.charAt(pos);
    const newChar = char === 'A' ? 'B' : 'A';
    signature = signature.substring(0, pos) + newChar + signature.substring(pos + 1);
  }
  
  return `${parts[0]}.${parts[1]}.${signature}`;
}

/**
 * Create an expired JWT
 * @param payload Base payload
 * @param expiryInPast Seconds in the past for expiry
 * @param privateKey Private key for signing
 */
export async function createExpiredJWT(
  payload: JWTPayload,
  expiryInPast = 3600,
  privateKey: any
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return createTestJWT(
    {
      ...payload,
      iat: now - expiryInPast * 2, // Issued at time in the past
      exp: now - expiryInPast, // Expired time in the past
    },
    {},
    privateKey
  );
}

/**
 * Create a JWT with future validity (not valid yet)
 */
export async function createFutureJWT(
  payload: JWTPayload,
  notBeforeInFuture = 3600,
  privateKey: any
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return createTestJWT(
    {
      ...payload,
      iat: now + notBeforeInFuture, // Issued at time in the future
      nbf: now + notBeforeInFuture, // Not valid before time in the future
      exp: now + notBeforeInFuture * 2, // Expiry in the far future
    },
    {},
    privateKey
  );
}
