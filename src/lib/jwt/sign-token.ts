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
  let privateKey: CryptoKey;
  try {
    console.log("[signToken] Attempting to import private key...");
    privateKey = await importPrivateKey(DEMO_PRIVATE_KEY);
    console.log("[signToken] Private key imported successfully.");

    // *** START: Direct Web Crypto API Sign Test ***
    try {
      console.log("[signToken] Attempting direct sign with crypto.subtle.sign...");
      const dataToSign = new TextEncoder().encode("Test data to sign");
      const signature = await crypto.subtle.sign(
        { name: 'RSASSA-PKCS1-v1_5' }, // Algorithm for signing
        privateKey,                   // The imported key
        dataToSign                    // Data to sign (ArrayBuffer)
      );
      console.log("[signToken] Direct crypto.subtle.sign succeeded. Signature length:", signature.byteLength);
    } catch (directSignError: any) {
      console.error("[signToken] Direct crypto.subtle.sign FAILED:", directSignError);
      // If this fails, the issue is likely with the key or Web Crypto API itself
      throw new Error(`Direct Web Crypto sign failed: ${directSignError.message}`);
    }
    // *** END: Direct Web Crypto API Sign Test ***

  } catch (importOrDirectSignError: any) {
    // Catch errors from import OR the direct sign test
    console.error('[signToken] Error importing key or during direct sign test:', importOrDirectSignError);
    throw new Error(`Failed during key import or direct sign test: ${importOrDirectSignError.message || importOrDirectSignError}`);
  }

  try {
    console.log("[signToken] Preparing JWT for signing with jose...");
    let jwt = new SignJWT(payload)
      .setProtectedHeader({
        alg: 'RS256',
        typ: 'JWT',
        kid: DEMO_PRIVATE_KEY.kid,
        ...header
      });

    if (!payload.iat) jwt = jwt.setIssuedAt();
    if (!payload.exp) jwt = jwt.setExpirationTime('1h');

    console.log('[signToken] Attempting to sign JWT with jose...');
    const signedToken = await jwt.sign(privateKey); // This is where the original error occurred
    console.log('[signToken] JWT signed successfully with jose.');
    return signedToken;

  } catch (joseSignError: any) {
    // This specifically catches errors from jose's sign method
    console.error('[signToken] Error during jose JWT signing:', joseSignError);
    if (joseSignError.message) console.error('[signToken] Jose Sign Error Message:', joseSignError.message);
    if (joseSignError.stack) console.error('[signToken] Jose Sign Error Stack:', joseSignError.stack);
    // Re-throw the specific error from jose
    throw joseSignError;
  }
}

/**
 * Imports a JWK as a CryptoKey for signing
 *
 * @param jwk The JWK to import
 * @returns A CryptoKey that can be used for signing
 */
async function importPrivateKey(jwk: any): Promise<CryptoKey> {
  try {
    console.log(`[importPrivateKey] Importing key with kty: ${jwk.kty}, alg: ${jwk.alg}`);
    console.log(`[importPrivateKey] Using import parameters: name=RSASSA-PKCS1-v1_5, hash=SHA-256`);

    if (!crypto?.subtle?.importKey) {
        throw new Error("crypto.subtle.importKey is not available in this environment.");
    }
    if (!crypto?.subtle?.sign) {
        throw new Error("crypto.subtle.sign is not available in this environment.");
    }


    const key = await crypto.subtle.importKey(
      'jwk',
      jwk,
      {
        name: 'RSASSA-PKCS1-v1_5',
        hash: { name: 'SHA-256' },
      },
      false,
      ['sign']
    );
    console.log('[importPrivateKey] crypto.subtle.importKey succeeded.');
    return key;
  } catch (error: any) {
     console.error('[importPrivateKey] Error during crypto.subtle.importKey:', error);
     throw error;
  }
}