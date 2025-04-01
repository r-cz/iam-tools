/**
 * PKCE (Proof Key for Code Exchange) utilities
 * Implements the key generation for PKCE OAuth flow
 */

/**
 * Generates a random string for use as a code verifier
 * @returns A random string of 43-128 characters
 */
export const generateCodeVerifier = (): string => {
  const array = new Uint8Array(64); // 64 bytes will give us a reasonable length
  window.crypto.getRandomValues(array);
  return base64UrlEncode(array).slice(0, 128); // Trim to max 128 chars
};

/**
 * Generates a code challenge based on the code verifier
 * @param verifier The code verifier
 * @returns A Base64URL encoded string of the SHA-256 hash of the verifier
 */
export const generateCodeChallenge = async (verifier: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await window.crypto.subtle.digest('SHA-256', data);
  return base64UrlEncode(new Uint8Array(digest));
};

/**
 * Converts a byte array to a Base64URL encoded string
 * @param buffer The byte array to convert
 * @returns A Base64URL encoded string
 */
export const base64UrlEncode = (buffer: Uint8Array): string => {
  return btoa(String.fromCharCode.apply(null, [...buffer]))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
};

/**
 * Generates a random state parameter for CSRF protection
 * @returns A random string for use as state parameter
 */
export const generateState = (): string => {
  const array = new Uint8Array(32);
  window.crypto.getRandomValues(array);
  return base64UrlEncode(array);
};

/**
 * Validates that a state parameter matches the expected value
 * @param receivedState The state received in the callback
 * @param expectedState The state that was sent in the request
 * @returns True if the states match, false otherwise
 */
export const validateState = (receivedState: string, expectedState: string): boolean => {
  return receivedState === expectedState;
};
