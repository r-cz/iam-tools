import { describe, expect, test } from 'bun:test';

describe('JWKS Fetching Logic', () => {
  // Our test issuer URL
  const testIssuerUrl = 'https://example.com/identity';
  
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
  
  // Mock fetch implementation
  const createMockFetch = (responseMap: { [url: string]: any }) => {
    return async (url: string): Promise<Response> => {
      const urlString = url.toString();
      
      for (const [pattern, response] of Object.entries(responseMap)) {
        if (urlString.includes(pattern)) {
          return response;
        }
      }
      
      return new Response(null, { status: 404, statusText: 'Not Found' });
    };
  };
  
  // Test function to simulate fetching OIDC configuration
  async function fetchOidcConfig(issuerUrl: string, customFetch?: typeof fetch): Promise<any> {
    const fetchImpl = customFetch || fetch;
    const configUrl = `${issuerUrl}/.well-known/openid-configuration`;
    
    const response = await fetchImpl(configUrl);
    if (response.ok) {
      return await response.json();
    }
    throw new Error(`Failed to fetch OIDC config: ${response.status}`);
  }
  
  // Test function to simulate fetching JWKS
  async function fetchJwks(jwksUri: string, customFetch?: typeof fetch): Promise<any> {
    const fetchImpl = customFetch || fetch;
    
    const response = await fetchImpl(jwksUri);
    if (response.ok) {
      return await response.json();
    }
    throw new Error(`Failed to fetch JWKS: ${response.status}`);
  }

  test('should fetch and parse OpenID configuration', async () => {
    const mockFetch = createMockFetch({
      'openid-configuration': new Response(JSON.stringify(mockOidcConfig), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    });
    
    const config = await fetchOidcConfig(testIssuerUrl, mockFetch);
    expect(config.issuer).toBe(testIssuerUrl);
    expect(config.jwks_uri).toBe(`${testIssuerUrl}/jwks.json`);
  });

  test('should fetch and parse JWKS from URI', async () => {
    const mockFetch = createMockFetch({
      'jwks.json': new Response(JSON.stringify(mockJwks), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    });
    
    const jwks = await fetchJwks(`${testIssuerUrl}/jwks.json`, mockFetch);
    expect(jwks.keys).toBeDefined();
    expect(Array.isArray(jwks.keys)).toBe(true);
    expect(jwks.keys.length).toBe(1);
    expect(jwks.keys[0].kty).toBe('RSA');
  });

  test('should handle complete OIDC discovery and JWKS resolution flow', async () => {
    const mockFetch = createMockFetch({
      'openid-configuration': new Response(JSON.stringify(mockOidcConfig), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }),
      'jwks.json': new Response(JSON.stringify(mockJwks), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    });
    
    // Step 1: Get OpenID configuration
    const config = await fetchOidcConfig(testIssuerUrl, mockFetch);
    expect(config.jwks_uri).toBeDefined();
    
    // Step 2: Get JWKS using URI from config
    const jwks = await fetchJwks(config.jwks_uri, mockFetch);
    expect(jwks.keys).toBeDefined();
    expect(jwks.keys.length).toBe(1);
    expect(jwks.keys[0].kid).toBeDefined();
  });

  test('should handle invalid configuration response', async () => {
    const mockFetch = createMockFetch({});
    
    try {
      await fetchOidcConfig(testIssuerUrl, mockFetch);
      expect(true).toBe(false); // Should not reach here
    } catch (error) {
      expect(error.message).toContain('Failed to fetch OIDC config: 404');
    }
  });

  test('should handle configuration without jwks_uri', async () => {
    const mockFetch = createMockFetch({
      'openid-configuration': new Response(JSON.stringify({
        issuer: testIssuerUrl,
        // No jwks_uri included
        token_endpoint: `${testIssuerUrl}/oauth2/token`
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    });
    
    const config = await fetchOidcConfig(testIssuerUrl, mockFetch);
    expect(config.jwks_uri).toBeUndefined();
  });

  test('should handle network errors', async () => {
    const mockFetch = async () => {
      throw new Error('Network error');
    };
    
    try {
      await fetchOidcConfig(testIssuerUrl, mockFetch);
      expect(true).toBe(false); // Should not reach here
    } catch (error) {
      expect(error.message).toBe('Network error');
    }
  });
});