// src/tests/lib/jwt/verify-signature.test.ts
import { describe, expect, test, beforeAll } from 'bun:test';
import { verifySignature } from '../../../lib/jwt/verify-signature';
import { 
  generateTestKeyPair,
  createTestJWT,
  createInvalidJWT,
  createExpiredJWT,
  createTestJWKS
} from '../../utils/jwt-test-helpers';

describe('JWT Signature Verification', () => {
  // Test data
  let keyPair: any;
  let validJwt: string;
  let invalidJwt: string;
  let expiredJwt: string;
  let jwks: any;
  let unrelatedJwks: any;

  // Standard test payload
  const testPayload = {
    sub: 'test-subject',
    name: 'Test User',
    email: 'test@example.com',
    roles: ['user'],
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600
  };

  // Generate test tokens before tests run
  beforeAll(async () => {
    // Generate key pair for testing
    keyPair = await generateTestKeyPair();
    
    // Create a valid JWT
    validJwt = await createTestJWT(testPayload, {}, keyPair.privateKey);
    
    // Create an invalid JWT (tampered signature)
    invalidJwt = createInvalidJWT(validJwt);
    
    // Create an expired JWT
    expiredJwt = await createExpiredJWT(testPayload, 3600, keyPair.privateKey);
    
    // Create JWKS with the public key
    jwks = {
      keys: [keyPair.publicKey]
    };
    
    // Create JWKS with unrelated keys
    unrelatedJwks = await createTestJWKS(2);
  });

  // Test with valid JWT and matching JWKS
  test('should verify a valid JWT signature with matching JWKS', async () => {
    const result = await verifySignature(validJwt, jwks);
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  // Test with invalid JWT signature
  test('should reject a JWT with invalid signature', async () => {
    const result = await verifySignature(invalidJwt, jwks);
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  // Test with missing JWKS
  test('should reject verification with missing JWKS', async () => {
    const result = await verifySignature(validJwt, null);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('No keys found in the JWKS data');
  });

  // Test with empty JWKS
  test('should reject verification with empty JWKS', async () => {
    const result = await verifySignature(validJwt, { keys: [] });
    expect(result.valid).toBe(false);
    expect(result.error).toBe('No keys found in the JWKS data');
  });

  // Test with JWKS that doesn't contain matching key ID
  test('should reject verification when key ID not found in JWKS', async () => {
    const result = await verifySignature(validJwt, unrelatedJwks);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('No key with ID');
  });

  // Test with malformed JWT
  test('should reject malformed JWT', async () => {
    const malformedJwt = 'invalid.jwt.format';
    const result = await verifySignature(malformedJwt, jwks);
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  // Test with JWT missing header kid
  test('should reject JWT with missing kid in header', async () => {
    // Create JWT without kid in header
    const jwtWithoutKid = await createTestJWT(
      testPayload,
      { kid: undefined as any }, // Force kid to be undefined
      keyPair.privateKey
    );
    
    const result = await verifySignature(jwtWithoutKid, jwks);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Token header does not contain a key ID (kid)');
  });

  // Test with unsupported algorithm
  test('should handle JWT with unsupported algorithm', async () => {
    // Create JWT with unsupported algorithm
    const jwtWithUnsupportedAlg = await createTestJWT(
      testPayload,
      { alg: 'HS256' }, // Unsupported algorithm
      keyPair.privateKey
    );
    
    const result = await verifySignature(jwtWithUnsupportedAlg, jwks);
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });
});
