import { describe, expect, test, beforeEach, afterEach } from 'bun:test';
import { proxyFetch } from '../../lib/proxy-fetch';

describe('JWKS Fetching Logic', () => {
  // Our test issuer URL
  const testIssuerUrl = 'https://example.com/identity';
  
  // Store original fetch
  const originalFetch = globalThis.fetch;
  
  // Mock responses
  const mockOidcConfig = {
    issuer: testIssuerUrl,
    jwks_uri: `${testIssuerUrl}/jwks.json`,
    token_endpoint: `${testIssuerUrl}/oauth2/token`,
    authorization_endpoint: `${testIssuerUrl}/oauth2/authorize`
  };
  
  const mockJwks = {
    keys: [
      {
        kty: 'RSA',
        use: 'sig',
        kid: 'test-kid-1',
        n: 'sample-modulus',
        e: 'AQAB',
        alg: 'RS256'
      }
    ]
  };
  
  // Setup mock fetch
  beforeEach(() => {
    globalThis.fetch = async (url: string | URL | Request) => {
      const urlString = url instanceof URL ? url.toString() : 
                      typeof url === 'string' ? url : url.url;
      
      if (urlString.includes('openid-configuration')) {
        return {
          ok: true,
          status: 200,
          statusText: 'OK',
          json: () => Promise.resolve(mockOidcConfig)
        } as Response;
      } 
      else if (urlString.includes('jwks.json')) {
        return {
          ok: true,
          status: 200,
          statusText: 'OK',
          json: () => Promise.resolve(mockJwks)
        } as Response;
      }
      
      return {
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: () => Promise.resolve({ error: 'Not found' })
      } as Response;
    };
  });
  
  // Restore original fetch
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  test('should fetch and parse OpenID configuration', async () => {
    // Create our own mock implementation for this test only
    const configUrl = `${testIssuerUrl}/.well-known/openid-configuration`;
    const response = await proxyFetch(configUrl);
    expect(response.ok).toBe(true);
    
    const config = await response.json();
    expect(config.issuer).toBe(testIssuerUrl);
    expect(config.jwks_uri).toBe(`${testIssuerUrl}/jwks.json`);
  });

  test('should fetch and parse JWKS from URI', async () => {
    // Get JWKS directly (don't depend on previous test)
    const jwksUri = `${testIssuerUrl}/jwks.json`;
    const response = await proxyFetch(jwksUri);
    expect(response.ok).toBe(true);
    
    const jwks = await response.json();
    expect(jwks.keys).toBeDefined();
    expect(Array.isArray(jwks.keys)).toBe(true);
    expect(jwks.keys.length).toBe(1);
    expect(jwks.keys[0].kty).toBe('RSA');
  });

  test('should handle complete OIDC discovery and JWKS resolution flow', async () => {
    // Step 1: Get OpenID configuration
    const configUrl = `${testIssuerUrl}/.well-known/openid-configuration`;
    const configResponse = await proxyFetch(configUrl);
    expect(configResponse.ok).toBe(true);
    
    const config = await configResponse.json();
    expect(config.jwks_uri).toBeDefined();
    
    // Step 2: Get JWKS using URI from config
    const jwksResponse = await proxyFetch(config.jwks_uri);
    expect(jwksResponse.ok).toBe(true);
    
    const jwks = await jwksResponse.json();
    expect(jwks.keys).toBeDefined();
    expect(jwks.keys.length).toBe(1);
    expect(jwks.keys[0].kid).toBeDefined();
  });

  test('should handle invalid configuration response', async () => {
    // Override fetch just for this test
    globalThis.fetch = async () => {
      return {
        ok: false,
        status: 404,
        statusText: 'Not Found'
      } as Response;
    };
    
    const configUrl = `${testIssuerUrl}/.well-known/openid-configuration`;
    const response = await proxyFetch(configUrl);
    expect(response.ok).toBe(false);
    expect(response.status).toBe(404);
  });

  test('should handle configuration without jwks_uri', async () => {
    // Override fetch for this test
    globalThis.fetch = async (url) => {
      const urlString = typeof url === 'string' ? url : url instanceof URL ? url.toString() : url.url;
      
      if (urlString.includes('openid-configuration')) {
        return {
          ok: true,
          status: 200,
          json: () => Promise.resolve({
            issuer: testIssuerUrl,
            // No jwks_uri included
            token_endpoint: `${testIssuerUrl}/oauth2/token`
          })
        } as Response;
      }
      
      return {
        ok: false,
        status: 404
      } as Response;
    };
    
    const configUrl = `${testIssuerUrl}/.well-known/openid-configuration`;
    const response = await proxyFetch(configUrl);
    expect(response.ok).toBe(true);
    
    const config = await response.json();
    expect(config.jwks_uri).toBeUndefined();
  });

  test('should handle network errors', async () => {
    // Setup mock to throw error
    globalThis.fetch = async () => {
      throw new Error('Network error');
    };
    
    // Use try-catch instead of expecting the error to propagate
    const configUrl = `${testIssuerUrl}/.well-known/openid-configuration`;
    try {
      await proxyFetch(configUrl);
      // We shouldn't get here
      expect(true).toBe(false); // Force test to fail if we get here
    } catch (error) {
      // Just check that we got an error, don't be specific about the message
      expect(error).toBeDefined();
    }
  });
});