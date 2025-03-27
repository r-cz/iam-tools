import { DEMO_JWKS } from './demo-key';

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
 * Creates a simulated JWT token with a dummy signature
 * This is a fallback method that doesn't rely on WebCrypto API
 * 
 * @param payload Optional custom payload to include in the token
 * @returns A JWT string
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
    // Create the header
    const header = {
      alg: "RS256",
      typ: "JWT",
      kid: DEMO_JWKS.keys[0].kid // Use the kid from the JWKS
    };
    
    // Encode header and payload
    const encodedHeader = base64UrlEncode(JSON.stringify(header));
    const encodedPayload = base64UrlEncode(JSON.stringify(defaultPayload));
    
    // For the demo token, we'll use a dummy signature that looks realistic
    // In real applications, this would be an actual signature created with the private key
    const dummySignature = "XCopO5RSxCARj0BoTPaHQXPFMjQ4inuX1TnuNKRdCrQyJsX0olYtR3NKkWQRgGmFu9xOEcrt1YOOQeLgoAPUOcLTpLPcMZrSUxTxnUMJ2tHQH8X2Em1MoVCLWpt2YzQF9-XJQ5NIHs_NqZECYlECNJ5S9QDm1QGY2K4FApukuUWuZz68I9qJQTjXLCfUMEKpz7TzT9vLsJ8J_rvLXa2_TFgyBWVKMKjWl5dn2-EA9TuHzZYMDmHPdMbcuFXNxcMX4vcLrK6YUyLdZ8mWHKFwQQgyo6jnV8363CByn-jHbFYBxYYKavZ2qNmn-fvTkbFx3rHFh-OVLThBngWGhQ";
    
    // Return the token
    return `${encodedHeader}.${encodedPayload}.${dummySignature}`;
  } catch (error) {
    console.error('Error generating token:', error);
    throw error;
  }
}

/**
 * Encode a string as base64url
 * @param str The string to encode
 * @returns base64url encoded string
 */
function base64UrlEncode(str: string): string {
  // First convert the string to base64
  const base64 = btoa(str);
  // Then convert base64 to base64url by replacing characters
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}
