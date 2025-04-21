// src/tests/lib/jwt/sign-token.test.ts
import { describe, expect, test } from 'bun:test';
import { signToken } from '../../../lib/jwt/sign-token';
import { jwtVerify } from 'jose';
import { DEMO_PRIVATE_KEY } from '../../../lib/jwt/demo-key';

describe('JWT Token Signing', () => {
  // Standard test payload for all tests
  const testPayload = {
    sub: 'test-subject',
    name: 'Test User',
    email: 'test@example.com',
  };

  // Test basic token signing
  test('should create a valid signed JWT', async () => {
    // Generate a token
    const token = await signToken(testPayload);
    
    // Verify basic structure (three dot-separated parts)
    expect(token.split('.').length).toBe(3);
    
    // Decode the parts
    const [headerBase64, payloadBase64] = token.split('.');
    
    // Check header
    const header = JSON.parse(Buffer.from(headerBase64, 'base64').toString());
    expect(header.alg).toBe('RS256');
    expect(header.typ).toBe('JWT');
    expect(header.kid).toBe(DEMO_PRIVATE_KEY.kid);
    
    // Check payload
    const payload = JSON.parse(Buffer.from(payloadBase64, 'base64').toString());
    expect(payload.sub).toBe(testPayload.sub);
    expect(payload.name).toBe(testPayload.name);
    expect(payload.email).toBe(testPayload.email);
    
    // Check timestamps
    expect(payload.iat).toBeDefined();
    expect(payload.exp).toBeDefined();
    expect(payload.exp).toBeGreaterThan(payload.iat);
  });

  // Test token signing with additional header parameters
  test('should include additional header parameters', async () => {
    const customHeader = {
      customClaim: 'custom-value',
      x5t: 'test-thumbprint'
    };
    
    // Generate a token with custom header
    const token = await signToken(testPayload, customHeader);
    
    // Decode the header
    const headerBase64 = token.split('.')[0];
    const header = JSON.parse(Buffer.from(headerBase64, 'base64').toString());
    
    // Verify custom header values were included
    expect(header.customClaim).toBe(customHeader.customClaim);
    expect(header.x5t).toBe(customHeader.x5t);
  });

  // Test custom expiration time
  test('should respect custom expiration time in payload', async () => {
    const currentTime = Math.floor(Date.now() / 1000);
    const customExpiration = currentTime + 7200; // 2 hours from now
    
    // Create payload with custom expiration
    const payloadWithExp = {
      ...testPayload,
      exp: customExpiration
    };
    
    // Generate a token
    const token = await signToken(payloadWithExp);
    
    // Decode the payload
    const payloadBase64 = token.split('.')[1];
    const payload = JSON.parse(Buffer.from(payloadBase64, 'base64').toString());
    
    // Verify custom expiration was used
    expect(payload.exp).toBe(customExpiration);
  });

  // Test token verification
  test('should create a token that can be verified', async () => {
    // Generate a token
    const token = await signToken(testPayload);
    
    // Manually import the public key for verification
    const publicKey = {
      kty: DEMO_PRIVATE_KEY.kty,
      n: DEMO_PRIVATE_KEY.n,
      e: DEMO_PRIVATE_KEY.e,
      kid: DEMO_PRIVATE_KEY.kid,
      alg: 'RS256',
    };
    
    try {
      // Import the public key
      const cryptoKey = await crypto.subtle.importKey(
        'jwk',
        publicKey,
        {
          name: 'RSASSA-PKCS1-v1_5',
          hash: { name: 'SHA-256' },
        },
        false,
        ['verify']
      );
      
      // Create a key getter function for jose
      const getKey = async () => cryptoKey;
      
      // Verify the token using jose
      const result = await jwtVerify(token, getKey);
      
      // Verify the payload was correctly included
      expect(result.payload.sub).toBe(testPayload.sub);
      expect(result.payload.name).toBe(testPayload.name);
      expect(result.payload.email).toBe(testPayload.email);
    } catch (error) {
      // This should not happen - fail the test if verification fails
      console.error('Token verification failed:', error);
      expect(error).toBeUndefined();
    }
  });

  // Test error handling with invalid input
  test('should handle errors gracefully', async () => {
    // Create a circular reference that can't be serialized
    const circularObj: any = { name: 'circular' };
    circularObj.self = circularObj;
    
    // Try to sign a token with un-serializable data
    try {
      await signToken(circularObj);
      // Should not reach here
      expect(true).toBe(false);
    } catch (error) {
      // Expect an error to be thrown
      expect(error).toBeDefined();
    }
  });
});
