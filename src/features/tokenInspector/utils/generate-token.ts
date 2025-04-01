// src/features/tokenInspector/utils/generate-token.ts
/**
 * Utility to generate a fresh, signed JWT token for examples.
 */
import { signToken } from '@/lib/jwt/sign-token'; // Import the unified signing function

/**
 * Generates a fresh JWT token with current timestamps using the demo key.
 * @returns A properly signed JWT token string.
 */
export async function generateFreshToken(): Promise<string> {
  try {
    // 1. Define a simple payload suitable for an example token
    const examplePayload = {
      iss: "https://iam.tools/demo", // A distinct issuer for examples
      sub: "user-example-123",
      aud: "iam-tools-example-audience",
      name: "Example User",
      email: "example@iam.tools",
      iat: Math.floor(Date.now() / 1000), // Issued now
      exp: Math.floor(Date.now() / 1000) + 3600, // Expires in 1 hour
      scope: "openid profile email",
      is_demo_token: true // Mark it clearly
      // Add any other claims you want in the generic example
    };

    // 2. Call the unified signToken function with this payload
    console.log("Generating fresh example token using signToken...");
    const signedToken = await signToken(examplePayload);
    return signedToken;

  } catch (error) {
    console.error('Error generating fresh example token:', error);
    // Re-throw the error so the component calling this can handle it (e.g., show a toast)
    throw error;
  }
}

// No more legacy code needed below this line!
// The generateLegacyToken and base64UrlEncode functions have been removed.