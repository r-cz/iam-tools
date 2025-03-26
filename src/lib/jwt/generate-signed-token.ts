import { SignJWT } from 'jose';
import { DEMO_PRIVATE_KEY } from './demo-key';

/**
 * Determines the host URL for the current environment
 * @returns The base URL for the current environment
 */
export function getIssuerBaseUrl(): string {
  const host = window.location.host;
  const protocol = window.location.protocol;
  
  // For local development with Cloudflare workers
  if (host.includes('localhost') && host.includes('5173')) {
    // Use the local wrangler development server for the API
    return 'http://localhost:8788/api';
  }
  
  // For production (or any other environment)
  return `${protocol}//${host}/api`;
}

/**
 * Creates a properly signed JWT using RSA-256 for demo purposes
 * This token can be validated against our JWKS endpoint
 * 
 * @param payload Optional custom payload to include in the token
 * @returns A signed JWT string
 */
export async function generateSignedToken(payload?: Record<string, any>): Promise<string> {
  const currentTime = Math.floor(Date.now() / 1000);
  const issuer = getIssuerBaseUrl();
  
  console.log('Generating token with issuer:', issuer);
  
  // Create the default payload
  const defaultPayload = {
    // Standard claims
    sub: "1234567890",
    name: "John Doe",
    email: "john.doe@example.com",
    iat: currentTime,
    exp: currentTime + 3600, // 1 hour from now
    aud: "example-client",
    iss: issuer,
    
    // Some additional claims for demo purposes
    preferred_username: "johndoe",
    groups: ["users", "premium"],
    scope: "openid profile email api:read",
    
    // Add a marker to identify this as a demo token
    is_demo_token: true,
    
    // Allow custom overrides
    ...payload 
  };

  try {
    // First generate the private CryptoKey from the JWK
    const privateKey = await importPrivateKey();
    
    // Now use jose's SignJWT to create a properly signed token
    const jwt = await new SignJWT(defaultPayload)
      .setProtectedHeader({ 
        alg: 'RS256', 
        typ: 'JWT', 
        kid: DEMO_PRIVATE_KEY.kid 
      })
      .sign(privateKey);
    
    console.log('Successfully signed token');
    return jwt;
  } catch (error) {
    console.error('Error signing JWT:', error);
    throw error;
  }
}

/**
 * Imports the demo private key for signing
 */
async function importPrivateKey() {
  try {
    console.log('Importing private key with kid:', DEMO_PRIVATE_KEY.kid);
    
    // Import the JWK as a CryptoKey
    const cryptoKey = await crypto.subtle.importKey(
      'jwk',
      DEMO_PRIVATE_KEY,
      {
        name: 'RSASSA-PKCS1-v1_5',
        hash: { name: 'SHA-256' },
      },
      false, // not extractable
      ['sign'] // can only be used for signing
    );
    
    console.log('Successfully imported private key');
    return cryptoKey;
  } catch (error) {
    console.error('Error importing private key:', error);
    throw error;
  }
}
