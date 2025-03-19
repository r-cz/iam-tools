/**
 * Utility to generate a fresh JWT token with current timestamps
 */

// Function to encode as base64url
function base64UrlEncode(str: string): string {
  return btoa(str)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Generates a fresh JWT token with current timestamps
 * @returns A JWT token string with current timestamps
 */
export function generateFreshToken(): string {
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