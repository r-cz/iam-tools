/**
 * Debug utility to verify a JWT token directly against the demo JWKS.
 * This is useful for testing the verification process without UI components.
 */
import { jwtVerify } from 'jose';
import { DEMO_JWKS } from './demo-key';

/**
 * Directly verify a token against the demo JWKS
 * @param token JWT token to verify
 * @returns Verification result
 */
export async function testJwtVerification(token: string): Promise<{
  valid: boolean; 
  payload?: any;
  error?: string;
}> {
  try {
    // Extract the header to check the alg and kid
    const headerBase64 = token.split('.')[0];
    const headerStr = atob(headerBase64.replace(/-/g, '+').replace(/_/g, '/'));
    const header = JSON.parse(headerStr);
    
    console.log('Token header:', header);
    
    // Find the matching key
    const matchingKey = DEMO_JWKS.keys.find(key => key.kid === header.kid);
    
    if (!matchingKey) {
      console.error('No matching key found in JWKS');
      return { valid: false, error: 'No matching key found' };
    }
    
    console.log('Using key:', matchingKey);
    
    // Verify the token
    const result = await jwtVerify(token, async () => {
      return await crypto.subtle.importKey(
        'jwk',
        matchingKey,
        {
          name: 'RSASSA-PKCS1-v1_5',
          hash: { name: 'SHA-256' },
        },
        false,
        ['verify']
      );
    });
    
    console.log('Verification succeeded!', result);
    
    return {
      valid: true,
      payload: result.payload
    };
  } catch (error: any) {
    console.error('Verification failed:', error);
    return {
      valid: false,
      error: error.message
    };
  }
}
