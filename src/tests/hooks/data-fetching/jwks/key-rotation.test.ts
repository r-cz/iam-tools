// src/tests/hooks/data-fetching/jwks/key-rotation.test.ts
import { describe, expect, test, mock, beforeEach, afterEach } from 'bun:test';
import { renderHook, act } from '@testing-library/react';
import { useJwks } from '../../../../hooks/data-fetching/useJwks';
import { verifySignature } from '../../../../lib/jwt/verify-signature';
import { createTestJWT, generateTestKeyPair } from '../../../utils/jwt-test-helpers';

// Create a mock implementation of proxyFetch for controlled testing
const proxyFetchMock = mock(async (url: string) => {
  if (url.includes('error')) {
    return new Response(JSON.stringify({ error: 'Failed to fetch JWKS' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  if (url.includes('malformed')) {
    return new Response(JSON.stringify({ not_keys: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // Use the mock state to determine which JWKS to return
  const jwksData = proxyFetchMock.mock.state?.jwksData || { keys: [] };
  return new Response(JSON.stringify(jwksData), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
});

// Mock the proxyFetch module
mock.module('../../../../lib/proxy-fetch', () => ({
  proxyFetch: proxyFetchMock
}));

describe('JWKS Key Rotation', () => {
  // Store key pairs for testing
  let keyPair1: any;
  let keyPair2: any;
  let keyPair3: any;
  
  // Store token signed with keyPair1
  let token1: string;
  
  // Setup before tests
  beforeEach(async () => {
    // Generate 3 unique key pairs for rotation testing
    keyPair1 = await generateTestKeyPair();
    keyPair2 = await generateTestKeyPair();
    keyPair3 = await generateTestKeyPair();
    
    // Ensure each key has a unique kid
    keyPair1.publicKey.kid = 'key-id-1';
    keyPair2.publicKey.kid = 'key-id-2';
    keyPair3.publicKey.kid = 'key-id-3';
    keyPair1.privateKey.kid = 'key-id-1';
    keyPair2.privateKey.kid = 'key-id-2';
    keyPair3.privateKey.kid = 'key-id-3';
    
    // Create a token signed with keyPair1
    token1 = await createTestJWT(
      {
        sub: 'test-subject',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600
      },
      { kid: 'key-id-1' }, // Include key ID in header
      keyPair1.privateKey
    );
    
    // Set default JWKS with only the first key
    proxyFetchMock.mock.state = {
      jwksData: {
        keys: [keyPair1.publicKey]
      }
    };
  });
  
  // Test basic JWKS fetching
  test('should fetch and use JWKS for token verification', async () => {
    // Render the hook
    const { result } = renderHook(() => useJwks());
    
    // Fetch the JWKS
    await act(async () => {
      await result.current.fetchJwks('https://example.com/jwks');
    });
    
    // Verify the JWKS was loaded correctly
    expect(result.current.data).not.toBeNull();
    expect(result.current.data?.keys.length).toBe(1);
    expect(result.current.data?.keys[0].kid).toBe('key-id-1');
    
    // Verify a token using the fetched JWKS
    const verifyResult = await verifySignature(token1, result.current.data);
    expect(verifyResult.valid).toBe(true);
  });
  
  // Test key rotation scenario - token signed with old key but JWKS only has new keys
  test('should handle key rotation with key no longer in JWKS', async () => {
    // Set JWKS to only include the second key
    proxyFetchMock.mock.state = {
      jwksData: {
        keys: [keyPair2.publicKey]
      }
    };
    
    // Render the hook
    const { result } = renderHook(() => useJwks());
    
    // Fetch the JWKS
    await act(async () => {
      await result.current.fetchJwks('https://example.com/jwks');
    });
    
    // Verify the JWKS was loaded correctly
    expect(result.current.data).not.toBeNull();
    expect(result.current.data?.keys.length).toBe(1);
    expect(result.current.data?.keys[0].kid).toBe('key-id-2');
    
    // Try to verify a token signed with key1
    const verifyResult = await verifySignature(token1, result.current.data);
    
    // Verification should fail because the key is not in the JWKS
    expect(verifyResult.valid).toBe(false);
    expect(verifyResult.error).toContain('No key with ID');
  });
  
  // Test JWKS with multiple keys
  test('should handle JWKS with multiple keys', async () => {
    // Set JWKS to include multiple keys
    proxyFetchMock.mock.state = {
      jwksData: {
        keys: [
          keyPair1.publicKey,
          keyPair2.publicKey,
          keyPair3.publicKey
        ]
      }
    };
    
    // Render the hook
    const { result } = renderHook(() => useJwks());
    
    // Fetch the JWKS
    await act(async () => {
      await result.current.fetchJwks('https://example.com/jwks');
    });
    
    // Verify the JWKS was loaded correctly
    expect(result.current.data).not.toBeNull();
    expect(result.current.data?.keys.length).toBe(3);
    
    // Create a token with key2
    const token2 = await createTestJWT(
      {
        sub: 'test-subject-2',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600
      },
      { kid: 'key-id-2' },
      keyPair2.privateKey
    );
    
    // Verify tokens signed with different keys
    const verifyResult1 = await verifySignature(token1, result.current.data);
    const verifyResult2 = await verifySignature(token2, result.current.data);
    
    expect(verifyResult1.valid).toBe(true);
    expect(verifyResult2.valid).toBe(true);
  });
  
  // Test scenario where JWKS updates with rotated keys
  test('should handle JWKS updates with key rotation', async () => {
    // Start with just keyPair1
    proxyFetchMock.mock.state = {
      jwksData: {
        keys: [keyPair1.publicKey]
      }
    };
    
    // Render the hook
    const { result } = renderHook(() => useJwks());
    
    // Fetch the JWKS
    await act(async () => {
      await result.current.fetchJwks('https://example.com/jwks');
    });
    
    // Verify token1 works
    const initialVerifyResult = await verifySignature(token1, result.current.data);
    expect(initialVerifyResult.valid).toBe(true);
    
    // Rotate keys - add keyPair2 and remove keyPair1
    proxyFetchMock.mock.state = {
      jwksData: {
        keys: [keyPair2.publicKey]
      }
    };
    
    // Fetch the updated JWKS
    await act(async () => {
      await result.current.fetchJwks('https://example.com/jwks');
    });
    
    // Verify the JWKS was updated correctly
    expect(result.current.data?.keys.length).toBe(1);
    expect(result.current.data?.keys[0].kid).toBe('key-id-2');
    
    // token1 should no longer validate
    const afterRotationResult = await verifySignature(token1, result.current.data);
    expect(afterRotationResult.valid).toBe(false);
    
    // But a token signed with keyPair2 should work
    const token2 = await createTestJWT(
      {
        sub: 'test-subject-2',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600
      },
      { kid: 'key-id-2' },
      keyPair2.privateKey
    );
    
    const token2VerifyResult = await verifySignature(token2, result.current.data);
    expect(token2VerifyResult.valid).toBe(true);
  });
  
  // Test overlapping key rotation period (both old and new keys present)
  test('should handle overlapping key rotation period', async () => {
    // Set JWKS to include both keys during rotation period
    proxyFetchMock.mock.state = {
      jwksData: {
        keys: [
          { ...keyPair1.publicKey, use: 'sig' }, // Mark as "signing" key
          { ...keyPair2.publicKey, use: 'sig' }  // New key also for signing
        ]
      }
    };
    
    // Render the hook
    const { result } = renderHook(() => useJwks());
    
    // Fetch the JWKS
    await act(async () => {
      await result.current.fetchJwks('https://example.com/jwks');
    });
    
    // Verify the JWKS was loaded correctly
    expect(result.current.data).not.toBeNull();
    expect(result.current.data?.keys.length).toBe(2);
    
    // Create a new token with key2
    const token2 = await createTestJWT(
      {
        sub: 'test-subject-2',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600
      },
      { kid: 'key-id-2' },
      keyPair2.privateKey
    );
    
    // Both tokens should validate during overlap period
    const verifyResult1 = await verifySignature(token1, result.current.data);
    const verifyResult2 = await verifySignature(token2, result.current.data);
    
    expect(verifyResult1.valid).toBe(true);
    expect(verifyResult2.valid).toBe(true);
  });
  
  // Test JWKS error handling
  test('should handle JWKS fetch errors', async () => {
    // Render the hook
    const { result } = renderHook(() => useJwks());
    
    // Fetch with an error URL
    await act(async () => {
      await result.current.fetchJwks('https://example.com/error');
    });
    
    // Verify error state
    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeNull();
    expect(result.current.error).not.toBeNull();
  });
  
  // Test malformed JWKS data
  test('should handle malformed JWKS data', async () => {
    // Render the hook
    const { result } = renderHook(() => useJwks());
    
    // Fetch malformed JWKS
    await act(async () => {
      await result.current.fetchJwks('https://example.com/malformed');
    });
    
    // Verify error state
    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeNull();
    expect(result.current.error).not.toBeNull();
    expect(result.current.error?.message).toContain('Invalid JWKS format');
  });
  
  // Test token with unknown kid
  test('should handle token with unknown kid', async () => {
    // Set JWKS with a different key
    proxyFetchMock.mock.state = {
      jwksData: {
        keys: [keyPair2.publicKey]
      }
    };
    
    // Create a token with an unknown kid
    const tokenWithUnknownKid = await createTestJWT(
      {
        sub: 'test-subject',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600
      },
      { kid: 'unknown-key-id' },
      keyPair1.privateKey
    );
    
    // Render the hook
    const { result } = renderHook(() => useJwks());
    
    // Fetch the JWKS
    await act(async () => {
      await result.current.fetchJwks('https://example.com/jwks');
    });
    
    // Verify token with unknown kid
    const verifyResult = await verifySignature(tokenWithUnknownKid, result.current.data);
    expect(verifyResult.valid).toBe(false);
    expect(verifyResult.error).toContain('No key with ID "unknown-key-id"');
  });
});
