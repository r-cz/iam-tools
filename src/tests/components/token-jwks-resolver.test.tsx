import { describe, expect, test } from 'bun:test';
import React from 'react';

describe('JWKS Resolver Logic', () => {
  // Simple mock of the proxyFetch function for testing
  const mockProxyFetch = (url: string) => {
    if (url.includes('openid-configuration')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          issuer: 'https://login.my.chick-fil-a.com',
          jwks_uri: 'https://login.my.chick-fil-a.com/.well-known/jwks.json',
          token_endpoint: 'https://login.my.chick-fil-a.com/oauth2/token',
          authorization_endpoint: 'https://login.my.chick-fil-a.com/oauth2/authorize'
        })
      });
    } else if (url.includes('jwks.json')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
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
        })
      });
    }
    return Promise.resolve({
      ok: false,
      status: 404,
      statusText: 'Not Found'
    });
  };
  
  // Test function to simulate the resolver logic
  async function resolveJwks(issuerUrl: string, customMock?: typeof mockProxyFetch): Promise<any> {
    const fetchImpl = customMock || mockProxyFetch;
    
    try {
      // Normalize issuer URL
      const normalizedIssuerUrl = issuerUrl.endsWith("/") 
        ? issuerUrl 
        : `${issuerUrl}/`;
        
      // First, try to fetch the OpenID Configuration
      const configUrl = `${normalizedIssuerUrl}.well-known/openid-configuration`;
      
      const configResponse = await fetchImpl(configUrl);
      if (!configResponse.ok) {
        throw new Error(`Failed to fetch OpenID configuration: ${configResponse.status}`);
      }
      
      const config = await configResponse.json();
      
      if (!config.jwks_uri) {
        throw new Error("No JWKS URI found in OpenID configuration");
      }
      
      // Then, fetch the JWKS using the jwks_uri
      const jwksResponse = await fetchImpl(config.jwks_uri);
      
      if (!jwksResponse.ok) {
        throw new Error(`Failed to fetch JWKS: ${jwksResponse.status}`);
      }
      
      const jwks = await jwksResponse.json();
      
      if (!jwks.keys || !Array.isArray(jwks.keys)) {
        throw new Error("Invalid JWKS format: missing 'keys' array");
      }
      
      return jwks;
    } catch (err: any) {
      throw new Error(err.message || "Unknown error");
    }
  }

  test('should successfully fetch JWKS from Chick-fil-A issuer URL', async () => {
    // Keep track of URLs that were fetched
    const fetchedUrls: string[] = [];
    const customMock = (url: string) => {
      fetchedUrls.push(url);
      return mockProxyFetch(url);
    };
    
    const issuerUrl = 'https://login.my.chick-fil-a.com';
    const jwks = await resolveJwks(issuerUrl, customMock);
    
    // Verify the JWKS structure
    expect(jwks.keys).toBeDefined();
    expect(jwks.keys.length).toBe(1);
    expect(jwks.keys[0].kty).toBe('RSA');
    expect(jwks.keys[0].kid).toBe('test-kid-1');
    
    // Verify that proxyFetch was called correctly
    expect(fetchedUrls.length).toBe(2);
    expect(fetchedUrls[0]).toBe(`${issuerUrl}/.well-known/openid-configuration`);
    expect(fetchedUrls[1]).toBe(`${issuerUrl}/.well-known/jwks.json`);
  });

  test('should handle issuer URLs with trailing slash', async () => {
    // Keep track of URLs that were fetched
    const fetchedUrls: string[] = [];
    const customMock = (url: string) => {
      fetchedUrls.push(url);
      return mockProxyFetch(url);
    };
    
    const issuerUrl = 'https://login.my.chick-fil-a.com/';
    await resolveJwks(issuerUrl, customMock);
    
    // Verify URL normalization
    expect(fetchedUrls.length).toBe(2);
    expect(fetchedUrls[0]).toBe(`${issuerUrl}.well-known/openid-configuration`);
  });

  test('should handle error when JWKS URI is missing', async () => {
    // Custom mock that returns a response without jwks_uri
    const customMock = (url: string) => {
      if (url.includes('openid-configuration')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            issuer: 'https://login.my.chick-fil-a.com',
            // No jwks_uri
            token_endpoint: 'https://login.my.chick-fil-a.com/oauth2/token'
          })
        });
      }
      return Promise.resolve({ ok: false, status: 404 });
    };
    
    try {
      await resolveJwks('https://login.my.chick-fil-a.com', customMock);
      // Should not reach here
      expect(true).toBe(false);
    } catch (error) {
      expect(error.message).toContain('No JWKS URI found');
    }
  });

  test('should handle network errors when fetching OpenID configuration', async () => {
    // Custom mock that simulates a network error
    const customMock = () => {
      return Promise.resolve({
        ok: false,
        status: 404
      });
    };
    
    try {
      await resolveJwks('https://login.my.chick-fil-a.com', customMock);
      // Should not reach here
      expect(true).toBe(false);
    } catch (error) {
      expect(error.message).toContain('Failed to fetch OpenID configuration');
    }
  });

  test('should handle network errors when fetching JWKS', async () => {
    // Custom mock - first call OK, second fails
    let callCount = 0;
    const customMock = () => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            jwks_uri: 'https://login.my.chick-fil-a.com/.well-known/jwks.json'
          })
        });
      } else {
        return Promise.resolve({
          ok: false,
          status: 403
        });
      }
    };
    
    try {
      await resolveJwks('https://login.my.chick-fil-a.com', customMock);
      // Should not reach here
      expect(true).toBe(false);
    } catch (error) {
      expect(error.message).toContain('Failed to fetch JWKS');
    }
  });

  test('should handle invalid JWKS format', async () => {
    // Custom mock - first call OK, second returns invalid format
    let callCount = 0;
    const customMock = () => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            jwks_uri: 'https://secure.southwest.com/.well-known/jwks.json'
          })
        });
      } else {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            notKeys: [] // Invalid format
          })
        });
      }
    };
    
    try {
      await resolveJwks('https://login.my.chick-fil-a.com', customMock);
      // Should not reach here
      expect(true).toBe(false);
    } catch (error) {
      expect(error.message).toContain('Invalid JWKS format');
    }
  });
});
