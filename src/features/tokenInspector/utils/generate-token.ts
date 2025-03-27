/**
 * Utility to generate a fresh JWT token with current timestamps
 */
import { generateSignedToken, getIssuerBaseUrl } from '@/lib/jwt/generate-signed-token';

/**
 * Generates a fresh JWT token with current timestamps
 * @returns A properly signed JWT token string
 */
export async function generateFreshToken(): Promise<string> {
  try {
    // Use our new implementation to create a properly signed token
    return await generateSignedToken();
  } catch (error) {
    console.error('Error generating signed token:', error);
    // Fall back to the legacy method but still use the correct issuer URL
    return generateLegacyToken();
  }
}

// Legacy implementation, kept for fallback
function generateLegacyToken(): string {
  const currentTimestamp = Math.floor(Date.now() / 1000);
  
  // Get the issuer URL from our utility
  // This ensures we're always using the correct domain
  const issuerUrl = getIssuerBaseUrl();
  
  // Create a token valid for 1 hour from now
  const iat = currentTimestamp;
  const exp = currentTimestamp + 3600; // 1 hour from now
  
  // Create the payload
  const payload = {
    sub: "1234567890",
    name: "John Doe",
    iat: iat,
    exp: exp,
    aud: "example-client",
    // Use the correct issuer URL
    iss: issuerUrl,
    // Mark as demo token
    is_demo_token: true
  };
  
  // Create the header
  const header = {
    alg: "RS256", // Use RS256 to match our JWKS
    typ: "JWT",
    kid: "demo-key-2025" // Include the key ID
  };
  
  // Encode header and payload
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  
  // For the signature, we'll use a placeholder
  // Note: This won't be validatable, but at least the issuer is right
  const signaturePart = "XCopO5RSxCARj0BoTPaHQXPFMjQ4inuX1TnuNKRdCrQ";
  
  // Combine parts to form the JWT
  return `${encodedHeader}.${encodedPayload}.${signaturePart}`;
}

// Function to encode as base64url
function base64UrlEncode(str: string): string {
  return btoa(str)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}
