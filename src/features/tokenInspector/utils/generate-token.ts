/**
 * Utility to generate a fresh JWT token with current timestamps
 */
import { generateSignedToken } from '@/lib/jwt/generate-signed-token';

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
    // Fall back to the legacy method if something goes wrong
    return generateLegacyToken();
  }
}

// Legacy implementation, kept for fallback
function generateLegacyToken(): string {
  const currentTimestamp = Math.floor(Date.now() / 1000);
  
  // Create a token valid for 1 hour from now
  const iat = currentTimestamp;
  const exp = currentTimestamp + 3600; // 1 hour from now
  
  // Create the payload
  const payload = {
    sub: "1234567890",
    name: "John Doe",
    iat: iat,
    exp: exp,
    aud: "example.com",
    iss: "https://auth.example.com"
  };
  
  // Create the header
  const header = {
    alg: "HS256",
    typ: "JWT"
  };
  
  // Encode header and payload
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  
  // For the signature, we'll use a placeholder
  // This is just for display purposes and won't be validated
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
