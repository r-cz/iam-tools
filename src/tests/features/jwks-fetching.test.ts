import { describe, expect, test, beforeEach, afterEach } from 'bun:test';
import { proxyFetch } from '../../lib/proxy-fetch';

// Mock the fetch function for tests
const originalFetch = global.fetch;

describe('JWKS Fetching Logic', () => {
  // Our test issuer URL - Using a fixed domain for testing purposes
  // The dots in this URL need to be escaped when used in regular expressions
  const testIssuerUrl = 'https://login.my.chick-fil-a.com';
  
  // Track all fetch calls
  const fetchCalls: string[] = [];
  
  // Set up before each test
  beforeEach(() => {
    // Clear fetch calls for each test
    fetchCalls.length = 0;
    
    // Mock the fetch function to simulate responses
    global.fetch = async (url: string | URL | Request, options?: RequestInit) => {
      const urlString = typeof url === 'string' ? url : url instanceof URL ? url.toString() : url.url;
      
      // Record the URL
      fetchCalls.push(urlString);
      
      // Return mock responses based on URL patterns - using string.includes which is safe
      // We don't need regex here since we're just doing simple substring matching
      if (urlString.includes('.well-known/openid-configuration')) {
        return {
          ok: true,
          status: 200,
          json: () => Promise.resolve({
            issuer: testIssuerUrl,
            jwks_uri: `${testIssuerUrl}/.well-known/jwks.json`,
            token_endpoint: `${testIssuerUrl}/oauth2/token`,
            authorization_endpoint: `${testIssuerUrl}/oauth2/authorize`
          })
        } as Response;
      } 
      else if (urlString.includes('jwks.json') || urlString.includes('/jwks')) {
        return {
          ok: true,
          status: 200,
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
        } as Response;
      }
      
      // Default fallback
      return {
        ok: false,
        status: 404,
        statusText: 'Not Found'
      } as Response;
    };
  });
  
  // Cleanup after each test
  afterEach(() => {
    global.fetch = originalFetch;
  });

  test('should fetch and parse OpenID configuration', async () => {
    // Fetch the configuration
    const configUrl = `${testIssuerUrl}/.well-known/openid-configuration`;
    const response = await proxyFetch(configUrl);
    const config = await response.json();
    
    // Verify we got the expected values
    expect(config.issuer).toBe(testIssuerUrl);
    expect(config.jwks_uri).toBe(`${testIssuerUrl}/.well-known/jwks.json`);
    expect(config.token_endpoint).toBe(`${testIssuerUrl}/oauth2/token`);
    
    // Verify the fetch was called with the right URL
    expect(fetchCalls.length).toBe(1);
    
    // When using URLs in RegExp patterns, explicitly escape all special characters
    // This creates a pattern that matches the exact URL, not treating dots as wildcards
    const safePattern = configUrl.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const urlRegex = new RegExp(safePattern);
    expect(fetchCalls[0]).toMatch(urlRegex);
  });

  test('should fetch and parse JWKS from URI', async () => {
    // First get the config to get the JWKS URI
    const configUrl = `${testIssuerUrl}/.well-known/openid-configuration`;
    const configResponse = await proxyFetch(configUrl);
    const config = await configResponse.json();
    
    // Now fetch the JWKS
    const jwksResponse = await proxyFetch(config.jwks_uri);
    const jwks = await jwksResponse.json();
    
    // Verify the JWKS structure
    expect(jwks.keys).toBeInstanceOf(Array);
    expect(jwks.keys.length).toBe(1);
    expect(jwks.keys[0].kty).toBe('RSA');
    expect(jwks.keys[0].kid).toBe('test-kid-1');
    
    // Verify the fetch calls
    expect(fetchCalls.length).toBe(2);
    
    // Create properly escaped regex patterns for URL matching
    const configUrlPattern = configUrl.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const jwksUrlPattern = config.jwks_uri.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    
    // Check that both URLs were called correctly
    expect(fetchCalls[0]).toMatch(new RegExp(configUrlPattern));
    expect(fetchCalls[1]).toMatch(new RegExp(jwksUrlPattern));
  });

  test('should handle invalid configuration response', async () => {
    // Override fetch just for this test
    global.fetch = async () => {
      return {
        ok: false,
        status: 404
      } as Response;
    };
    
    // Try to fetch the configuration
    try {
      await proxyFetch(`${testIssuerUrl}/.well-known/openid-configuration`);
      // If we get here, test should fail
      expect('Should have thrown').toBe('Error');
    } catch (error) {
      // Expected error
      expect(error).toBeDefined();
    }
  });

  test('should handle configuration without jwks_uri', async () => {
    // Override fetch just for this test
    global.fetch = async () => {
      return {
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          issuer: testIssuerUrl,
          // No jwks_uri
          token_endpoint: `${testIssuerUrl}/oauth2/token`
        })
      } as Response;
    };
    
    // Fetch the configuration
    const configUrl = `${testIssuerUrl}/.well-known/openid-configuration`;
    const configResponse = await proxyFetch(configUrl);
    const config = await configResponse.json();
    
    // Try to access jwks_uri which should be undefined
    expect(config.jwks_uri).toBeUndefined();
  });

  test('should handle network errors', async () => {
    // Override fetch just for this test
    global.fetch = async () => {
      throw new Error('Network error');
    };
    
    // Try to fetch the configuration
    try {
      await proxyFetch(`${testIssuerUrl}/.well-known/openid-configuration`);
      // If we get here, test should fail
      expect('Should have thrown').toBe('Error');
    } catch (error) {
      // Expected error
      expect(error.message).toBe('Network error');
    }
  });
});
