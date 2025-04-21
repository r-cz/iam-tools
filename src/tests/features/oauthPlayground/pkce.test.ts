// src/tests/features/oauthPlayground/pkce.test.ts
import { describe, expect, test } from 'bun:test';
import { 
  generateCodeVerifier, 
  generateCodeChallenge, 
  base64UrlEncode,
  generateState,
  validateState
} from '../../../features/oauthPlayground/utils/pkce';

describe('PKCE Implementation', () => {
  // Test code verifier generation
  test('should generate valid code verifier', () => {
    const verifier = generateCodeVerifier();
    
    // Length should be between 43 and 128 characters
    expect(verifier.length).toBeGreaterThanOrEqual(43);
    expect(verifier.length).toBeLessThanOrEqual(128);
    
    // Should contain only allowed characters (A-Z, a-z, 0-9, -, _, ., ~)
    expect(verifier).toMatch(/^[A-Za-z0-9\-_\.~]+$/);
  });

  // Test code challenge generation
  test('should generate valid code challenge from verifier', async () => {
    const verifier = generateCodeVerifier();
    const challenge = await generateCodeChallenge(verifier);
    
    // Challenge should be non-empty
    expect(challenge).toBeDefined();
    expect(challenge.length).toBeGreaterThan(0);
    
    // Should contain only allowed characters (A-Z, a-z, 0-9, -, _, ., ~)
    expect(challenge).toMatch(/^[A-Za-z0-9\-_\.~]+$/);
    
    // Challenge should be base64url encoded
    expect(challenge).not.toContain('+');
    expect(challenge).not.toContain('/');
    expect(challenge).not.toMatch(/=+$/);
  });

  // Test deterministic challenge generation
  test('should generate consistent challenge from same verifier', async () => {
    const verifier = 'test-verifier-string';
    
    // Generate challenge twice from same verifier
    const challenge1 = await generateCodeChallenge(verifier);
    const challenge2 = await generateCodeChallenge(verifier);
    
    // Challenges should be identical
    expect(challenge1).toBe(challenge2);
  });

  // Test state generation
  test('should generate valid state parameter', () => {
    const state = generateState();
    
    // State should be non-empty
    expect(state).toBeDefined();
    expect(state.length).toBeGreaterThan(0);
    
    // Should contain only allowed characters (A-Z, a-z, 0-9, -, _, ., ~)
    expect(state).toMatch(/^[A-Za-z0-9\-_\.~]+$/);
  });

  // Test state validation
  test('should validate matching states', () => {
    const state = 'test-state-value';
    
    // Validate matching states
    expect(validateState(state, state)).toBe(true);
    
    // Validate non-matching states
    expect(validateState(state, 'different-value')).toBe(false);
    expect(validateState('', state)).toBe(false);
    expect(validateState(state, '')).toBe(false);
  });

  // Test base64UrlEncode function
  test('should correctly encode data as base64url', () => {
    // Test with a known array
    const testArray = Uint8Array.from([84, 101, 115, 116, 32, 100, 97, 116, 97]); // "Test data"
    const encoded = base64UrlEncode(testArray);
    
    // Should be correctly encoded
    expect(encoded).toBe('VGVzdCBkYXRh');
    
    // Should be URL-safe (no +, /, or trailing =)
    expect(encoded).not.toContain('+');
    expect(encoded).not.toContain('/');
    expect(encoded).not.toMatch(/=+$/);
  });

  // Test special cases for base64url encoding
  test('should handle special cases in base64url encoding', () => {
    // Test case for + to - substitution
    const arrayWithPlus = Uint8Array.from([251, 239]);
    const encoded1 = base64UrlEncode(arrayWithPlus);
    expect(encoded1).not.toContain('+');
    expect(encoded1).toContain('-');
    
    // Test case for / to _ substitution
    const arrayWithSlash = Uint8Array.from([255, 207]);
    const encoded2 = base64UrlEncode(arrayWithSlash);
    expect(encoded2).not.toContain('/');
    expect(encoded2).toContain('_');
    
    // Test removal of padding
    const arrayWithPadding = Uint8Array.from([65]); // Just "A" which needs padding
    const encoded3 = base64UrlEncode(arrayWithPadding);
    expect(encoded3).not.toMatch(/=+$/);
    expect(encoded3).toBe('QQ');
  });

  // Integration test - verify that a challenge can be derived from a verifier
  test('should successfully create and validate challenge from verifier', async () => {
    // Generate a verifier
    const verifier = generateCodeVerifier();
    
    // Generate a challenge from the verifier
    const challenge = await generateCodeChallenge(verifier);
    
    // Manually create a challenge using the same algorithm
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const digest = await window.crypto.subtle.digest('SHA-256', data);
    const manualChallenge = base64UrlEncode(new Uint8Array(digest));
    
    // Challenges should match
    expect(challenge).toBe(manualChallenge);
  });
});
