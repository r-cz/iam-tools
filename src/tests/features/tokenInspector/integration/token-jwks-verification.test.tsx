// src/tests/features/tokenInspector/integration/token-jwks-verification.test.tsx
import { describe, expect, test, mock, beforeEach, afterEach } from 'bun:test';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { TokenJwksResolver } from '../../../../features/tokenInspector/components/TokenJwksResolver';
import { createTestJWT, generateTestKeyPair } from '../../../utils/jwt-test-helpers';

// Mock the proxyFetch function for controlled testing
const proxyFetchMock = mock(async (url: string) => {
  // Access the mock state to get JWKS data for the test
  const jwksData = proxyFetchMock.mock.state?.jwksData || { keys: [] };
  
  if (url.includes('error')) {
    return new Response(JSON.stringify({ error: 'JWKS fetch error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  return new Response(JSON.stringify(jwksData), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
});

// Mock the proxyFetch module
mock.module('../../../../lib/proxy-fetch', () => ({
  proxyFetch: proxyFetchMock
}));

describe('Token JWKS Verification Integration', () => {
  // Store test data
  let keyPair1: any;
  let keyPair2: any;
  let token1: string;
  let token2: string;
  let invalidToken: string;
  
  // Setup before tests
  beforeEach(async () => {
    // Generate key pairs
    keyPair1 = await generateTestKeyPair();
    keyPair2 = await generateTestKeyPair();
    
    // Set distinct key IDs
    keyPair1.publicKey.kid = 'key-id-1';
    keyPair1.privateKey.kid = 'key-id-1';
    keyPair2.publicKey.kid = 'key-id-2';
    keyPair2.privateKey.kid = 'key-id-2';
    
    // Create tokens with each key
    const payload = {
      iss: 'https://example.com',
      sub: 'test-subject',
      aud: 'test-client',
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000)
    };
    
    token1 = await createTestJWT(
      payload,
      { kid: keyPair1.privateKey.kid, alg: 'RS256' },
      keyPair1.privateKey
    );
    
    token2 = await createTestJWT(
      payload,
      { kid: keyPair2.privateKey.kid, alg: 'RS256' },
      keyPair2.privateKey
    );
    
    // Create an invalid token (signature won't match)
    const tokenParts = token1.split('.');
    invalidToken = `${tokenParts[0]}.${tokenParts[1]}.invalidSignature`;
    
    // Default JWKS contains only key1
    proxyFetchMock.mock.state = {
      jwksData: {
        keys: [keyPair1.publicKey]
      }
    };
  });
  
  // Test successful verification
  test('should verify token signature with matching JWKS key', async () => {
    // Render the component
    render(
      <MemoryRouter>
        <TokenJwksResolver token={token1} tokenHeader={{ kid: 'key-id-1', alg: 'RS256' }} />
      </MemoryRouter>
    );
    
    // Enter the JWKS URL
    const jwksInput = screen.getByLabelText(/JWKS URL/i);
    await userEvent.type(jwksInput, 'https://example.com/jwks');
    
    // Click verify button
    const verifyButton = screen.getByRole('button', { name: /Verify Signature/i });
    await userEvent.click(verifyButton);
    
    // Wait for verification result
    await waitFor(() => {
      expect(screen.getByText(/Signature is valid/i)).toBeInTheDocument();
    });
  });
  
  // Test verification with invalid signature
  test('should detect invalid token signature', async () => {
    // Render the component
    render(
      <MemoryRouter>
        <TokenJwksResolver token={invalidToken} tokenHeader={{ kid: 'key-id-1', alg: 'RS256' }} />
      </MemoryRouter>
    );
    
    // Enter the JWKS URL
    const jwksInput = screen.getByLabelText(/JWKS URL/i);
    await userEvent.type(jwksInput, 'https://example.com/jwks');
    
    // Click verify button
    const verifyButton = screen.getByRole('button', { name: /Verify Signature/i });
    await userEvent.click(verifyButton);
    
    // Wait for verification result
    await waitFor(() => {
      expect(screen.getByText(/Signature is invalid/i)).toBeInTheDocument();
    });
  });
  
  // Test key rotation scenario
  test('should handle key rotation scenarios', async () => {
    // Render the component with token1
    const { rerender } = render(
      <MemoryRouter>
        <TokenJwksResolver token={token1} tokenHeader={{ kid: 'key-id-1', alg: 'RS256' }} />
      </MemoryRouter>
    );
    
    // Verify with original JWKS containing key1
    const jwksInput = screen.getByLabelText(/JWKS URL/i);
    await userEvent.type(jwksInput, 'https://example.com/jwks');
    
    const verifyButton = screen.getByRole('button', { name: /Verify Signature/i });
    await userEvent.click(verifyButton);
    
    // Should verify successfully
    await waitFor(() => {
      expect(screen.getByText(/Signature is valid/i)).toBeInTheDocument();
    });
    
    // Now rotate the keys - update JWKS to contain only key2
    proxyFetchMock.mock.state = {
      jwksData: {
        keys: [keyPair2.publicKey]
      }
    };
    
    // Clear input and try again
    await userEvent.clear(jwksInput);
    await userEvent.type(jwksInput, 'https://example.com/jwks');
    await userEvent.click(verifyButton);
    
    // Should fail as key1 is no longer in the JWKS
    await waitFor(() => {
      expect(screen.getByText(/Signature is invalid/i)).toBeInTheDocument();
      expect(screen.getByText(/No key with ID/i)).toBeInTheDocument();
    });
    
    // Rerender with token2 which should work with new JWKS
    rerender(
      <MemoryRouter>
        <TokenJwksResolver token={token2} tokenHeader={{ kid: 'key-id-2', alg: 'RS256' }} />
      </MemoryRouter>
    );
    
    await userEvent.clear(jwksInput);
    await userEvent.type(jwksInput, 'https://example.com/jwks');
    await userEvent.click(verifyButton);
    
    // Should verify successfully with the new key
    await waitFor(() => {
      expect(screen.getByText(/Signature is valid/i)).toBeInTheDocument();
    });
  });
  
  // Test multiple keys in JWKS
  test('should handle JWKS with multiple keys', async () => {
    // Set JWKS to contain both keys
    proxyFetchMock.mock.state = {
      jwksData: {
        keys: [keyPair1.publicKey, keyPair2.publicKey]
      }
    };
    
    // Render with token1
    const { rerender } = render(
      <MemoryRouter>
        <TokenJwksResolver token={token1} tokenHeader={{ kid: 'key-id-1', alg: 'RS256' }} />
      </MemoryRouter>
    );
    
    // Verify signature
    const jwksInput = screen.getByLabelText(/JWKS URL/i);
    await userEvent.type(jwksInput, 'https://example.com/jwks');
    
    const verifyButton = screen.getByRole('button', { name: /Verify Signature/i });
    await userEvent.click(verifyButton);
    
    // Should verify successfully
    await waitFor(() => {
      expect(screen.getByText(/Signature is valid/i)).toBeInTheDocument();
    });
    
    // Now try with token2
    rerender(
      <MemoryRouter>
        <TokenJwksResolver token={token2} tokenHeader={{ kid: 'key-id-2', alg: 'RS256' }} />
      </MemoryRouter>
    );
    
    await userEvent.clear(jwksInput);
    await userEvent.type(jwksInput, 'https://example.com/jwks');
    await userEvent.click(verifyButton);
    
    // Should also verify successfully
    await waitFor(() => {
      expect(screen.getByText(/Signature is valid/i)).toBeInTheDocument();
    });
  });
  
  // Test JWKS fetch error handling
  test('should handle JWKS fetch errors', async () => {
    // Render the component
    render(
      <MemoryRouter>
        <TokenJwksResolver token={token1} tokenHeader={{ kid: 'key-id-1', alg: 'RS256' }} />
      </MemoryRouter>
    );
    
    // Enter erroneous JWKS URL
    const jwksInput = screen.getByLabelText(/JWKS URL/i);
    await userEvent.type(jwksInput, 'https://example.com/error');
    
    // Click verify button
    const verifyButton = screen.getByRole('button', { name: /Verify Signature/i });
    await userEvent.click(verifyButton);
    
    // Should show error
    await waitFor(() => {
      expect(screen.getByText(/Error fetching JWKS/i)).toBeInTheDocument();
    });
  });
  
  // Test token without kid header
  test('should handle token without kid in header', async () => {
    // Create a token without kid
    const tokenWithoutKid = await createTestJWT(
      {
        iss: 'https://example.com',
        sub: 'test-subject',
        exp: Math.floor(Date.now() / 1000) + 3600
      },
      { alg: 'RS256', kid: undefined as any }, // No kid
      keyPair1.privateKey
    );
    
    // Render the component
    render(
      <MemoryRouter>
        <TokenJwksResolver token={tokenWithoutKid} tokenHeader={{ alg: 'RS256' }} />
      </MemoryRouter>
    );
    
    // Enter JWKS URL
    const jwksInput = screen.getByLabelText(/JWKS URL/i);
    await userEvent.type(jwksInput, 'https://example.com/jwks');
    
    // Click verify button
    const verifyButton = screen.getByRole('button', { name: /Verify Signature/i });
    await userEvent.click(verifyButton);
    
    // Should show error about missing kid
    await waitFor(() => {
      expect(screen.getByText(/Token header does not contain a key ID/i)).toBeInTheDocument();
    });
  });
  
  // Test auto-discovery of JWKS URL from issuer claim
  test('should support auto-discovery of JWKS URL from issuer', async () => {
    // Set up additional JWKS for the well-known endpoint
    proxyFetchMock.mock.implementation(async (url: string) => {
      if (url.includes('.well-known/openid-configuration')) {
        return new Response(JSON.stringify({
          issuer: 'https://example.com',
          jwks_uri: 'https://example.com/jwks'
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // For the actual JWKS URL
      if (url.includes('/jwks')) {
        return new Response(JSON.stringify({
          keys: [keyPair1.publicKey]
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      return new Response(null, { status: 404 });
    });
    
    // Create a token with issuer claim
    const tokenWithIssuer = await createTestJWT(
      {
        iss: 'https://example.com',
        sub: 'test-subject',
        exp: Math.floor(Date.now() / 1000) + 3600
      },
      { kid: 'key-id-1', alg: 'RS256' },
      keyPair1.privateKey
    );
    
    // Render the component
    render(
      <MemoryRouter>
        <TokenJwksResolver 
          token={tokenWithIssuer} 
          tokenHeader={{ kid: 'key-id-1', alg: 'RS256' }}
          tokenPayload={{ iss: 'https://example.com' }} 
        />
      </MemoryRouter>
    );
    
    // Click the auto-discover button instead of typing URL
    const discoverButton = screen.getByRole('button', { name: /Auto-discover/i });
    await userEvent.click(discoverButton);
    
    // Then click verify
    const verifyButton = screen.getByRole('button', { name: /Verify Signature/i });
    await userEvent.click(verifyButton);
    
    // Should verify successfully
    await waitFor(() => {
      expect(screen.getByText(/Signature is valid/i)).toBeInTheDocument();
    });
  });
});
